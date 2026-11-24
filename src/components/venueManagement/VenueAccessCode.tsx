import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock, Copy, KeyRound, Loader2, Phone, Plus, Repeat, Share2, Timer, User, Wallet, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TimeInput from "@/components/TimeInput";
import ConfirmModal from "@/components/sc/ConfirmModal";
import { EmptyState, Segmented, formatNairaExact, formatTime12 } from "@/components/sc/ui";
import { modalAction, modalCancel } from "@/components/ui/modal-styles";
import { busySlots, notInPast, overlaps, toMinutes } from "@/lib/venueSlots";
import { cn } from "@/lib/utils";

type AccessCode = {
  id: string;
  booking_id: string | null;
  code: string;
  expiry_date: string;
  status: "pending" | "active" | "inactive";
  created_at: string;
  booker_name: string | null;
  booker_phone: string | null;
  match_date: string | null;
  start_time: string | null;
  end_time: string | null;
  is_recurring: boolean | null;
  recurring_frequency: string | null;
  recurring_occurrences: number | null;
  bookings?: { amount: number | null; payment_status: string | null; title: string | null; organizer_name: string | null; booker_name?: string | null; booker_phone?: string | null } | null;
};

type Filter = "open" | "booked" | "past";

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const durationLabel = (start?: string | null, end?: string | null) => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null || e <= s) return null;
  const mins = e - s;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h} hr${h > 1 ? "s" : ""}` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};

const EMPTY_FORM = { match_date: "", start_time: "", end_time: "", is_recurring: false, recurring_frequency: "weekly", recurring_occurrences: "" };

const VenueAccessCode = ({ venueId, venueName, venueSlug }: { venueId: string; venueName?: string; venueSlug?: string }) => {
  const { toast } = useToast();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ code: string; date: string; start: string; end: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [release, setRelease] = useState<AccessCode | null>(null);

  const fetchCodes = useCallback(async () => {
    if (!venueId) return;
    const { data, error } = await supabase
      .from("booking_access_codes")
      .select("*, bookings(*)")
      .eq("venue_id", venueId)
      .order("match_date", { ascending: true });
    if (error) {
      console.error("Loading booking codes failed", error);
      toast({ title: "Codes not loaded", description: error.message, variant: "destructive" });
      return;
    }
    setCodes((data as any[]) || []);
  }, [venueId, toast]);

  useEffect(() => {
    fetchCodes();
    const channel = supabase
      .channel(`access_codes_${venueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "booking_access_codes", filter: `venue_id=eq.${venueId}` }, () => fetchCodes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [venueId, fetchCodes]);

  const today = todayIso();
  const groups = useMemo(() => {
    const past = (c: AccessCode) => c.status === "inactive" || (c.match_date || "") < today;
    return {
      open: codes.filter((c) => !past(c) && !c.booking_id),
      booked: codes.filter((c) => !past(c) && !!c.booking_id),
      past: codes.filter(past).reverse(),
    };
  }, [codes, today]);
  const shown = groups[filter];

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Copy this", description: text });
    }
  };

  const shareText = (code: string, date?: string | null, start?: string | null, end?: string | null) => {
    const when = date ? `${new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${start ? `, ${formatTime12(start)}${end ? ` to ${formatTime12(end)}` : ""}` : ""}` : "";
    return `Your slot${venueName ? ` at ${venueName}` : ""} is locked in${when ? ` for ${when}` : ""}! ⚽\n\nOpen SportCliq, tap Organise and enter booking code ${code}. Your venue, date and time fill in for you, so all that is left is inviting your squad.\n\napp.sportcliq.com/organize?${venueSlug ? `venue=${venueSlug}&` : ""}code=${code}`;
  };

  const share = async (c: { code: string; match_date?: string | null; start_time?: string | null; end_time?: string | null }) => {
    const text = shareText(c.code, c.match_date, c.start_time, c.end_time);
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* closed */ }
    } else copy(text, `share-${c.code}`);
  };

  const close = () => {
    setOpen(false);
    setGenerated(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const create = async () => {
    const { match_date, start_time, end_time, is_recurring, recurring_frequency, recurring_occurrences } = form;
    setFormError(null);
    if (!match_date || !start_time || !end_time) return setFormError("Choose the date, start time and end time.");
    if (match_date < today) return setFormError("Pick today or a later date.");
    if (!notInPast(match_date, start_time)) return setFormError("That start time has already passed. Pick a later time.");
    const s = toMinutes(start_time);
    const e = toMinutes(end_time);
    if (s == null || e == null || e <= s) return setFormError("The end time must be after the start time.");
    if (e - s < 30) return setFormError("A slot must be at least 30 minutes.");
    if (is_recurring && !(Number(recurring_occurrences) >= 1)) return setFormError("Say how many times it repeats.");

    setLoading(true);
    try {
      const busy = await busySlots(venueId, match_date);
      if (!busy) throw new Error("We could not check your calendar. Try again.");
      if (overlaps(busy, s, e)) return setFormError("This time overlaps a booking or code you already have. Pick another time.");

      // Saved as 24 hour time, the same way bookings save it
      const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      const code = Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("");
      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("booking_access_codes").insert({
        venue_id: venueId,
        code,
        expiry_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        created_at: createdAt,
        booking_id: null,
        match_date,
        start_time: hh(s),
        end_time: hh(e),
        is_recurring: !!is_recurring,
        recurring_frequency: is_recurring ? recurring_frequency || "weekly" : null,
        recurring_occurrences: is_recurring ? parseInt(recurring_occurrences) : null,
      } as any);
      if (error) throw error;
      setGenerated({ code, date: match_date, start: start_time, end: end_time });
      fetchCodes();
    } catch (err: any) {
      setFormError(err.message || "Could not create the code.");
    } finally {
      setLoading(false);
    }
  };

  const doRelease = async () => {
    if (!release) return;
    const { error } = await supabase.from("booking_access_codes").update({ status: "inactive" }).eq("id", release.id).is("booking_id", null);
    if (error) {
      toast({ title: "Could not release", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Slot released", description: "That time is open for bookings again." });
    fetchCodes();
  };

  const field = "block w-full min-w-0 h-11 rounded-xl bg-sc-bg px-3.5 text-[16px] font-semibold text-sc-ink outline-none border border-transparent focus:bg-white focus:border-sc-ink/20";

  const statusOf = (c: AccessCode) => {
    if (c.status === "inactive") return { label: "Released", cls: "bg-black/[0.05] text-sc-ink3" };
    if ((c.match_date || "") < today) return { label: "Done", cls: "bg-black/[0.05] text-sc-ink3" };
    if (c.booking_id) return { label: "Booked", cls: "bg-sc-green/10 text-sc-green" };
    if (new Date(c.expiry_date) < new Date()) return { label: "Code expired", cls: "bg-[#FEF3C7] text-[#B45309]" };
    return { label: "Waiting", cls: "bg-sport-venue-bg text-sport-venue-fg" };
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-white rounded-[24px] p-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-sport-venue-bg text-sport-venue-fg flex items-center justify-center shrink-0"><KeyRound size={20} /></span>
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-extrabold">Booking codes</span>
          <span className="text-[13px] leading-[18px] text-sc-ink3">Give an organiser a slot at your venue.</span>
        </span>
        <button type="button" onClick={() => setOpen(true)} className="h-10 pl-3 pr-4 rounded-full bg-sc-ink text-white text-[14px] font-bold inline-flex items-center gap-1.5 shrink-0 active:scale-95">
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
            subtitle={filter === "open" ? "Tap New to hold a time and share the code with an organiser." : filter === "booked" ? "When an organiser uses a code, the booking shows here." : "Codes for past days show here."}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map((c) => {
            const st = statusOf(c);
            const date = c.match_date ? new Date(`${c.match_date}T00:00:00`) : null;
            const dur = durationLabel(c.start_time, c.end_time);
            const name = c.booker_name || c.bookings?.booker_name || c.bookings?.organizer_name || null;
            const phone = c.booker_phone || c.bookings?.booker_phone || null;
            const amount = c.bookings?.amount;
            const isPast = st.label === "Done" || st.label === "Released";
            return (
              <div key={c.id} className={cn("bg-white rounded-[24px] overflow-hidden", isPast && "opacity-75")}>
                <div className="flex items-stretch">
                  <div className="w-[76px] shrink-0 bg-sport-venue-bg text-sport-venue-fg flex flex-col items-center justify-center py-4 leading-none">
                    <span className="text-[11px] font-bold uppercase">{date ? date.toLocaleDateString("en-GB", { weekday: "short" }) : ""}</span>
                    <span className="text-[26px] font-extrabold my-0.5">{date ? date.getDate() : "?"}</span>
                    <span className="text-[11px] font-bold uppercase">{date ? date.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
                  </div>
                  <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[19px] font-extrabold tracking-[0.16em] font-mono">{c.code}</span>
                      <span className={cn("ml-auto h-6 px-2.5 rounded-full text-[11.5px] font-bold inline-flex items-center shrink-0", st.cls)}>{st.label}</span>
                    </div>
                    <span className="text-[13.5px] font-bold text-sc-ink inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-sc-ink3 shrink-0" /> {formatTime12(c.start_time)} to {formatTime12(c.end_time)}
                    </span>
                    <div className="flex items-center gap-3 text-[12.5px] text-sc-ink3">
                      {dur && <span className="inline-flex items-center gap-1"><Timer size={13} /> {dur}</span>}
                      {c.is_recurring && <span className="inline-flex items-center gap-1"><Repeat size={13} /> {c.recurring_frequency} × {c.recurring_occurrences}</span>}
                    </div>
                  </div>
                </div>

                <div className="mx-3.5 border-t border-sc-line py-2.5 grid grid-cols-2 gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-sc-bg flex items-center justify-center shrink-0"><User size={15} className="text-sc-ink2" /></span>
                    <span className="min-w-0 flex flex-col leading-tight">
                      <span className="text-[11px] font-semibold text-sc-ink3">Booked by</span>
                      <span className="text-[13.5px] font-bold truncate">{name || (c.booking_id ? "Organiser" : "Not yet")}</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-sc-bg flex items-center justify-center shrink-0"><Wallet size={15} className="text-sc-ink2" /></span>
                    <span className="min-w-0 flex flex-col leading-tight">
                      <span className="text-[11px] font-semibold text-sc-ink3">Amount</span>
                      <span className="text-[13.5px] font-bold truncate">{Number(amount) > 0 ? formatNairaExact(amount) : c.booking_id ? "Settled offline" : "Not booked"}</span>
                    </span>
                  </div>
                </div>

                <div className="px-3.5 pb-3.5 flex gap-2">
                  {phone && (
                    <a href={`tel:${phone}`} className="flex-1 min-w-0 h-10 rounded-full bg-sc-green/10 text-sc-green text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]">
                      <Phone size={15} /> <span className="truncate">{phone}</span>
                    </a>
                  )}
                  {!isPast && (
                    <>
                      <button type="button" onClick={() => copy(c.code, c.id)} aria-label="Copy code" className={cn("h-10 rounded-full bg-black/[0.05] text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]", phone ? "w-10" : "flex-1")}>
                        {copied === c.id ? <Check size={15} className="text-sc-green" /> : <Copy size={15} />} {!phone && (copied === c.id ? "Copied" : "Copy")}
                      </button>
                      {!c.booking_id && (
                        <button type="button" onClick={() => share(c)} className="flex-1 h-10 rounded-full bg-sc-ink text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 active:scale-[0.98]">
                          <Share2 size={15} /> Share
                        </button>
                      )}
                      {!c.booking_id && (
                        <button type="button" onClick={() => setRelease(c)} aria-label="Release this slot" className="w-10 h-10 rounded-full bg-black/[0.05] inline-flex items-center justify-center active:scale-[0.98]">
                          <X size={16} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-[360px] max-w-[calc(100%-2rem)] p-5 gap-4">
          {generated ? (
            <div className="flex flex-col items-center text-center gap-3 pt-2">
              <span className="w-14 h-14 rounded-[20px] bg-sc-green/10 text-sc-green flex items-center justify-center"><Check size={26} strokeWidth={2.6} /></span>
              <DialogTitle className="text-center">Slot held</DialogTitle>
              <DialogDescription className="text-center">
                {new Date(`${generated.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, {formatTime12(generated.start)} to {formatTime12(generated.end)} is now blocked on your calendar. Share the code with the organiser.
              </DialogDescription>
              <span className="w-full rounded-2xl bg-sc-bg py-4 text-[30px] font-extrabold tracking-[0.3em] font-mono">{generated.code}</span>
              <div className="w-full flex gap-2">
                <button type="button" onClick={() => copy(generated.code, "new")} className={cn(modalCancel, "flex-1 px-3")}>
                  {copied === "new" ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
                </button>
                <button type="button" onClick={() => share({ code: generated.code, match_date: generated.date, start_time: generated.start, end_time: generated.end })} className={cn(modalAction, "flex-1 px-3")}>
                  <Share2 size={16} /> Share
                </button>
              </div>
              <button type="button" onClick={close} className="text-[14px] font-bold text-sc-ink3 py-1">Done</button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Hold a slot</DialogTitle>
                <DialogDescription>Pick the time to block. You get a code to share with the organiser.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 min-w-0">
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[12.5px] font-bold text-sc-ink2 inline-flex items-center gap-1.5"><CalendarDays size={14} /> Date</span>
                  <input type="date" value={form.match_date} min={today} onChange={(e) => { setFormError(null); setForm({ ...form, match_date: e.target.value < today ? today : e.target.value }); }} className={field} />
                </label>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[12.5px] font-bold text-sc-ink2">Starts</span>
                  <TimeInput value={form.start_time} onChange={(v) => { setFormError(null); setForm({ ...form, start_time: v }); }} placeholder="01:00 PM" />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-[12.5px] font-bold text-sc-ink2">Ends</span>
                  <TimeInput value={form.end_time} onChange={(v) => { setFormError(null); setForm({ ...form, end_time: v }); }} placeholder="03:00 PM" />
                </div>
                {durationLabel(form.start_time, form.end_time) && (
                  <span className="text-[12.5px] font-semibold text-sc-ink3 inline-flex items-center gap-1.5"><Timer size={13} /> {durationLabel(form.start_time, form.end_time)}</span>
                )}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_recurring: !form.is_recurring })}
                  className="flex items-center justify-between gap-3 rounded-xl bg-sc-bg px-3.5 h-12"
                  aria-pressed={form.is_recurring}
                >
                  <span className="text-[14px] font-bold inline-flex items-center gap-2"><Repeat size={16} /> Repeats</span>
                  <span className={cn("w-11 h-6 rounded-full p-0.5 transition-colors", form.is_recurring ? "bg-sc-green" : "bg-black/15")}>
                    <span className={cn("block w-5 h-5 rounded-full bg-white shadow transition-transform", form.is_recurring && "translate-x-5")} />
                  </span>
                </button>
                {form.is_recurring && (
                  <div className="flex flex-col gap-2.5">
                    <Segmented
                      options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]}
                      value={form.recurring_frequency as any}
                      onChange={(v) => setForm({ ...form, recurring_frequency: v as string })}
                    />
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-bold text-sc-ink2">How many times</span>
                      <input type="number" inputMode="numeric" min="1" max="52" value={form.recurring_occurrences} onChange={(e) => setForm({ ...form, recurring_occurrences: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} placeholder="4" className={cn(field, "w-24 text-center")} />
                    </label>
                  </div>
                )}
                {formError && <p className="m-0 text-[13px] font-semibold text-[#B91C1C]">{formError}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={close} className={cn(modalCancel, "flex-1 px-3")}>Cancel</button>
                <button type="button" onClick={create} disabled={loading} className={cn(modalAction, "flex-1 px-3")}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Get code"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!release}
        onOpenChange={(v) => !v && setRelease(null)}
        icon={X}
        tone="danger"
        title="Release this slot?"
        description="The code stops working and the time opens up for bookings again."
        confirmLabel="Release slot"
        cancelLabel="Keep it"
        onConfirm={doRelease}
      />
    </div>
  );
};

export default VenueAccessCode;
