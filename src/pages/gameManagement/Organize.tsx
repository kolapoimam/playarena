import { useState, useEffect, useRef } from "react";
import { occurrences } from "@/lib/codeSchedule";
import { venueIsActive } from "@/lib/myVenues";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { Store } from "lucide-react";
import { toMinutes } from "@/lib/venueSlots";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, ArrowRight, ChevronLeft, Lock, Zap } from "lucide-react";
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
import { notify, notifyBooking } from "@/lib/notify";

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
  const [codeTable, setCodeTable] = useState<"venue_access_codes" | "booking_access_codes" | null>(null);
  const [codeRow, setCodeRow] = useState<any>(null);
  // The booking this match is being set up from. Its venue, date and times are locked.
  const [lockedBooking, setLockedBooking] = useState<{ venueId: string; matchDate: string; start: string; end: string; bookingId: string | null } | null>(null);
  const [codeProblem, setCodeProblem] = useState<{ title: string; body: string; matchSlug?: string | null } | null>(null);
  const submitLock = useRef(false);
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
    if (!isPreFilled && !accessCode) {
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

  // Codes can hold "16:00", "16:00:00" or "04:00 PM"; turn any of them into "HH:MM"
  const hhmm = (t: string) => {
    const mins = toMinutes(t);
    return mins == null ? String(t).slice(0, 5) : `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };
  const to12 = (raw: string) => {
    const [h, m] = hhmm(raw).split(":").map(Number);
    return new Date(0, 0, 0, h, m).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  // Prefill and lock venue, date and times from a booking code, and refuse used or expired codes
  useEffect(() => {
    if (!preSelectedVenueSlug || !accessCode || isPreFilled) return;
    (async () => {
      try {
        const { data: venueRows } = await supabase
          .from("venues").select("id, slug, name, city, verified_status")
          .eq("slug", preSelectedVenueSlug).limit(1);
        const venue = venueRows?.[0];
        if (!venue) throw { title: "Venue not found", body: "We could not find the venue for this booking." };

        let row: any = null;
        let table: "booking_access_codes" | "venue_access_codes" | null = null;
        for (const t of ["booking_access_codes", "venue_access_codes"] as const) {
          const { data } = await supabase.from(t)
            .select("*")
            .ilike("code", accessCode).eq("venue_id", venue.id).limit(1);
          if (data?.[0]) { row = data[0]; table = t; break; }
        }
        if (!row) throw { title: "Booking code not found", body: "Check the code or make a new booking for this venue." };

        if (row.cancelled_at || (row.status === "inactive" && !row.booking_id)) {
          throw { title: "This booking code was cancelled", body: `${venue.name} cancelled this code, so it no longer works. Ask the venue for a new code or book another time.` };
        }
        if (row.deactivated_at && new Date(row.deactivated_at) <= new Date()) {
          throw { title: "This booking code has been stopped", body: `${venue.name} stopped this repeating booking. Ask the venue for a new code.` };
        }
        if (row.status !== "pending") {
          let matchSlug: string | null = null;
          if (row.booking_id) {
            const { data: b } = await supabase.from("bookings").select("match_id").eq("id", row.booking_id).maybeSingle();
            if (b?.match_id) {
              const { data: m } = await supabase.from("matches").select("slug").eq("id", b.match_id).maybeSingle();
              matchSlug = m?.slug ?? null;
            }
          }
          throw row.status === "active"
            ? { title: "This booking has been used", body: "A match has already been set up with this booking. Each booking can only be used once.", matchSlug }
            : { title: "This booking code has expired", body: "Make a new booking to set up a match at this venue." };
        }
        const expiry = row.expiry_date
          ? new Date(/Z|[+-]\d\d:?\d\d$/.test(row.expiry_date) ? row.expiry_date : row.expiry_date + "Z")
          : new Date(new Date(row.created_at).getTime() + 48 * 60 * 60 * 1000);
        if (expiry < new Date()) throw { title: "This booking code has expired", body: "Make a new booking to set up a match at this venue." };

        setVenues([venue]);
        setCodeTable(table);
        setSelectedVenueId(venue.id);
        setHasValidBookingCode(true);
        setLockedBooking({
          venueId: venue.id,
          matchDate: String(row.match_date).slice(0, 10),
          start: hhmm(String(row.start_time)),
          end: hhmm(String(row.end_time)),
          bookingId: row.booking_id ?? null,
        });
        form.setValue("venue_id", venue.id, { shouldValidate: true });
        form.setValue("match_date", new Date(`${String(row.match_date).slice(0, 10)}T12:00:00`), { shouldValidate: true });
        form.setValue("start_time", to12(String(row.start_time)), { shouldValidate: true });
        form.setValue("end_time", to12(String(row.end_time)), { shouldValidate: true });
        if (row.is_recurring && row.recurring_frequency) {
          // a repeating code sets up a repeating match with the same number of sessions
          form.setValue("is_recurring" as any, true);
          form.setValue("recurring_frequency" as any, String(row.recurring_frequency).toLowerCase());
          form.setValue("recurring_occurrences" as any, occurrences(row).length || row.recurring_occurrences || 1);
        }
        setCodeRow(row);
        setIsPreFilled(true);
        // Safety net in case the booking email did not go out. The server sends it only once.
        if (row.booking_id && table === "booking_access_codes") notifyBooking(row.booking_id);
      } catch (e: any) {
        setCodeProblem(e?.title ? e : { title: "We could not load this booking", body: "Please try again in a moment." });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedVenueSlug, accessCode, isPreFilled]);

  // Keep the chosen venue's name and city for the review and preview card
  const watchedVenueId = form.watch("venue_id");
  useEffect(() => {
    if (!watchedVenueId) return;
    setSelectedVenueId(watchedVenueId);
    if (venues.some((v) => v.id === watchedVenueId)) return;
    supabase.from("venues").select("id, slug, name, city, verified_status").eq("id", watchedVenueId).maybeSingle()
      .then(({ data }) => { if (data) setVenues((prev) => [...prev.filter((v) => v.id !== data.id), data as Venue]); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedVenueId]);

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId);

  // A venue marked inactive is not taking bookings. Warn the organiser once per venue.
  const [inactiveVenue, setInactiveVenue] = useState<string | null>(null);
  const warnedVenues = useRef(new Set<string>());
  const inactiveOk = useRef(false);
  useEffect(() => {
    if (!watchedVenueId || warnedVenues.current.has(watchedVenueId)) return;
    venueIsActive(watchedVenueId).then((active) => {
      if (!active) {
        warnedVenues.current.add(watchedVenueId);
        setInactiveVenue(watchedVenueId);
      }
    });
  }, [watchedVenueId]);

  const onSubmit = async (data: FormValues) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setLoading(true);
    let claimed = false;
    try {
      // A booking can set up one match only. Claim the code first so a second tab or a replay cannot reuse it.
      if (lockedBooking && accessCode && codeTable) {
        const { data: claim, error: claimError } = await supabase.from(codeTable)
          .update({ status: "active" })
          .eq("code", accessCode).eq("venue_id", lockedBooking.venueId).eq("status", "pending")
          .select("id");
        if (claimError) throw claimError;
        if (!claim || claim.length === 0) {
          setCodeProblem({ title: "This booking has been used", body: "A match has already been set up with this booking. Each booking can only be used once." });
          throw new Error("This booking has already been used.");
        }
        claimed = true;
        // keep a count of how many times the code was used, for the venue's records
        (supabase.from(codeTable) as any).update({ times_used: (codeRow?.times_used || 0) + 1 }).eq("code", accessCode).eq("venue_id", lockedBooking.venueId)
          .then(({ error }: any) => error && console.warn("times_used not saved", error.message));
        // Always use the booked venue, date and time, whatever the form says
        data = {
          ...data,
          venue_id: lockedBooking.venueId,
          match_date: new Date(`${lockedBooking.matchDate}T12:00:00`),
          start_time: to12(lockedBooking.start),
          end_time: to12(lockedBooking.end),
        };
      }

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
      notify("match_created", { match_id: match.id });

      if (userId) {
        const { error: linkError } = await supabase
          .from("user_organized_matches")
          .insert({
            user_id: userId,
            match_id: match.id,
          });

        if (linkError) throw linkError;
      }

      if (lockedBooking?.bookingId) {
        const { error: bookingUpdateError } = await supabase
          .from("bookings").update({ match_id: match.id }).eq("id", lockedBooking.bookingId);
        if (bookingUpdateError) console.error("Error linking booking to match:", bookingUpdateError);
      }

      localStorage.removeItem("organizeFormState");
      setSupercode(match.super_code || "N/A");
      setMatchSlug(match.slug);
      setSuccessDialogOpen(true);
      if (accessCode) {
        // Drop the code from the address so refresh or back cannot reuse it
        window.history.replaceState(null, "", "/organize");
        setLockedBooking(null);
      }
    } catch (error: any) {
      console.error("Error creating match:", error);
      if (claimed && accessCode && codeTable && lockedBooking) {
        // The match was not created, so give the booking back
        await supabase.from(codeTable).update({ status: "pending" }).eq("code", accessCode).eq("venue_id", lockedBooking.venueId);
      }
      toast({
        title: "Match not created",
        description: error?.message && error.message.length < 120 ? error.message : "Failed to create match. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      submitLock.current = false;
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
          {codeProblem && (
            <div className="mb-4 bg-white rounded-3xl p-5 flex flex-col gap-3 shadow-card border border-sport-red-bg">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-full bg-sport-red-bg text-sport-red-fg flex items-center justify-center shrink-0"><AlertCircle size={20} /></span>
                <div className="flex flex-col gap-1">
                  <p className="m-0 font-extrabold text-base">{codeProblem.title}</p>
                  <p className="m-0 text-sm text-sc-ink3 leading-6">{codeProblem.body}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {codeProblem.matchSlug && (
                  <button type="button" onClick={() => navigate(`/match/${codeProblem.matchSlug}`, { replace: true })} className="h-11 px-4 rounded-full bg-sc-green text-white text-sm font-bold">View the match</button>
                )}
                {preSelectedVenueSlug && (
                  <button type="button" onClick={() => navigate(`/venue/${preSelectedVenueSlug}/book`, { replace: true })} className="h-11 px-4 rounded-full bg-sc-soft text-sc-ink text-sm font-bold">Book again</button>
                )}
              </div>
            </div>
          )}
          {isPreFilled && lockedBooking && (
            <div className="mb-4 bg-sc-green-bg text-sc-green-dark p-4 rounded-3xl flex gap-3 items-start">
              <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0"><Lock size={16} /></span>
              <div>
                <p className="m-0 font-extrabold">Set from your booking</p>
                <p className="m-0 text-sm leading-6">Venue, date and time come from your booking and are locked. Fill in the rest to publish.</p>
              </div>
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
                  onPrefill={() => setHasValidBookingCode(true)}
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
          <ConfirmModal
            open={!!inactiveVenue}
            onOpenChange={(v) => {
              if (v) return;
              // Pick another venue clears the choice, unless a booking code locked it
              if (!inactiveOk.current && !isPreFilled) {
                if (inactiveVenue) warnedVenues.current.delete(inactiveVenue);
                form.setValue("venue_id", "" as any);
              }
              inactiveOk.current = false;
              setInactiveVenue(null);
            }}
            icon={Store}
            title="This venue is marked inactive"
            description="It is not taking bookings on SportCliq right now. Only continue if the venue has confirmed your date and time with you."
            confirmLabel="I have confirmation"
            cancelLabel="Pick another venue"
            onConfirm={() => { inactiveOk.current = true; }}
          />
          <MatchPreviewDialog
            open={previewDialogOpen}
            onOpenChange={setPreviewDialogOpen}
            formValues={form.watch()}
            selectedVenue={selectedVenue}
          />
          <MatchSuccessDialog
            open={successDialogOpen}
            onOpenChange={setSuccessDialogOpen}
            formValues={form.watch()}
            selectedVenue={selectedVenue}
            supercode={supercode}
            matchSlug={matchSlug}
            onNavigate={(slug) => navigate(`/match/${slug}`, { replace: true })}
          />
        </div>
      </div>
    </>
  );
};

export default Organize;
