// Reminds players and riders about an hour before their match or ride starts.
// A GitHub Action calls this every 15 minutes. Each person gets one reminder per
// match or ride, because OneSignal and Resend drop repeats with the same key.
// Only callers with the CRON_SECRET header are allowed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, json, notifyUsers } from "../_shared/notify.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const LAGOS_OFFSET_MIN = 60; // Nigeria is UTC+1 all year
const WINDOW_FROM_MIN = 40; // remind when the start is 40 to 95 minutes away
const WINDOW_TO_MIN = 95;

/** Lagos calendar date as yyyy-mm-dd, shifted by `days`. */
function lagosDate(days = 0) {
  return new Date(Date.now() + LAGOS_OFFSET_MIN * 60_000 + days * 86_400_000).toISOString().slice(0, 10);
}

/** Parses "16:00", "16:00:00", "4:00 PM" or "04:00pm" into minutes after midnight. */
function parseTime(t?: string | null): number | null {
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Start as a UTC timestamp (ms) from a Lagos date and time. */
function startAt(date?: string | null, time?: string | null): number | null {
  const d = String(date || "").slice(0, 10);
  const mins = parseTime(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || mins === null) return null;
  return Date.parse(`${d}T00:00:00Z`) + (mins - LAGOS_OFFSET_MIN) * 60_000;
}

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) return json(req, { error: "Unauthorised" }, 401);

  const db = admin();
  const now = Date.now();
  const inWindow = (ms: number | null) => ms !== null && ms - now >= WINDOW_FROM_MIN * 60_000 && ms - now <= WINDOW_TO_MIN * 60_000;
  const days = [lagosDate(0), lagosDate(1)];
  const report = { matches: 0, rides: 0, people: 0, errors: [] as string[] };

  // Football matches
  try {
    const { data: matches, error } = await db.from("matches")
      .select("id, title, slug, user_id, venue, match_date, match_time, match_start_time, start_time, cancellation_status, status")
      .gte("match_date", days[0]).lte("match_date", days[1] + "T23:59:59");
    if (error) throw error;
    for (const m of matches ?? []) {
      if (m.cancellation_status === true || ["cancelled", "completed", "passed"].includes(String(m.status || ""))) continue;
      const start = startAt(m.match_date, m.match_start_time || m.match_time || m.start_time);
      if (!inWindow(start)) continue;
      const { data: joined } = await db.from("user_joined_matches").select("user_id").eq("match_id", m.id);
      const ids = [...(joined ?? []).map((j) => j.user_id), m.user_id];
      const where = m.venue ? ` at ${m.venue}` : "";
      await notifyUsers(db, ids, "match_playing_time",
        `${m.title} kicks off soon`,
        `Starts at ${clock(start!)}${where}. Have your QR ticket ready and see you on the pitch.`,
        `/match/${m.slug}`, `reminder:match:${m.id}`);
      report.matches++; report.people += new Set(ids.filter(Boolean)).size;
    }
  } catch (e) {
    console.error("match reminders failed", e); report.errors.push(`matches: ${(e as Error).message}`);
  }

  // Group rides
  try {
    const { data: rides, error } = await db.from("cycling_events")
      .select("id_uuid, title, slug, host_id, event_date, start_time, status")
      .gte("event_date", days[0]).lte("event_date", days[1]);
    if (error) throw error;
    for (const r of rides ?? []) {
      if (["cancelled", "completed", "passed"].includes(String(r.status || ""))) continue;
      const start = startAt(r.event_date, r.start_time);
      if (!inWindow(start)) continue;
      const { data: joined } = await db.from("user_joined_cycling").select("user_id").eq("cycling_event_id", r.id_uuid);
      const ids = [...(joined ?? []).map((j) => j.user_id), r.host_id];
      await notifyUsers(db, ids, "match_playing_time",
        `${r.title} rolls out soon`,
        `Starts at ${clock(start!)}. Bring your helmet and water, and get there 10 minutes early.`,
        `/cycling/${r.slug}`, `reminder:ride:${r.id_uuid}`);
      report.rides++; report.people += new Set(ids.filter(Boolean)).size;
    }
  } catch (e) {
    console.error("ride reminders failed", e); report.errors.push(`rides: ${(e as Error).message}`);
  }

  console.log("reminders", JSON.stringify(report));
  return json(req, report);
});
