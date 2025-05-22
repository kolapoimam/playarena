import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import MatchForm from "@/components/MatchForm";
import MatchPreviewDialog from "@/components/MatchPreviewDialog";
import MatchSuccessDialog from "@/components/MatchSuccessDialog";

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  verified_status: "True" | "False";
};

const Organize = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preSelectedVenueSlug = searchParams.get("venue");
  const accessCode = searchParams.get("code");
  const [userId, setUserId] = useState<string | null>(null);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [matchSlug, setMatchSlug] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>(undefined);
  const [hasValidBookingCode, setHasValidBookingCode] = useState(false);
  const [formMethods, setFormMethods] = useState<{ setValue: (name: string, value: any) => void; watch: () => any } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        setUserId(session.session.user.id);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const handlePreFill = async () => {
      if (!preSelectedVenueSlug || !accessCode) return;

      try {
        const { data: venue, error: venueError } = await supabase
          .from("venues")
          .select("id, slug, name, city, verified_status")
          .eq("slug", preSelectedVenueSlug)
          .single();

        if (venueError || !venue) {
          throw new Error("Venue not found.");
        }

        let accessCodeData = null;

        // First check venue_access_codes
        const { data: vacData } = await supabase
          .from("venue_access_codes")
          .select("match_date, start_time, end_time, used")
          .eq("code", accessCode)
          .eq("venue_id", venue.id)
          .single();

        if (vacData && !vacData.used) {
          accessCodeData = vacData;
        } else {
          // Fallback to booking_access_codes_rows
          const { data: bacData } = await supabase
            .from("booking_access_codes_rows")
            .select("match_date, start_time, end_time, access_code_status")
            .eq("code", accessCode)
            .eq("venue_id", venue.id)
            .single();

          if (bacData && bacData.access_code_status === "pending") {
            accessCodeData = bacData;
          }
        }

        if (!accessCodeData) {
          throw new Error("Invalid, used, or expired access code.");
        }

        setVenues([venue]);
        setIsPreFilled(true);
        setSelectedVenueId(venue.id);
        setHasValidBookingCode(true);

        if (formMethods) {
          formMethods.setValue("venue_id", venue.id);
          formMethods.setValue("match_date", new Date(accessCodeData.match_date));
          formMethods.setValue("start_time", accessCodeData.start_time);
          formMethods.setValue("end_time", accessCodeData.end_time);
        }

        toast({
          title: "Booking Code Accepted",
          description: `Form pre-filled with booking details for ${venue.name}.`,
        });
      } catch (error: any) {
        console.error("Error pre-filling form:", error);
        toast({
          title: "Invalid Access Code",
          description: error.message || "Could not load booking information.",
          variant: "destructive",
        });
        navigate("/organize");
      }
    };

    if (formMethods) {
      handlePreFill();
    }
  }, [preSelectedVenueSlug, accessCode, toast, navigate, formMethods]);

  const handleFormReady = useCallback(({ watch, setValue }) => {
    setFormMethods({ watch, setValue });
  }, []);

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId);

  return (
    <div className="min-h-screen pb-20 bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-50 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            className="text-white hover:bg-green-600 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Organize a Match</h1>
          <div className="w-10"></div>
        </div>
      </header>
      <div className="p-6 max-w-3xl mx-auto">
        {isPreFilled && (
          <div className="mb-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 p-4 rounded-lg">
            <p className="font-medium">Venue Booking Pre-Filled</p>
            <p className="text-sm">The venue, date, and time are set based on your booking. These fields are locked to match your reservation.</p>
          </div>
        )}
        {selectedVenue?.verified_status === "True" && !isPreFilled && !hasValidBookingCode && (
          <div className="mb-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 p-4 rounded-lg">
            <p className="flex items-center font-medium">
              <AlertCircle size={16} className="mr-2" />
              Verified Venue
            </p>
            <p className="text-sm">This is a verified venue. Please confirm your booking before proceeding to create a match.</p>
          </div>
        )}
        <MatchForm
          userId={userId}
          isPreFilled={isPreFilled}
          preSelectedVenueSlug={preSelectedVenueSlug}
          accessCode={accessCode}
          onSubmitSuccess={async (supercode, matchSlug) => {
            if (accessCode) {
              await supabase
                .from("booking_access_codes_rows")
                .update({ access_code_status: "active" })
                .eq("code", accessCode);
            }

            setSupercode(supercode);
            setMatchSlug(matchSlug);
            setSuccessDialogOpen(true);
          }}
          onPreview={() => setPreviewDialogOpen(true)}
          onPrefill={(values) => {
            if (formMethods) {
              formMethods.setValue("match_date", values.match_date);
              formMethods.setValue("start_time", values.start_time);
              formMethods.setValue("end_time", values.end_time);
              setHasValidBookingCode(true);
            }
          }}
          onFormReady={handleFormReady}
        />
        <MatchPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          formValues={formMethods ? formMethods.watch() : {}}
          selectedVenue={selectedVenue}
        />
        <MatchSuccessDialog
          open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          formValues={formMethods ? formMethods.watch() : {}}
          selectedVenue={selectedVenue}
          supercode={supercode}
          matchSlug={matchSlug}
          onNavigate={(slug) => navigate(`/match/${slug}`)}
        />
      </div>
      <Navbar />
    </div>
  );
};

export default Organize;
