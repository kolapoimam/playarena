import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, ArrowRight, ChevronLeft, Zap } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/Navbar";
import MatchPreviewDialog from "@/components/match/MatchPreviewDialog";
import MatchSuccessDialog from "@/components/match/MatchSuccessDialog";
import MatchDetailsForm from "@/components/match/MatchDetailsForm";
import PreferencesForm from "@/components/gameManagement/PreferencesForm";
import PaymentPrivacyForm from "@/components/matchManagement/PaymentPrivacyForm";
import TicketSalesForm from "@/components/gameManagement/TicketSalesForm";
import OrganizerDetailsForm from "@/components/matchManagement/OrganizerDetailsForm";
import RecurringForm from "@/components/gameManagement/RecurringForm";
import { FormValues, formSchema } from "@/components/MatchFormTypes";
import { format } from "date-fns";
import { Seo } from "@/components/Seo";

import { BackButton } from "@/components/sc/ui";
type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string;
  verified_status: "True" | "False";
};

const STEPS = [
  { label: "Basics", title: "Let's set up your match", fields: ["title", "venue_id", "match_date", "start_time", "end_time", "total_slots", "notes"] },
  { label: "Players and price", title: "Who can join and what it costs", fields: ["skill_level", "match_type", "gender", "is_paid", "price", "allow_bulk_tickets", "is_private", "access_password", "player_number_required"] },
  { label: "Extras", title: "Tickets and repeats", fields: ["sell_tickets", "ticket_price", "max_tickets", "is_recurring", "recurring_frequency", "recurring_occurrences"] },
  { label: "Organiser and review", title: "Almost there", fields: ["organizer_name", "organizer_phone", "disclose_phone"] },
];

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
  const [step, setStep] = useState(0);

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
      is_recurring: false,
      recurring_frequency: null,
      recurring_occurrences: null,
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

  // --- Prefill logic: always run when formMethods is set and booking code is present ---
  useEffect(() => {
    if (formMethods && preSelectedVenueSlug && accessCode && !isPreFilled) {
      (async () => {
        try {
          const { data: venue, error: venueError } = await supabase
            .from("venues")
            .select("id, slug, name, city, verified_status")
            .eq("slug", preSelectedVenueSlug)
            .single();

          if (venueError || !venue) throw new Error("Venue not found.");

          let accessCodeData = null;
          const { data: bacData } = await supabase
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
            if (expiryDate < now) throw new Error("Booking access code has expired.");
            accessCodeData = bacData;
            setCodeTable("booking_access_codes");
          }
          if (!accessCodeData) {
            const { data: vacData } = await supabase
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
              if (expiryDate < now) throw new Error("Venue access code has expired.");
              accessCodeData = vacData;
              setCodeTable("venue_access_codes");
            }
          }
          if (!accessCodeData) throw new Error("Invalid, used, or expired access code.");
          setVenues([venue]);
          setIsPreFilled(true);
          setSelectedVenueId(venue.id);
          setHasValidBookingCode(true);
          formMethods.setValue("venue_id", venue.id);
          formMethods.setValue("match_date", new Date(accessCodeData.match_date));
          // Convert times to 12-hour format for the form
          const [startHours, startMinutes] = accessCodeData.start_time.split(":");
          const startTime12 = new Date(0, 0, 0, startHours, startMinutes).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          const [endHours, endMinutes] = accessCodeData.end_time.split(":");
          const endTime12 = new Date(0, 0, 0, endHours, endMinutes).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          formMethods.setValue("start_time", startTime12);
          formMethods.setValue("end_time", endTime12);
        } catch (error) {
          // fallback: do not break anything else
        }
      })();
    }
  }, [formMethods, preSelectedVenueSlug, accessCode, isPreFilled]);

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
          is_recurring: data.is_recurring,
          recurring_frequency: data.is_recurring ? data.recurring_frequency : null,
          recurring_occurrences: data.is_recurring ? data.recurring_occurrences : null,
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

  const onInvalid = (errors: Record<string, unknown>) => {
    const keys = Object.keys(errors);
    const idx = STEPS.findIndex((st) => st.fields.some((f) => keys.includes(f)));
    setStep(idx >= 0 ? idx : 0);
    toast({ title: "Check your details", description: "Some fields need fixing before you can publish.", variant: "destructive" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = async () => {
    const ok = await form.trigger(STEPS[step].fields as any);
    if (!ok) {
      toast({ title: "Check this step", description: "Some details need fixing before you continue.", variant: "destructive" });
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Seo
        title="Organize a Match | Sport Cliq"
        description="Create and organize a new match or event on Sport Cliq."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <div className="min-h-screen pb-20 bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)] sticky top-0 z-20 bg-sc-bg/95 backdrop-blur-xl pb-3">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Organise a match</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>
        <div className="px-5 pt-2 max-w-3xl mx-auto">
          {isPreFilled && (
            <div className="mb-4 bg-sc-green-bg dark:bg-green-900 text-sc-green-dark dark:text-green-300 p-4 rounded-lg">
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
          <div className="mb-5 flex flex-col gap-2.5">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span key={i} className="flex-1 h-1.5 rounded-full transition-colors" style={{ background: i <= step ? "#16A34A" : "#E6E9E3" }} />
              ))}
            </div>
            <span className="text-[13px] font-bold text-sc-ink3">
              Step {step + 1} of {STEPS.length} · {STEPS[step].label}
            </span>
            <h2 className="m-0 text-[26px] leading-8 font-extrabold tracking-[-0.03em]">{STEPS[step].title}</h2>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col gap-5 pb-28">
              <div className={step === 0 ? "contents" : "hidden"}>
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
              </div>
              <div className={step === 1 ? "contents" : "hidden"}>
                <PreferencesForm defaultOpen />
                <PaymentPrivacyForm defaultOpen />
              </div>
              <div className={step === 2 ? "contents" : "hidden"}>
                <TicketSalesForm defaultOpen />
                <RecurringForm userId={userId} defaultOpen />
              </div>
              <div className={step === 3 ? "contents" : "hidden"}>
                <OrganizerDetailsForm />
                <div className="bg-white rounded-3xl p-[18px] flex flex-col gap-2.5">
                  <span className="text-base font-extrabold">Review</span>
                  {[
                    ["Match", form.watch("title") || "Not set"],
                    ["Venue", selectedVenue ? `${selectedVenue.name}, ${selectedVenue.city}` : "Not set"],
                    ["Date", form.watch("match_date") ? format(form.watch("match_date"), "EEE, d MMM yyyy") : "Not set"],
                    ["Time", form.watch("start_time") && form.watch("end_time") ? `${form.watch("start_time")} to ${form.watch("end_time")}` : "Not set"],
                    ["Players", `${form.watch("total_slots") || 0} slots`],
                    ["Entry", form.watch("is_paid") ? `₦${Number(form.watch("price") || 0).toLocaleString()} per player` : "Free"],
                    ...(form.watch("is_recurring") ? [["Repeats", `${form.watch("recurring_frequency") || ""} · ${form.watch("recurring_occurrences") || 0} times`]] : []),
                  ].map(([k, v]) => (
                    <div key={k as string} className="flex justify-between gap-4 text-sm">
                      <span className="text-sc-ink3 shrink-0">{k}</span>
                      <span className="font-bold text-right truncate">{v}</span>
                    </div>
                  ))}
                  <button type="button" onClick={() => setStep(0)} className="self-start text-sm font-bold text-sc-green-dark">
                    Edit details
                  </button>
                </div>
              </div>

              <div className="fixed left-0 right-0 bottom-0 z-30 px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),1.5rem)] bg-white/95 backdrop-blur-xl border-t border-sc-line flex gap-2.5">
                {step > 0 && (
                  <button
                    type="button"
                    aria-label="Previous step"
                    onClick={() => {
                      setStep(step - 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-[54px] h-[54px] rounded-full bg-sc-soft text-sc-ink flex items-center justify-center shrink-0"
                  >
                    <ChevronLeft size={22} />
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex-1 h-[54px] rounded-full bg-sc-green text-white text-base font-bold flex items-center justify-center gap-2"
                  >
                    Next <ArrowRight size={18} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewDialogOpen(true)}
                      disabled={loading}
                      className="h-[54px] px-5 rounded-full bg-white border border-sc-line text-sc-ink text-base font-bold shrink-0 disabled:opacity-50"
                    >
                      Preview
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-[54px] rounded-full bg-sc-green text-white text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Zap size={18} /> {loading ? "Creating..." : "Publish match"}
                    </button>
                  </>
                )}
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
      </div>
    </>
  );
};

export default Organize;
