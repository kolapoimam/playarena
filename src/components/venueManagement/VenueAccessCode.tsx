import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CalendarDays, Check, Clock, Copy, KeyRound, Loader2, Minus, Phone, Plus, Repeat, Share2, StopCircle, Timer, User, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { EmptyState, Segmented, formatNairaExact, formatTime12 } from "@/components/sc/ui";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { busyBetween, notInPast, toMinutes } from "@/lib/venueSlots";
import { activeOccurrences, dateOf, isoOf, occurrences, scheduleLabel, WEEKDAYS, type CodeSchedule } from "@/lib/codeSchedule";
import { cn } from "@/lib/utils";

type AccessCode = CodeSchedule & {
  id: string;
  booking_id: string | null;
  code: string;
  expiry_date: string;
  status: "pending" | "active" | "inactive";
  created_at: string;
  booker_name?: string | null;
  booker_phone?: string | null;
  start_time: string | null;
  end_time: string | null;
  times_used?: number | null;
  bookings?: { amount: number | null; organizer_name: string | null; booker_name?: string | null; booker_phone?: string | null } | null;
};

type Filter = "open" | "booked" | "past";
type Freq = "once" | "daily" | "weekly" | "monthly";

const todayIso = () => isoOf(new Date());
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
// Time choices every 15 minutes, shown in 12 hour format and stored as "HH:MM"
const QUARTER_HOURS = Array.from({ length: 96 }, (_, i) => {
  const m = i * 15;
  const h = Math.floor(m / 60);
  return { value: hh(m), label: `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}` };
});
const shortDate = (iso: string) => dateOf(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

const durationLabel = (start?: string | null, end?: string | null) => {
  const s = toMinutes(start), e = toMinutes(end);
  if (s == null || e == null || e <= s) return null;
  const h = Math.floor((e - s) / 60), m = (e - s) % 60;
  return [h ? `${h} hr${h > 1 ? "s" : ""}` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};

const field = "block w-full min-w-0 h-11 rounded-xl bg-sc-bg px-3 text-[16px] font-bold text-sc-ink outline-none border border-transparent focus:bg-white focus:border-sc-ink/20 appearance-none [&::-webkit-date-and-time-value]:text-left [&::-webkit-calendar-picker-indicator]:opacity-50";

function Stepper({ value, onChange, min = 1, max = 52, unit }: { value: number; onChange: (n: number) => void; min?: number; max?: number; unit: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label="Less" onClick={() => onChange(Math.max(min, value - 1))} className="w-9 h-9 rounded-full bg-sc-bg flex items-center justify-center active:scale-95"><Minus size={16} /></button>
      <span className="min-w-[74px] text-center text-[14px] font-extrabold">{value} {unit}{value > 1 ? "s" : ""}</span>
      <button type="button" aria-label="More" onClick={() => onChange(Math.min(max, value + 1))} className="w-9 h-9 rounded-full bg-sc-bg flex items-center justify-center active:scale-95"><Plus size={16} /></button>
    </div>
  );
}

const VenueAccessCode = ({ venueId, venueName, venueSlug }: { venueId: string; venueName?: string; venueSlug?: string }) => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [copied, setCopied] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<AccessCode | null>(null);
  const [stopping, setStopping] = useState<AccessCode | null>(null);

  // new code form
  const today = todayIso();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(today);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [freq, setFreq] = useState<Freq>("once");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [monthDay, setMonthDay] = useState<number>(new Date().getDate());
  const [months, setMonths] = useState(3);
  const [until, setUntil] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState<AccessCode | null>(null);

  const fetchCodes = useCallback(async () => {
    if (!venueId) return;
    const { data, error } = await supabase.from("booking_access_codes").select("*, bookings(*)").eq("venue_id", venueId).order("match_date", { ascending: true });
    if (error) {
      console.error("Loading booking codes failed", error);
      toast({ title: "Codes not loaded", description: error.message, variant: "destructive" });
      return;
    }
    setCodes((data as any[]) || []);
  }, [venueId, toast]);

  useEffect(() => {
    fetchCodes();
    const ch = supabase
      .channel(`access_codes_${venueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_access_codes", filter: `venue_id=eq.${venueId}` }, () => fetchCodes())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [venueId, fetchCodes]);

  // the schedule being built in the form
  const draft: CodeSchedule = useMemo(() => {
    if (freq === "once") return { match_date: day };
    if (freq === "daily") return { match_date: day, is_recurring: true, recurring_frequency: "daily", recurring_until: until || day };
    if (freq === "weekly") return { match_date: day, is_recurring: true, recurring_frequency: "weekly", recurring_days: weekdays.length ? weekdays : [dateOf(day).getDay()], recurring_occurrences: weeks };
    return { match_date: day, is_recurring: true, recurring_frequency: "monthly", recurring_days: [monthDay], recurring_occurrences: months };
  }, [freq, day, until, weekdays, weeks, monthDay, months]);
  const draftDates = useMemo(() => occurrences(draft), [draft]);

  const meta = (c: AccessCode) => {
    const all = occurrences(c);
    const live = activeOccurrences(c);
    const upcoming = live.filter((d) => d >= today);
    const held = all.filter((d) => d < today && (!c.deactivated_at || d < isoOf(new Date(c.deactivated_at)))).length;
    const used = c.times_used ?? (c.booking_id || c.status === "active" ? 1 : 0);
    return { all, upcoming, held, used, next: upcoming[0] };
  };

  const groups = useMemo(() => {
    const g: Record<Filter, AccessCode[]> = { open: [], booked: [], past: [] };
    for (const c of codes) {
      const m = meta(c);
      const ended = c.cancelled_at || c.status === "inactive" || m.upcoming.length === 0;
      if (ended) g.past.push(c);
      else if (c.booking_id || c.status === "active") g.booked.push(c);
      else g.open.push(c);
    }
    g.past.reverse();
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes, today]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy this", description: text });
    }
  };

  const share = async (c: AccessCode) => {
    const when = c.match_date ? `${dateOf(c.match_date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}, ${formatTime12(c.start_time)} to ${formatTime12(c.end_time)}` : "";
    const repeat = c.is_recurring ? ` (${scheduleLabel(c).toLowerCase()})` : "";
    const text = `Your slot${venueName ? ` at ${venueName}` : ""} is locked in${when ? ` for ${when}` : ""}${repeat}! ⚽\n\nOpen SportCliq, tap Organise and enter booking code ${c.code}. Your venue, date and time fill in for you, so all that is left is inviting your squad.\n\napp.sportcliq.com/organize?${venueSlug ? `venue=${venueSlug}&` : ""}code=${c.code}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* closed */ }
    } else copy(text, `share-${c.id}`);
  };

  const resetForm = () => {
    setDay(today); setStart(""); setEnd(""); setFreq("once"); setWeekdays([]); setWeeks(4);
    setMonthDay(new Date().getDate()); setMonths(3); setUntil(""); setFormError(null); setGenerated(null);
  };
  const close = () => { setOpen(false); setTimeout(resetForm, 200); };

  const setDuration = (mins: number) => {
    const s = toMinutes(start);
    if (s == null) return setFormError("Pick a start time first.");
    setFormError(null);
    setEnd(hh(Math.min(s + mins, 23 * 60 + 59)));
  };

  const create = async () => {
    setFormError(null);
    const s = toMinutes(start), e = toMinutes(end);
    if (s == null || e == null) return setFormError("Choose a start and end time.");
    if (e <= s) return setFormError("The end time must be after the start time.");
    if (e - s < 30) return setFormError("A slot must be at least 30 minutes.");
    if (freq === "weekly" && !weekdays.length) return setFormError("Pick at least one day of the week.");
    if (freq === "daily" && (!until || until <= day)) return setFormError("Pick an end date after the start date.");
    const dates = draftDates;
    if (!dates.length) return setFormError("This schedule has no dates. Check your choices.");
    if (dates[0] < today) return setFormError("Pick today or a later date.");
    if (dates[0] === today && !notInPast(today, start)) return setFormError("That start time has already passed today. Pick a later time.");
    if (dates.length > 120) return setFormError("That is a lot of sessions. Keep it under 120.");

    setSaving(true);
    try {
      const busy = await busyBetween(venueId, dates[0], dates[dates.length - 1]);
      if (!busy) throw new Error("We could not check your calendar. Try again.");
      const clash = dates.find((d) => busy.some((x) => x.day === d && s < x.end && e > x.start));
      if (clash) return setFormError(`${shortDate(clash)} already has a booking or code at that time. Pick another time.`);

      const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("");
      const row: Record<string, unknown> = {
        venue_id: venueId,
        code,
        // the code works for 48 hours, or until the first session starts if that is later
        expiry_date: new Date(Math.max(Date.now() + 48 * 3600e3, dateOf(dates[0]).getTime() + s * 60e3)).toISOString(),
        status: "pending",
        created_at: new Date().toISOString(),
        booking_id: null,
        match_date: dates[0],
        start_time: hh(s),
        end_time: hh(e),
      };
      if (draft.is_recurring) {
        Object.assign(row, {
          is_recurring: true,
          recurring_frequency: draft.recurring_frequency,
          recurring_occurrences: freq === "daily" ? dates.length : draft.recurring_occurrences,
          recurring_days: draft.recurring_days ?? null,
          recurring_until: freq === "daily" ? until : dates[dates.length - 1],
        });
      }
      const { data, error } = await supabase.from("booking_access_codes").insert(row as any).select("*").limit(1);
      if (error) {
        if (/recurring_days|recurring_until|column/i.test(error.message)) throw new Error("Repeating codes need a quick database update first. Ask SportCliq support.");
        throw error;
      }
      setGenerated(((data as any[]) || [])[0] || (row as any));
      fetchCodes();
    } catch (err: any) {
      setFormError(err.message || "Could not create the code.");
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    if (!cancelling) return;
    let { error } = await supabase.from("booking_access_codes").update({ status: "inactive", cancelled_at: new Date().toISOString() } as any).eq("id", cancelling.id).is("booking_id", null);
    if (error && /cancelled_at/.test(error.message)) ({ error } = await supabase.from("booking_access_codes").update({ status: "inactive" }).eq("id", cancelling.id).is("booking_id", null));
    if (error) return void toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    toast({ title: "Code cancelled", description: "It no longer works and the time is free again." });
    fetchCodes();
  };

  const doStop = async () => {
    if (!stopping) return;
    const { error } = await supabase.from("booking_access_codes").update({ deactivated_at: new Date().toISOString() } as any).eq("id", stopping.id);
    if (error) return void toast({ title: "Could not stop", description: /deactivated_at/.test(error.message) ? "This needs a quick database update first. Ask SportCliq support." : error.message, variant: "destructive" });
    toast({ title: "Repeats stopped", description: "Future dates are free again. Past sessions stay on record." });
    fetchCodes();
  };

  const statusOf = (c: AccessCode, m: ReturnType<typeof meta>) => {
    if (c.cancelled_at) return { label: "Cancelled", cls: "bg-[#FEE2E2] text-[#B91C1C]" };
    if (c.deactivated_at) return { label: "Stopped", cls: "bg-black/[0.05] text-sc-ink2" };
    if (c.status === "inactive") return { label: "Released", cls: "bg-black/[0.05] text-sc-ink3" };
    if (!m.upcoming.length) return { label: "Done", cls: "bg-black/[0.05] text-sc-ink3" };
    if (c.booking_id || c.status === "active") return { label: "Booked", cls: "bg-sc-green/10 text-sc-green" };
    if (new Date(c.expiry_date) < new Date()) return { label: "Code expired", cls: "bg-[#FEF3C7] text-[#B45309]" };
    return { label: "Waiting", cls: "bg-sport-venue-bg text-sport-venue-fg" };
  };

  const shown = groups[filter];
  const nextDays = useMemo(() => Array.from({ length: 21 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return isoOf(d); }), [today]);
  const chipCls = (on: boolean) => cn("h-9 rounded-full text-[13px] font-bold transition-colors", on ? "bg-sc-ink text-white" : "bg-sc-bg text-sc-ink");

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-white rounded-[24px] p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-sport-venue-bg text-sport-venue-fg flex items-center justify-center shrink-0"><KeyRound size={20} /></span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-extrabold">Booking codes</span>
          <span className="text-[13px] leading-[18px] text-sc-ink3">Give an organiser a slot at your venue.</span>
        </span>
        <button type="button" onClick={() => { resetForm(); setOpen(true); }} className="h-10 pl-3 pr-4 rounded-full bg-sc-ink text-white text-[14px] font-bold inline-flex items-center gap-1.5 shrink-0 active:scale-95">
          <Plus size={16} /> New
        </button>
      </div>

      <Segmented
        options={[
          { value: "open", label: `Open${groups.open.length ? ` (${groups.open.length})` : ""}` },
          { value: "booked", label: `Booked${groups.booked.length ? ` (${groups.booked.length})` : ""}` },
          { value: "past", label: "Past" },
        ]}
        value={filter}
        onChange={(v) => setFilter(v as Filter)}
      />

      {shown.length === 0 ? (
        <div className="bg-white rounded-[24px]">
          <EmptyState
            icon={KeyRound}
            sport="venue"
            title={filter === "open" ? "No open codes" : filter === "booked" ? "Nothing booked with a code yet" : "No past codes"}
            subtitle={filter === "open" ? "Tap New to hold a time and share the code with an organiser." : filter === "booked" ? "When an organiser uses a code, it shows here." : "Finished, cancelled and stopped codes show here."}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((c) => {
            const m = meta(c);
            const st = statusOf(c, m);
            const showDate = m.next || c.match_date;
            const date = showDate ? dateOf(showDate) : null;
            const dur = durationLabel(c.start_time, c.end_time);
            const name = c.booker_name || c.bookings?.booker_name || c.bookings?.organizer_name || null;
            const phone = c.booker_phone || c.bookings?.booker_phone || null;
            const amount = c.bookings?.amount;
            const ended = filter === "past";
            const isOpen = filter === "open";
            return (
              <div key={c.id} className={cn("bg-white rounded-[24px] overflow-hidden", ended && "opacity-80")}>
                <div className="flex items-stretch">
                  <div className="w-[74px] shrink-0 bg-sport-venue-bg text-sport-venue-fg flex flex-col items-center justify-center py-4 leading-none">
                    {m.next && c.is_recurring && <span className="text-[9.5px] font-extrabold uppercase tracking-[0.08em] mb-1">Next</span>}
                    <span className="text-[11px] font-bold uppercase">{date ? date.toLocaleDateString("en-GB", { weekday: "short" }) : ""}</span>
                    <span className="text-[26px] font-extrabold my-0.5">{date ? date.getDate() : "?"}</span>
                    <span className="text-[11px] font-bold uppercase">{date ? date.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
                  </div>
                  <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[19px] font-extrabold tracking-[0.16em] font-mono", c.cancelled_at && "line-through decoration-2 text-sc-ink3")}>{c.code}</span>
                      <span className={cn("ml-auto h-6 px-2.5 rounded-full text-[11.5px] font-bold inline-flex items-center shrink-0", st.cls)}>{st.label}</span>
                    </div>
                    <span className="text-[13.5px] font-bold text-sc-ink inline-flex items-center gap-1.5 flex-wrap">
                      <Clock size={14} className="text-sc-ink3 shrink-0" /> {formatTime12(c.start_time)} to {formatTime12(c.end_time)}
                      {dur && <span className="text-sc-ink3 font-semibold">· {dur}</span>}
                    </span>
                    {c.is_recurring && (
                      <span className="text-[12.5px] text-sc-ink2 inline-flex items-center gap-1.5 min-w-0">
                        <Repeat size={13} className="text-sc-ink3 shrink-0" /> <span className="truncate">{scheduleLabel(c)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mx-3.5 border-t border-sc-line py-2.5 grid grid-cols-2 gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-sc-bg flex items-center justify-center shrink-0"><User size={15} className="text-sc-ink2" /></span>
                    <span className="min-w-0 flex flex-col leading-tight">
                      <span className="text-[11px] font-semibold text-sc-ink3">Booked by</span>
                      <span className="text-[13.5px] font-bold truncate">{name || (c.booking_id || c.status === "active" ? "Organiser" : "Not yet")}</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-sc-bg flex items-center justify-center shrink-0"><Wallet size={15} className="text-sc-ink2" /></span>
                    <span className="min-w-0 flex flex-col leading-tight">
                      <span className="text-[11px] font-semibold text-sc-ink3">Amount</span>
                      <span className="text-[13.5px] font-bold truncate">{Number(amount) > 0 ? formatNairaExact(amount) : c.booking_id || c.status === "active" ? "Settled offline" : "Not booked"}</span>
                    </span>
                  </div>
                </div>

                {(c.is_recurring || m.used > 0 || c.cancelled_at || c.deactivated_at) && (
                  <div className="mx-3.5 mb-2.5 rounded-xl bg-sc-bg px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-semibold text-sc-ink2">
                    <span>Used {m.used} time{m.used === 1 ? "" : "s"}</span>
                    {c.is_recurring && <span>{m.held} of {m.all.length} sessions held</span>}
                    {c.cancelled_at && <span>Cancelled {shortDate(isoOf(new Date(c.cancelled_at)))}</span>}
                    {c.deactivated_at && <span>Stopped {shortDate(isoOf(new Date(c.deactivated_at)))}</span>}
                  </div>
                )}

                {!ended && (
                  <div className="px-3.5 pb-3.5 flex gap-2">
                    {phone && (
                      <a href={`tel:${phone}`} className="flex-1 min-w-0 h-10 rounded-full bg-sc-green/10 text-sc-green text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]">
                        <Phone size={15} /> <span className="truncate">{phone}</span>
                      </a>
                    )}
                    <button type="button" onClick={() => copy(c.code, c.id)} aria-label="Copy code" className={cn("h-10 rounded-full bg-black/[0.05] text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]", phone || isOpen ? "w-10 shrink-0" : "flex-1")}>
                      {copied === c.id ? <Check size={15} className="text-sc-green" /> : <Copy size={15} />} {!phone && !isOpen && (copied === c.id ? "Copied" : "Copy")}
                    </button>
                    {isOpen && (
                      <button type="button" onClick={() => share(c)} className="flex-1 h-10 rounded-full bg-sc-ink text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]">
                        <Share2 size={15} /> Share
                      </button>
                    )}
                    {isOpen && (
                      <button type="button" onClick={() => setCancelling(c)} className="h-10 px-3.5 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[13px] font-bold inline-flex items-center gap-1.5 shrink-0 active:scale-[0.98]">
                        <Ban size={14} /> Cancel
                      </button>
                    )}
                    {!isOpen && c.is_recurring && m.upcoming.length > 0 && (
                      <button type="button" onClick={() => setStopping(c)} className="h-10 px-3.5 rounded-full bg-black/[0.05] text-[13px] font-bold inline-flex items-center gap-1.5 shrink-0 active:scale-[0.98]">
                        <StopCircle size={14} /> Stop
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[380px] max-w-[calc(100%-1.5rem)] p-0 gap-0 overflow-x-hidden">
          {generated ? (
            <div className="p-5 flex flex-col items-center text-center gap-3">
              <span className="w-14 h-14 rounded-[20px] bg-sc-green/10 text-sc-green flex items-center justify-center mt-2"><Check size={26} strokeWidth={2.6} /></span>
              <DialogTitle className="text-center">Slot held</DialogTitle>
              <DialogDescription className="text-center">
                {generated.is_recurring ? `${scheduleLabel(generated)}, ${occurrences(generated).length} sessions` : shortDate(generated.match_date || today)}, {formatTime12(generated.start_time)} to {formatTime12(generated.end_time)}. It is blocked on your calendar.
              </DialogDescription>
              <span className="w-full rounded-2xl bg-sc-bg py-4 text-[30px] font-extrabold tracking-[0.3em] font-mono">{generated.code}</span>
              <div className="w-full flex gap-2">
                <button type="button" onClick={() => copy(generated.code, "new")} className={cn(modalCancel, "flex-1 px-3")}>
                  {copied === "new" ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                </button>
                <button type="button" onClick={() => share(generated)} className={cn(modalAction, "flex-1 px-3")}><Share2 size={16} /> Share</button>
              </div>
              <button type="button" onClick={close} className="text-[14px] font-bold text-sc-ink3 py-1">Done</button>
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              <div className="px-5 pt-5 pb-3 pr-14">
                <DialogTitle>Hold a slot</DialogTitle>
                <DialogDescription className="text-[14px] mt-1">Block a time and share the code with the organiser.</DialogDescription>
              </div>

              <div className="px-5 flex flex-col gap-4 min-w-0 pb-2">
                <section className="flex flex-col gap-2 min-w-0">
                  <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-sc-ink3">{freq === "once" ? "Day" : "Starts on"}</span>
                  <div className="-mx-5 px-5 flex gap-1.5 overflow-x-auto no-scrollbar snap-x">
                    {nextDays.map((d) => {
                      const dt = dateOf(d);
                      const on = d === day;
                      return (
                        <button key={d} type="button" onClick={() => { setDay(d); setFormError(null); if (freq === "monthly") setMonthDay(dt.getDate()); }} className={cn("snap-start shrink-0 w-[52px] h-[62px] rounded-2xl flex flex-col items-center justify-center leading-none transition-colors", on ? "bg-sc-ink text-white" : "bg-sc-bg text-sc-ink")}>
                          <span className={cn("text-[11px] font-bold uppercase", on ? "text-white/70" : "text-sc-ink3")}>{d === today ? "Today" : dt.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                          <span className="text-[19px] font-extrabold mt-1">{dt.getDate()}</span>
                        </button>
                      );
                    })}
                    <label className={cn("relative snap-start shrink-0 w-[62px] h-[62px] rounded-2xl flex flex-col items-center justify-center gap-1 text-[11px] font-bold overflow-hidden", !nextDays.includes(day) ? "bg-sc-ink text-white" : "bg-sc-bg text-sc-ink")}>
                      <CalendarDays size={18} />
                      {!nextDays.includes(day) ? dateOf(day).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Later"}
                      <input type="date" min={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value < today ? today : e.target.value)} className="absolute inset-0 w-full h-full opacity-0" aria-label="Pick a later date" />
                    </label>
                  </div>
                </section>

                <section className="flex flex-col gap-2 min-w-0">
                  <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-sc-ink3">Time</span>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <select value={toMinutes(start) == null ? "" : hh(toMinutes(start)!)} onChange={(e) => { setStart(e.target.value); setFormError(null); }} aria-label="Start time" className={field}>
                      <option value="" disabled>Pick a time</option>
                      {QUARTER_HOURS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <span className="text-sc-ink3 text-[13px] font-bold">to</span>
                    <select value={toMinutes(end) == null ? "" : hh(toMinutes(end)!)} onChange={(e) => { setEnd(e.target.value); setFormError(null); }} aria-label="End time" className={field}>
                      <option value="" disabled>Pick a time</option>
                      {QUARTER_HOURS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[60, 90, 120, 180].map((mins) => {
                      const sm = toMinutes(start), em = toMinutes(end);
                      const on = sm != null && em != null && em - sm === mins;
                      return (
                        <button key={mins} type="button" onClick={() => setDuration(mins)} className={chipCls(on)}>
                          {mins / 60} hr{mins > 60 ? "s" : ""}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-2.5 min-w-0">
                  <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-sc-ink3 inline-flex items-center gap-1.5"><Repeat size={13} /> Repeat</span>
                  <Segmented
                    options={[{ value: "once", label: "Once" }, { value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
                    value={freq}
                    onChange={(v) => { setFreq(v as Freq); setFormError(null); if (v === "weekly" && !weekdays.length) setWeekdays([dateOf(day).getDay()]); if (v === "monthly") setMonthDay(dateOf(day).getDate()); }}
                  />

                  {freq === "daily" && (
                    <label className="flex items-center justify-between gap-3 min-w-0">
                      <span className="text-[13.5px] font-bold text-sc-ink2 shrink-0">Every day until</span>
                      <input type="date" min={day} value={until} onChange={(e) => { setUntil(e.target.value); setFormError(null); }} className={cn(field, "max-w-[170px]")} />
                    </label>
                  )}

                  {freq === "weekly" && (
                    <>
                      <div className="grid grid-cols-7 gap-1">
                        {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                          const on = weekdays.includes(wd);
                          return (
                            <button key={wd} type="button" aria-pressed={on} onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== wd) : [...weekdays, wd])} className={cn(chipCls(on), "px-0 text-[12px]")}>
                              {WEEKDAYS[wd].slice(0, 2)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13.5px] font-bold text-sc-ink2">For</span>
                        <Stepper value={weeks} onChange={setWeeks} unit="week" max={26} />
                      </div>
                    </>
                  )}

                  {freq === "monthly" && (
                    <>
                      <span className="text-[13px] font-semibold text-sc-ink2">Day of the month</span>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                          <button key={n} type="button" onClick={() => setMonthDay(n)} className={cn("h-8 rounded-lg text-[12.5px] font-bold", n === monthDay ? "bg-sc-ink text-white" : "bg-sc-bg text-sc-ink")}>{n}</button>
                        ))}
                      </div>
                      {monthDay > 28 && <span className="text-[12px] text-sc-ink3">Shorter months use their last day.</span>}
                      <div className="flex items-center justify-between">
                        <span className="text-[13.5px] font-bold text-sc-ink2">For</span>
                        <Stepper value={months} onChange={setMonths} unit="month" max={12} />
                      </div>
                    </>
                  )}

                  {freq !== "once" && draftDates.length > 0 && (
                    <div className="rounded-xl bg-sport-venue-bg px-3 py-2.5 text-[12.5px] text-sport-venue-fg font-semibold">
                      {draftDates.length} session{draftDates.length > 1 ? "s" : ""}, first {shortDate(draftDates[0])}, last {shortDate(draftDates[draftDates.length - 1])}
                    </div>
                  )}
                </section>

                {formError && <p className="m-0 text-[13px] font-semibold text-[#B91C1C]">{formError}</p>}
              </div>

              <div className="sticky bottom-0 bg-white px-5 pt-3 pb-5 flex gap-2 border-t border-sc-line">
                <button type="button" onClick={close} className={cn(modalCancel, "flex-1 px-3")}>Cancel</button>
                <button type="button" onClick={create} disabled={saving} className={cn(modalAction, "flex-1 px-3")}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <><Timer size={16} /> Get code</>}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!cancelling}
        onOpenChange={(v) => !v && setCancelling(null)}
        icon={Ban}
        tone="danger"
        title="Cancel this code?"
        description="Anyone who tries to use it will be told it was cancelled, and the time opens up for bookings again."
        confirmLabel="Cancel code"
        cancelLabel="Keep it"
        onConfirm={doCancel}
      />
      <ConfirmModal
        open={!!stopping}
        onOpenChange={(v) => !v && setStopping(null)}
        icon={StopCircle}
        tone="danger"
        title="Stop the repeats?"
        description="Future dates are freed up. Sessions that already happened stay on record."
        confirmLabel="Stop repeats"
        cancelLabel="Keep going"
        onConfirm={doStop}
      />
    </div>
  );
};

export default VenueAccessCode;
