import { supabase } from "@/integrations/supabase/client";
import { activeOccurrences } from "@/lib/codeSchedule";

/** Minutes after midnight for "16:00", "16:00:00", "4:00 PM" or "04:00 PM". */
export function toMinutes(t?: string | null): number | null {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const p = m[3]?.toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export type Busy = { start: number; end: number; source: "booking" | "code"; day: string };

/**
 * Everything that holds time at a venue between two dates: bookings, and booking
 * codes the venue created, including every date a repeating code covers.
 * A code keeps its time until the venue cancels or stops it.
 */
export async function busyBetween(venueId: string, from: string, to: string): Promise<Busy[] | null> {
  const [b, bac, vac] = await Promise.all([
    supabase.from("bookings").select("match_date, start_time, end_time, payment_status").eq("venue_id", venueId).gte("match_date", from).lte("match_date", to),
    supabase.from("booking_access_codes").select("*").eq("venue_id", venueId).in("status", ["pending", "active"]),
    supabase.from("venue_access_codes").select("match_date, start_time, end_time, status").eq("venue_id", venueId).gte("match_date", from).lte("match_date", to).in("status", ["pending", "active"]),
  ]);
  if (b.error && bac.error) return null;
  const out: Busy[] = [];
  const add = (day: string, st: any, en: any, source: Busy["source"]) => {
    const s = toMinutes(st), e = toMinutes(en);
    if (s != null && e != null && e > s && day >= from && day <= to) out.push({ start: s, end: e, source, day });
  };
  for (const r of (b.data as any[]) || []) {
    if (/fail|cancel|refund/i.test(String(r.payment_status || ""))) continue;
    add(String(r.match_date).slice(0, 10), r.start_time, r.end_time, "booking");
  }
  for (const r of (bac.data as any[]) || []) for (const day of activeOccurrences(r)) add(day, r.start_time, r.end_time, "code");
  for (const r of (vac.data as any[]) || []) add(String(r.match_date).slice(0, 10), r.start_time, r.end_time, "code");
  return out;
}

export async function busySlots(venueId: string, day: string): Promise<Busy[] | null> {
  return busyBetween(venueId, day, day);
}

export const overlaps = (busy: Busy[], start: number, end: number, day?: string) =>
  busy.some((x) => (!day || x.day === day) && start < x.end && end > x.start);

/** True when the day and start time have not passed yet, in the phone's own time. */
export function notInPast(day: string, start: string, graceMinutes = 0) {
  const s = toMinutes(start);
  if (s == null) return false;
  const [y, mo, d] = day.split("-").map(Number);
  const at = new Date(y, mo - 1, d, Math.floor(s / 60), s % 60);
  return at.getTime() >= Date.now() + graceMinutes * 60000;
}
