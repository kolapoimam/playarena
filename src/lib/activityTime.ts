import { toMinutes } from "@/lib/venueSlots";

/**
 * When an activity starts and ends, read as local Lagos wall clock time.
 * People can join right up to the end, so a live activity is still open.
 */
const at = (date: string, minutes: number) => {
  const [y, m, d] = String(date).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
};

export function matchWindow(m: { match_date: string; match_time?: string | null; start_time?: string | null; end_time?: string | null }) {
  const s = toMinutes(m.start_time || m.match_time) ?? 0;
  let e = toMinutes(m.end_time);
  if (e == null || e <= s) e = s + 120;
  return { start: at(m.match_date, s), end: at(m.match_date, e) };
}

export function rideWindow(r: { event_date: string; start_time?: string | null; end_time?: string | null; duration_type?: string | null; duration_value?: number | null }) {
  const s = toMinutes(r.start_time) ?? 0;
  let e = toMinutes(r.end_time);
  if (e == null || e <= s) {
    const v = Number(r.duration_value) || 0;
    const mins = r.duration_type === "hours" ? v * 60 : r.duration_type === "minutes" ? v : 180;
    e = s + Math.max(30, mins || 180);
  }
  return { start: at(r.event_date, s), end: at(r.event_date, e) };
}

export function phase(w: { start: Date; end: Date }) {
  const now = Date.now();
  return { isStarted: now >= w.start.getTime() && now < w.end.getTime(), isEnded: now >= w.end.getTime() };
}

/** Refund rule for players and riders who cancel a paid spot. */
export const FREE_CANCEL_HOURS = 12;
export function refundShare(start: Date) {
  const hours = (start.getTime() - Date.now()) / 36e5;
  return hours >= FREE_CANCEL_HOURS ? 1 : 0.5;
}
