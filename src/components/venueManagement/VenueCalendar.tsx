import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Repeat, User } from "lucide-react";
import { EmptyState, Segmented, formatNairaExact, formatTime12 } from "@/components/sc/ui";
import { cn } from "@/lib/utils";

export type VenueBooking = {
  id: string;
  match_id: string | null;
  title: string | null;
  match_date: string | null;
  start_time: string | null;
  end_time: string | null;
  organizer_name: string | null;
  amount: number | null;
  payment_status: string | null;
  slug?: string | null;
  is_recurring?: boolean | null;
  recurring_frequency?: string | null;
  recurring_occurrences?: number | null;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function BookingRow({ b }: { b: VenueBooking }) {
  const navigate = useNavigate();
  const paid = (b.payment_status || "").toLowerCase() === "paid";
  const date = b.match_date ? new Date(`${b.match_date}T00:00:00`) : null;
  return (
    <button
      type="button"
      disabled={!b.slug}
      onClick={() => b.slug && navigate(`/match/${b.slug}`)}
      className="w-full flex items-center gap-3 py-3 text-left disabled:cursor-default"
    >
      <span className="w-12 h-12 rounded-2xl bg-sport-venue-bg text-sport-venue-fg flex flex-col items-center justify-center shrink-0 leading-none">
        <span className="text-[10px] font-bold uppercase">{date ? date.toLocaleDateString("en-GB", { month: "short" }) : ""}</span>
        <span className="text-[18px] font-extrabold">{date ? date.getDate() : "?"}</span>
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[15px] font-bold truncate">{b.title || "Booking"}</span>
        <span className="text-[12.5px] text-sc-ink3 truncate inline-flex items-center gap-1">
          <Clock size={12} className="shrink-0" /> {formatTime12(b.start_time)}{b.end_time ? ` to ${formatTime12(b.end_time)}` : ""}
          {b.organizer_name && <><span className="mx-1">·</span><User size={12} className="shrink-0" /> {b.organizer_name}</>}
        </span>
        {b.is_recurring && (
          <span className="text-[12px] text-sc-ink3 inline-flex items-center gap-1"><Repeat size={12} /> Repeats {b.recurring_frequency} {b.recurring_occurrences ? `× ${b.recurring_occurrences}` : ""}</span>
        )}
      </span>
      <span className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn("h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center", paid ? "bg-sc-green/10 text-sc-green" : "bg-black/[0.05] text-sc-ink2")}>
          {paid ? "Paid" : Number(b.amount) > 0 ? "Unpaid" : "Free"}
        </span>
        {Number(b.amount) > 0 && <span className="text-[12px] font-bold text-sc-ink2">{formatNairaExact(b.amount)}</span>}
      </span>
    </button>
  );
}

/** A month calendar with a dot on every booked day, and the bookings for the chosen day below it. */
export default function VenueCalendar({ bookings }: { bookings: VenueBooking[] }) {
  const today = iso(new Date());
  const [month, setMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [day, setDay] = useState(today);
  const [list, setList] = useState<"upcoming" | "past">("upcoming");

  const byDay = useMemo(() => {
    const m = new Map<string, VenueBooking[]>();
    for (const b of bookings) {
      if (!b.match_date) continue;
      const k = b.match_date.slice(0, 10);
      m.set(k, [...(m.get(k) || []), b]);
    }
    for (const v of m.values()) v.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    return m;
  }, [bookings]);

  const cells = useMemo(() => {
    const first = new Date(month);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1))];
  }, [month]);

  const upcoming = bookings.filter((b) => (b.match_date || "") >= today).sort((a, b) => ((a.match_date || "") + (a.start_time || "")).localeCompare((b.match_date || "") + (b.start_time || "")));
  const past = bookings.filter((b) => (b.match_date || "") < today).sort((a, b) => ((b.match_date || "") + (b.start_time || "")).localeCompare((a.match_date || "") + (a.start_time || "")));
  const dayList = byDay.get(day) || [];
  const shift = (n: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="flex flex-col gap-3.5">
      <div className="bg-white rounded-[24px] p-4">
        <div className="flex items-center justify-between mb-3">
          <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center active:scale-95"><ChevronLeft size={18} /></button>
          <span className="text-[16px] font-extrabold">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
          <button type="button" aria-label="Next month" onClick={() => shift(1)} className="w-9 h-9 rounded-full bg-black/[0.05] flex items-center justify-center active:scale-95"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEK.map((w) => <span key={w} className="text-[11px] font-bold text-sc-ink3 pb-1">{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const k = iso(d);
            const count = byDay.get(k)?.length || 0;
            const sel = k === day;
            const isToday = k === today;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDay(k)}
                className={cn(
                  "relative h-10 rounded-xl text-[14px] font-bold flex flex-col items-center justify-center transition-colors",
                  sel ? "bg-sc-ink text-white" : isToday ? "bg-sport-venue-bg text-sport-venue-fg" : "text-sc-ink active:bg-black/[0.05]",
                )}
              >
                {d.getDate()}
                {count > 0 && (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {Array.from({ length: Math.min(count, 3) }).map((_, j) => (
                      <span key={j} className={cn("w-1 h-1 rounded-full", sel ? "bg-white" : "bg-sport-venue")} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[24px] px-4 pt-4 pb-1">
        <span className="text-[15px] font-extrabold">
          {new Date(`${day}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        {dayList.length ? (
          <div className="divide-y divide-sc-line">{dayList.map((b) => <BookingRow key={b.id} b={b} />)}</div>
        ) : (
          <p className="m-0 py-4 text-[14px] text-sc-ink3">No bookings on this day. The pitch is free.</p>
        )}
      </div>

      <Segmented
        options={[{ value: "upcoming", label: `Upcoming ${upcoming.length ? `(${upcoming.length})` : ""}` }, { value: "past", label: "Past" }]}
        value={list}
        onChange={setList}
      />
      <div className="bg-white rounded-[24px] px-4 py-1">
        {(list === "upcoming" ? upcoming : past).length ? (
          <div className="divide-y divide-sc-line">{(list === "upcoming" ? upcoming : past).slice(0, 30).map((b) => <BookingRow key={b.id} b={b} />)}</div>
        ) : (
          <EmptyState icon={CalendarDays} sport="venue" title={list === "upcoming" ? "No bookings coming up" : "No past bookings yet"} subtitle="Bookings made on SportCliq show here." />
        )}
      </div>
    </div>
  );
}
