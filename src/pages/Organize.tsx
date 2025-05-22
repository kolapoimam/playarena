import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import MatchForm from "@/components/MatchForm";
import MatchPreviewDialog from "@/components/MatchPreviewDialog";
import MatchSuccessDialog from "@/components/MatchSuccessDialog";
import { parse, format } from "date-fns";

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  verified_status: 'True' | 'False';
};

type FormValues = {
  title: string;
  venue_id: string;
  match_date: Date | undefined;
  start_time: string;
  end_time: string;
  total_slots: number | undefined;
  is_paid: boolean;
  price: number | null | undefined;
  notes: string | undefined;
  organizer_name: string;
  organizer_phone: string | null | undefined;
  disclose_phone: boolean;
  player_number_required: boolean;
  is_private: boolean;
  access_password: string | null | undefined;
  allow_bulk_tickets: boolean;
  skill_level: string | null | undefined;
  match_type: string | null | undefined;
  gender: string | null | undefined;
  sell_tickets: boolean;
  ticket_price: number | null | undefined;
  max_tickets: number | null | undefined;
};

type PrefillData = {
  venue_id: string;
  match_date: Date;
  start_time: string;
  end_time: string;
};

const Organize = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const preSelectedVenueSlug = searchParams.get('venue');
  const accessCode = searchParams.get('code');
  const [userId, setUserId] = useState<string | null>(null);
  const [isPreFilled, setIsPreFilled] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [supercode, setSupercode] = useState<string | null>(null);
  const [matchSlug, setMatchSlug] = useState<string | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | undefined>(undefined);
  const [hasValidBookingCode, setHasValidBookingCode] = useState(false);
  const [formMethods, setFormMethods] = useState<{
    watch: () => FormValues;
    setValue: (name: keyof FormValues, value: any) => void;
  } | null>(null);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);
  const [prefillError, setPrefillError] = useState<string | null>(null);

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
      if (!preSelectedVenueSlug || !accessCode) {
        setPrefillError("Missing venue or access code");
        return;
      }

      try {
        const { data: venue, error: venueError } = await supabase
          .from("venues")
          .select("id, slug, name, city, verified_status")
          .eq("slug", preSelectedVenueSlug)
          .single();

        if (venueError || !venue) {
          console.error("Venue fetch error:", venueError);
          throw new Error("Venue not found");
        }

        const normalizedCode = accessCode.toUpperCase();
        let accessCodeData = null;

        // Try booking_access_codes first
        const { data: bookingData, error: bookingError } = await supabase
          .from("booking_access_codes")
          .select("match_date, start_time, end_time, access_code_status, booking_id, venue_id, valid_until")
          .eq("code", normalizedCode)
          .eq("venue_id", venue.id)
          .single();

        if (!bookingError && bookingData) {
          accessCodeData = bookingData;
        } else {
          // Fallback to venue_access_codes
          const { data: venueData, error: venueAccessError } = await supabase
            .from("venue_access_codes")
            .select("match_date, start_time, end_time, used, venue_id")
            .eq("code", normalizedCode)
            .eq("venue_id", venue.id)
            .single();

          if (venueAccessError || !venueData) {
            console.error("Access code fetch error:", venueAccessError || bookingError);
            throw new Error("Invalid or expired access code");
          }
          accessCodeData = venueData;
        }

        // Validate access code
        const isBookingCode = 'access_code_status' in accessCodeData;
        let isValid = false;
        if (isBookingCode) {
          const validUntil = new Date(accessCodeData.valid_until);
          const now = new Date();
          // Convert to WAT (UTC+1)
          const watOffset = 1 * 60 * 60 * 1000;
          const nowWAT = new Date(now.getTime() + watOffset);
          isValid = accessCodeData.access_code_status === 'Pending' && validUntil > nowWAT;
        } else {
          isValid = !accessCodeData.used;
        }

        if (!isValid) {
          console.error("Invalid access code:", normalizedCode, { isBookingCode, accessCodeData });
          throw new Error("This access code is invalid or has been used.");
        }

        const matchDate = parse(accessCodeData.match_date, "yyyy-MM-dd", new Date());
        if (!matchDate || isNaN(matchDate.getTime())) {
          console.error("Invalid match_date:", accessCodeData.match_date);
          throw new Error("Invalid date in access code");
        }

        const convertTo12Hour = (time24: string): string => {
          const [hours, minutes] = time24.split(':').map(Number);
          const period = hours >= 12 ? 'PM' : 'AM';
          const hours12 = hours % 12 || 12;
          return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
        };

        const prefill = {
          venue_id: venue.id,
          match_date: matchDate,
          start_time: convertTo12Hour(accessCodeData.start_time),
          end_time: convertTo12Hour(accessCodeData.end_time),
        };

        setVenues([venue]);
        setSelectedVenueId(venue.id);
        setPrefillData(prefill);
        setHasValidBookingCode(true);

        // Defer form updates until formMethods is ready
        if (formMethods) {
          applyPrefill(prefill);
        }

        toast({
          title: "Venue Booking Loaded",
          description: `Form pre-filled with booking details for ${venue.name}.`,
        });
      } catch (error: any) {
        console.error("Error pre-filling form:", error);
        setPrefillError(error.message || "Failed to load booking details.");
        toast({
          title: "Error",
          description: error.message || "Failed to load booking details.",
          variant: "destructive",
        });
        setIsPreFilled(false);
        setPrefillData(null);
        navigate("/organize"); // Clear query params on error
      }
    };

    if (preSelectedVenueSlug && accessCode) {
      handlePreFill();
    }
  }, [preSelectedVenueSlug, accessCode, toast, navigate, formMethods]);

  const applyPrefill = (prefill: PrefillData) => {
    if (!formMethods) return;
    formMethods.setValue("venue_id", prefill.venue_id);
    formMethods.setValue("match_date", prefill.match_date);
    formMethods.setValue("start_time", prefill.start_time);
    formMethods.setValue("end_time", prefill.end_time);
    setIsPreFilled(true);
  };

  useEffect(() => {
    if (formMethods && prefillData && !isPreFilled) {
      applyPrefill(prefillData);
    }
  }, [formMethods, prefillData, isPreFilled]);

  const selectedVenue = formMethods
    ? venues.find(venue => venue.id === formMethods.watch().venue_id)
    : undefined;

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
        {prefillError && (
          <div className="mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 p-4 rounded-lg">
            <p className="font-medium">Error Loading Booking</p>
            <p className="text-sm">{prefillError}</p>
          </div>
        )}
        {isPreFilled && !prefillError && (
          <div className="mb-4 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 p-4 rounded-lg">
            <p className="font-medium">Venue Booking Pre-Filled</p>
            <p className="text-sm">The venue, date, and time are set based on your booking. Contact support to change.</p>
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
          onSubmitSuccess={(supercode, matchSlug) => {
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
          onFormReady={(methods) => {
            setFormMethods(methods);
            if (prefillData && !isPreFilled) {
              applyPrefill(prefillData);
            }
          }}
          onVenuesFetched={(venues) => setVenues(venues)}
        />
        {formMethods && (
          <>
            <MatchPreviewDialog
              open={previewDialogOpen}
              onOpenChange={setPreviewDialogOpen}
              formValues={formMethods.watch()}
              selectedVenue={selectedVenue}
            />
            <MatchSuccessDialog
              open={successDialogOpen}
              onOpenChange={setSuccessDialogOpen}
              formValues={formMethods.watch()}
              selectedVenue={selectedVenue}
              supercode={supercode}
              matchSlug={matchSlug}
              onNavigate={(slug) => navigate(`/match/${slug}`)}
            />
          </>
        )}
      </div>
      <Navbar />
    </div>
  );
};

export default Organize;
