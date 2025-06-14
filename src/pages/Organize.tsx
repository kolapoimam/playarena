import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/Navbar";
import MatchPreviewDialog from "@/components/MatchPreviewDialog";
import MatchSuccessDialog from "@/components/MatchSuccessDialog";
import MatchDetailsForm from "@/components/MatchDetailsForm";
import PreferencesForm from "@/components/PreferencesForm";
import PaymentPrivacyForm from "@/components/PaymentPrivacyForm";
import TicketSalesForm from "@/components/TicketSalesForm";
import OrganizerDetailsForm from "@/components/OrganizerDetailsForm";
import { FormValues, formSchema } from "@/components/MatchFormTypes";

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  verified_status: "True" | "False";
};

const convertTo24Hour = (time12: string): string => {
  const [time, period] = time12.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
  if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
  const [formMethods, setFormMethods] = useState<{ setValue: (name: keyof FormValues, value: any) => void; watch: () => FormValues } | null>(null);
  const [codeTable, setCodeTable] = useState<"venue_access_codes" | "booking_access_codes" | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      total_slots: 10,
      is_paid: false,
      price: null,
      notes: "",
      organizer_name: "",
      organizer_phone: null,
      disclose_phone: false,
      player_number_required: false,
      is_private: false,
      access_password: null,
      allow_bulk_tickets: false,
      skill_level: null,
      match_type: null,
      gender: null,
      sell_tickets: false,
      ticket_price: null,
      max_tickets: null,
      start_time: "",
      end_time: "",
    },
  });

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
    if (!isPreFilled) {
      const savedForm = localStorage.getItem("organizeFormState");
      if (savedForm) {
        const parsed = JSON.parse(savedForm);
        if (parsed.match_date) {
          parsed.match_date = new Date(parsed.match_date);
        }
        if (parsed.start_time) {
          parsed.start_time = parsed.start_time.replace(/^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/, "$1:$2 $3");
        }
        if (parsed.end_time) {
          parsed.end_time = parsed.end_time.replace(/^(0[1-9]|1[0-2]):([0-5][0-9]) (AM|PM)$/, "$1:$2 $3");
        }
        form.reset(parsed);
      }
    }
  }, [form, isPreFilled]);

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (!isPreFilled) {
        localStorage.setItem("organizeFormState", JSON.stringify(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, isPreFilled]);

  useEffect(() => {
    if (form.watch("is_private") && !form.watch("access_password")) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let password = '';
      for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      form.setValue('access_password', password);
    } else if (!form.watch("is_private")) {
      form.setValue('access_password', null);
    }
  }, [form]);

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

        const { data: bacData, error: bacError } = await supabase
          .from("booking_access_codes")
          .select("match_date, start_time, end_time, status, expiry_date, booking_id")
          .eq("code", accessCode)
          .eq("venue_id", venue.id)
          .single();

        if (bacData && bacData.status === "pending") {
          const expiryDate = bacData.expiry_date
            ? new Date(bacData.expiry_date + 'Z')
            : new Date(new Date(bacData.created_at).getTime() + 48 * 60 * 60 * 1000);
          const now = new Date();
          console.log("Booking Access Code:", {
            code: accessCode,
            status: bacData.status,
            expiryDate,
            now,
            isExpired: expiryDate < now,
            venue_id: venue.id,
          });
          if (expiryDate < now) {
            await supabase
              .from("booking_access_codes")
              .update({ status: "inactive" })
              .eq("code", accessCode)
              .eq("venue_id", venue.id);
            throw new Error("Booking access code has expired.");
          }
          accessCodeData = bacData;
          setCodeTable("booking_access_codes");
        } else if (bacError && bacError.code !== "PGRST116") {
          console.error("Booking access code error:", bacError);
        }

        if (!accessCodeData) {
          const { data: vacData, error: vacError } = await supabase
            .from("venue_access_codes")
            .select("match_date, start_time, end_time, status, expiry_date")
            .eq("code", accessCode)
            .eq("venue_id", venue.id)
            .single();

          if (vacData && vacData.status === "pending") {
            const expiryDate = vacData.expiry_date
              ? new Date(vacData.expiry_date + 'Z')
              : new Date(new Date(vacData.created_at).getTime() + 48 * 60 * 60 * 1000);
            const now = new Date();
            console.log("Venue Access Code:", {
              code: accessCode,
              status: vacData.status,
              expiryDate,
              now,
              isExpired: expiryDate < now,
              venue_id: venue.id,
            });
            if (expiryDate < now) {
              await supabase
                .from("venue_access_codes")
                .update({ status: "inactive" })
                .eq("code", accessCode)
                .eq("venue_id", venue.id);
              throw new Error("Venue access code has expired.");
            }
            accessCodeData = vacData;
            setCodeTable("venue_access_codes");
          } else if (vacError && vacError.code !== "PGRST116") {
            console.error("Venue access code error:", vacError);
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
          const [startHours, startMinutes] = accessCodeData.start_time.split(':');
          const startTime12 = new Date(0, 0, 0, startHours, startMinutes).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const [endHours, endMinutes] = accessCodeData.end_time.split(':');
          const endTime12 = new Date(0, 0, 0, endHours, endMinutes).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          formMethods.setValue("start_time", startTime12);
          formMethods.setValue("end_time", endTime12);
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

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const superCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: match, error } = await supabase
        .from("matches")
        .insert({
          title: data.title,
          venue_id: data.venue_id,
          match_date: format(data.match_date, "yyyy-MM-dd"),
          match_time: convertTo24Hour(data.start_time),
          start_time: convertTo24Hour(data.start_time),
          end_time: convertTo24Hour(data.end_time),
          total_slots: data.total_slots,
          is_paid: data.is_paid,
          price: data.is_paid ? data.price : null,
          notes: data.notes || null,
          organizer_name: data.organizer_name,
          organizer_phone: data.organizer_phone || null,
          disclose_phone: data.disclose_phone,
          player_number_required: data.player_number_required,
          is_private: data.is_private,
          access_password: data.is_private ? data.access_password : null,
          allow_bulk_tickets: data.allow_bulk_tickets,
          skill_level: data.skill_level || null,
          match_type: data.match_type || null,
          gender: data.gender || null,
          super_code: superCode,
          sell_tickets: data.sell_tickets,
          ticket_price: data.sell_tickets ? data.ticket_price : null,
          max_tickets: data.sell_tickets ? data.max_tickets : null,
          total_tickets_available: data.sell_tickets && data.max_tickets ? data.max_tickets : 0,
        })
        .select('id, slug, super_code')
        .single();

      if (error) throw error;

      if (userId) {
        const { error: linkError } = await supabase
          .from("user_organized_matches")
          .insert({
            user_id: userId,
            match_id: match.id,
          });

        if (linkError) throw linkError;
      }

      if (accessCode && preSelectedVenueSlug) {
        const { data: venue } = await supabase
          .from("venues")
          .select("id")
          .eq("slug", preSelectedVenueSlug)
          .single();

        const { error: bookingUpdateError } = await supabase
          .from("bookings")
          .update({ match_id: match.id })
          .eq("venue_id", venue.id)
          .eq("payment_reference", new URLSearchParams(window.location.search).get("reference"));

        if (bookingUpdateError) {
          console.error("Error updating booking with match_id:", bookingUpdateError);
          toast({
            title: "Warning",
            description: "Match created, but failed to link booking. Contact support.",
            variant: "destructive",
          });
        }
      }

      localStorage.removeItem("organizeFormState");
      setSupercode(match.super_code || "N/A");
      setMatchSlug(match.slug);
      setSuccessDialogOpen(true);
    } catch (error) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: "Failed to create match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <MatchDetailsForm
              isPreFilled={isPreFilled}
              preSelectedVenueSlug={preSelectedVenueSlug}
              onPrefill={(values) => {
                if (formMethods) {
                  formMethods.setValue("match_date", values.match_date);
                  formMethods.setValue("start_time", values.start_time);
                  formMethods.setValue("end_time", values.end_time);
                  setHasValidBookingCode(true);
                }
              }}
              onVenueCreated={(venueId, venueSlug, venueName) => {
                form.setValue("venue_id", venueId);
                toast({
                  title: "Venue created",
                  description: `${venueName} has been added to venues.`,
                });
              }}
            />
            <PreferencesForm />
            <PaymentPrivacyForm />
            <TicketSalesForm />
            <OrganizerDetailsForm />
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors"
                onClick={() => setPreviewDialogOpen(true)}
                disabled={loading || !form.watch("title") || !form.watch("venue_id") || !form.watch("match_date") || !form.watch("start_time") || !form.watch("end_time") || !form.watch("total_slots") || !form.watch("organizer_name")}
              >
                Preview Match
              </Button>
              <Button 
                type="submit" 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-3 text-lg shadow-md transition-colors" 
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Match"}
              </Button>
            </div>
          </form>
        </Form>
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
