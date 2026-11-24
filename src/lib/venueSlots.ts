import { supabase } from "@/integrations/supabase/client";

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

export type Busy = { start: number; end: number; source: "booking" | "code" };

/**
 * Everything that already holds time at a venue on a day: bookings, and booking
 * codes the venue created, used or not. A code holds its time until the venue
 * releases it, because it often stands for a booking taken offline.
 */
export async function busySlots(venueId: string, day: string): Promise<Busy[] | null> {
  const [b, bac, vac] = await Promise.all([
    supabase.from("bookings").select("start_time, end_time, payment_status").eq("venue_id", venueId).eq("match_date", day),
    supabase.from("booking_access_codes").select("start_time, end_time, status").eq("venue_id", venueId).eq("match_date", day).in("status", ["pending", "active"]),
    supabase.from("venue_access_codes").select("start_time, end_time, status").eq("venue_id", venueId).eq("match_date", day).in("status", ["pending", "active"]),
  ]);
  if (b.error && bac.error) return null;
  const out: Busy[] = [];
  const push = (rows: any[] | null, source: Busy["source"], skip?: (r: any) => boolean) => {
    for (const r of rows || []) {
      if (skip?.(r)) continue;
      const s = toMinutes(r.start_time);
      const e = toMinutes(r.end_time);
      if (s != null && e != null && e > s) out.push({ start: s, end: e, source });
    }
  };
  push(b.data as any[], "booking", (r) => /fail|cancel|refund/i.test(String(r.payment_status || "")));
  push(bac.data as any[], "code");
  push(vac.data as any[], "code");
  return out;
}

export const overlaps = (busy: Busy[], start: number, end: number) => busy.some((x) => start < x.end && end > x.start);

/** True when the day and start time have not passed yet, in the phone's own time. */
export function notInPast(day: string, start: string, graceMinutes = 0) {
  const s = toMinutes(start);
  if (s == null) return false;
  const [y, mo, d] = day.split("-").map(Number);
  const at = new Date(y, mo - 1, d, Math.floor(s / 60), s % 60);
  return at.getTime() >= Date.now() + graceMinutes * 60000;
}
