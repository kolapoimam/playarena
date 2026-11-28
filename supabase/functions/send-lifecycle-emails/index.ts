// Welcome, engagement and post activity feedback emails.
//
// Runs every 15 minutes from GitHub Actions with the x-cron-secret header.
// A signed in app can also call it with { welcome: true } right after sign up,
// which sends that one user their welcome email at once.
//
// Every email is claimed in email_log first, so no user gets the same email twice,
// even if two runs overlap or a call is repeated.
import { admin, APP_URL, cors, emailShell, esc, json, sendEmail } from "../_shared/notify.ts";
import { unsubscribeUrl } from "../_shared/links.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const DAY = 86_400_000;

type Mode = "football" | "cycling" | "horse_riding" | "paintball";
type Person = {
  id: string;
  email: string;
  created: number;
  lastSignIn: number;
  first: string;
  mode: Mode;
  everJoined: boolean;
  lastActive: number; // last activity date they took part in or ran
  games: number;
  rides: number;
};
type Upcoming = { title: string; when: string; where: string; path: string; kind: "match" | "ride" };

// ---------- helpers ----------

const firstName = (p: any, email: string) => {
  const n = String(p?.nickname || p?.first_name || "").trim().split(/\s+/)[0];
  return n || email.split("@")[0].replace(/[^a-zA-Z]/g, "") || "there";
};

const fmtDate = (d: string) => {
  const x = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return isNaN(x.getTime()) ? String(d) : x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};
const fmtTime = (t?: string | null) => {
  if (!t) return "";
  if (/am|pm/i.test(t)) return t.replace(/^0/, "");
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return isNaN(hr) ? t : `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

function list(items: Upcoming[]) {
  if (!items.length) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="panel" style="margin:20px 0 0;background:#F4F7F5;border-radius:14px">
${items.map((u, i) => `<tr><td style="padding:${i ? "0" : "14px"} 18px 12px">
<a href="${APP_URL}${u.path}" class="link" style="color:#0E1411;text-decoration:none"><span class="text" style="display:block;font-size:15px;font-weight:700;color:#0E1411">${esc(u.title)}</span>
<span class="muted" style="display:block;font-size:13px;color:#5B6660">${esc([u.when, u.where].filter(Boolean).join(" · "))}</span></a></td></tr>`).join("")}
<tr><td style="height:2px;line-height:2px;font-size:2px">&nbsp;</td></tr></table>`;
}

const p = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
const sportWord = (m: Mode) => (m === "cycling" ? "ride" : "game");

// ---------- the emails, each with its own job ----------

type Built = { subject: string; title: string; preheader: string; body: string; cta: { label: string; path: string } };

function welcome(u: Person, up: Upcoming[]): Built {
  return {
    subject: `Welcome to SportCliq, ${u.first}`,
    title: `Welcome to SportCliq, ${u.first}`,
    preheader: "Find a game, join a ride, book a pitch. It all starts here.",
    body:
      p("We are really glad you are here. SportCliq is where people in Nigeria find a game, join a ride and book a pitch without the endless group chat back and forth.") +
      p("<b>Here is what you can do today</b>") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px">
${[
  ["Join a match", "Pick a football game near you, pay in the app and get a QR ticket."],
  ["Ride with a crew", "Group rides with a planned route, a start point and people to ride with."],
  ["Organise your own", "Run a match or host a ride. SportCliq handles sign ups, payments and check in."],
  ["Book a venue", "See pitches, open slots and prices, then book in a few taps."],
].map(([h, d]) => `<tr><td style="padding:0 0 12px"><span class="text" style="display:block;font-size:15px;font-weight:700;color:#0E1411">${h}</span><span class="muted" style="display:block;font-size:14px;color:#5B6660">${d}</span></td></tr>`).join("")}
</table>` +
      (up.length ? p("<b>Coming up soon</b>") + list(up) : "") +
      `<p style="margin:18px 0 0">See you out there,<br>The SportCliq team</p>`,
    cta: { label: "Explore SportCliq", path: "/" },
  };
}

function engagement(kind: string, u: Person, up: Upcoming[]): Built | null {
  const w = sportWord(u.mode);
  const where = u.mode === "cycling" ? "/cycling-activities" : "/matches";
  switch (kind) {
    case "day_7":
      return {
        subject: `${u.first}, your first ${w} is one tap away`,
        title: `Ready for your first ${w}?`,
        preheader: "A few picks to get you started this week.",
        body: p(`You joined SportCliq a week ago. The quickest way to see what it is about is to join one ${w}. It takes a minute, and you get your ticket straight away.`) +
          (up.length ? p("<b>A few picks for this week</b>") + list(up) : p("Nothing close to you yet? Organise one and we will help you fill it.")),
        cta: { label: u.mode === "cycling" ? "Find a ride" : "Find a match", path: where },
      };
    case "day_21":
      return {
        subject: "Here is what is happening on SportCliq",
        title: "There is more going on than you think",
        preheader: "New matches, rides and venues keep landing every week.",
        body: p(`Hi ${u.first}, quick catch up. Organisers add new matches and rides every week, and more venues now take bookings straight from the app.`) +
          (up.length ? p("<b>On the calendar</b>") + list(up) : "") +
          p("Tap any one to see who is going, the price and the spots left."),
        cta: { label: "See what is on", path: "/" },
      };
    case "day_30":
      return {
        subject: "Try something new this month",
        title: "Fancy something different?",
        preheader: u.mode === "cycling" ? "Ride a new route, or try a football match." : "Try a group ride, or a new pitch in your city.",
        body: p(u.mode === "cycling"
          ? `${u.first}, a month in. How about a route you have never ridden, or a five a side game with a new crew?`
          : `${u.first}, a month in. How about a group ride this weekend, or a match at a pitch you have never played at?`) +
          (up.length ? list(up) : "") +
          p("New people, new places, same easy sign up."),
        cta: { label: "Discover activities", path: "/activities" },
      };
    case "day_90":
      return {
        subject: `We have missed you, ${u.first}`,
        title: "Your next game is waiting",
        preheader: "Fresh matches and rides near you, with spots still open.",
        body: p(`It has been a while since we saw you, ${u.first}. A lot has changed. You can now pay in the app, carry your ticket on your phone and see your stats after each game.`) +
          (up.length ? p("<b>Spots open right now</b>") + list(up) : "") +
          p("Jump back in whenever you are ready."),
        cta: { label: "Jump back in", path: where },
      };
    case "day_120":
      return {
        subject: "The squad is still playing without you",
        title: "Here is what you have been missing",
        preheader: "Games every week, crews to ride with, pitches to book.",
        body: p(`${u.first}, while you have been away people have kept playing, riding and booking on SportCliq every week.`) +
          (up.length ? list(up) : "") +
          p("One game is all it takes to get back in the rhythm."),
        cta: { label: u.mode === "cycling" ? "Find a ride" : "Find a game", path: where },
      };
    case "day_180":
      return {
        subject: `${u.first}, let us get you back out there`,
        title: "Six months, let us fix that",
        preheader: u.games + u.rides > 0 ? "Your profile and history are right where you left them." : "Your account is ready whenever you are.",
        body: p(u.games + u.rides > 0
          ? `You have ${u.games ? `${u.games} match${u.games === 1 ? "" : "es"}` : ""}${u.games && u.rides ? " and " : ""}${u.rides ? `${u.rides} ride${u.rides === 1 ? "" : "s"}` : ""} on SportCliq. Your history and badges are right where you left them.`
          : "Your account is ready and waiting. Joining takes a minute and you get your ticket straight away.") +
          (up.length ? p("<b>Picked for you</b>") + list(up) : "") +
          p("Reply to this email if something stopped you from playing. We read every reply."),
        cta: { label: "Come back to SportCliq", path: "/" },
      };
    case "day_365":
      return {
        subject: `Happy SportCliq anniversary, ${u.first}`,
        title: "One year with SportCliq",
        preheader: "Thank you for being part of the community.",
        body: p(`It has been a whole year since you joined SportCliq, ${u.first}. Thank you for being part of it.`) +
          (u.games + u.rides > 0 ? p(`This year you took part in ${u.games + u.rides} activit${u.games + u.rides === 1 ? "y" : "ies"}. Here is to many more.`) : p("Here is to your first game of the new year.")) +
          p("<b>New on SportCliq</b><br>Group rides, venue booking, QR tickets and match reports. Take a look at what is on.") +
          (up.length ? list(up) : ""),
        cta: { label: "See what is new", path: "/" },
      };
  }
  return null;
}

// Day N email goes out between day N and day N plus 4, so a missed run still catches up
const STAGES: { kind: string; day: number; quietDays: number; needsNoActivity?: boolean }[] = [
  { kind: "day_7", day: 7, quietDays: 0, needsNoActivity: true },
  { kind: "day_21", day: 21, quietDays: 14 },
  { kind: "day_30", day: 30, quietDays: 14 },
  { kind: "day_90", day: 90, quietDays: 30 },
  { kind: "day_120", day: 120, quietDays: 30 },
  { kind: "day_180", day: 180, quietDays: 30 },
  { kind: "day_365", day: 365, quietDays: -1 },
];

// ---------- data ----------

async function allUsers(db: SupabaseClient) {
  const out: any[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    out.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return out;
}

async function people(db: SupabaseClient, users: any[]): Promise<Person[]> {
  const ids = users.map((u) => u.id);
  if (!ids.length) return [];
  const chunk = <T,>(a: T[], n = 300) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  const prof = new Map<string, any>();
  const acts = new Map<string, { last: number; games: number; rides: number }>();
  const bump = (id: string, date: string | null | undefined, kind: "g" | "r") => {
    const a = acts.get(id) || { last: 0, games: 0, rides: 0 };
    const t = date ? new Date(String(date).slice(0, 10) + "T12:00:00").getTime() : 0;
    if (t && t <= Date.now()) a.last = Math.max(a.last, t);
    if (kind === "g") a.games++; else a.rides++;
    acts.set(id, a);
  };
  for (const part of chunk(ids)) {
    const [pr, jm, om, jc, hc] = await Promise.all([
      db.from("profiles").select("*").in("id", part),
      db.from("user_joined_matches").select("user_id, matches(match_date)").in("user_id", part),
      db.from("user_organized_matches").select("user_id, matches(match_date)").in("user_id", part),
      db.from("user_joined_cycling").select("user_id, cycling_event:cycling_events(event_date)").in("user_id", part),
      db.from("user_hosted_cycling").select("user_id, cycling_event:cycling_events(event_date)").in("user_id", part),
    ]);
    (pr.data || []).forEach((r: any) => prof.set(r.id, r));
    (jm.data || []).forEach((r: any) => bump(r.user_id, r.matches?.match_date, "g"));
    (om.data || []).forEach((r: any) => bump(r.user_id, r.matches?.match_date, "g"));
    (jc.data || []).forEach((r: any) => bump(r.user_id, r.cycling_event?.event_date, "r"));
    (hc.data || []).forEach((r: any) => bump(r.user_id, r.cycling_event?.event_date, "r"));
  }
  return users
    .filter((u) => u.email && !u.banned_until)
    .map((u) => {
      const pr = prof.get(u.id);
      const a = acts.get(u.id) || { last: 0, games: 0, rides: 0 };
      const saved = pr?.preferred_mode as Mode | undefined;
      const mode: Mode = saved || (a.rides > a.games ? "cycling" : "football");
      return {
        id: u.id, email: u.email, created: new Date(u.created_at).getTime(),
        lastSignIn: u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0,
        first: firstName(pr, u.email), mode, everJoined: a.games + a.rides > 0, lastActive: a.last, games: a.games, rides: a.rides,
      };
    });
}

async function upcoming(db: SupabaseClient) {
  const today = new Date(Date.now() + 3600_000).toISOString().slice(0, 10); // Lagos is UTC+1
  const [m, r] = await Promise.all([
    db.from("matches").select("title, slug, match_date, match_time, is_private, cancellation_status, venue:venues(name, city)")
      .gte("match_date", today).order("match_date").limit(20),
    db.from("cycling_events").select("title, slug, event_date, start_time, cancellation_status, start_landmark:landmarks!start_landmark_id(name)")
      .gte("event_date", today).order("event_date").limit(20),
  ]);
  const matches: Upcoming[] = (m.data || []).filter((x: any) => !x.is_private && !x.cancellation_status).map((x: any) => ({
    kind: "match", title: x.title, path: `/match/${x.slug}`, when: `${fmtDate(x.match_date)}${x.match_time ? `, ${fmtTime(x.match_time)}` : ""}`,
    where: [x.venue?.name, x.venue?.city].filter(Boolean).join(", "),
  }));
  const rides: Upcoming[] = (r.data || []).filter((x: any) => !x.cancellation_status).map((x: any) => ({
    kind: "ride", title: x.title, path: `/cycling/${x.slug}`, when: `${fmtDate(x.event_date)}${x.start_time ? `, ${fmtTime(x.start_time)}` : ""}`,
    where: x.start_landmark?.name ? `Starts at ${x.start_landmark.name}` : "",
  }));
  return { matches, rides };
}

const pick = (u: Person, up: { matches: Upcoming[]; rides: Upcoming[] }) => {
  const first = u.mode === "cycling" ? up.rides : up.matches;
  const other = u.mode === "cycling" ? up.matches : up.rides;
  return [...first.slice(0, 3), ...other.slice(0, first.length >= 3 ? 0 : 3 - first.length)].slice(0, 3);
};

// ---------- sending, once per user per email ----------

async function claim(db: SupabaseClient, userId: string, kind: string, ref = "") {
  const { error } = await db.from("email_log").insert({ user_id: userId, kind, ref, status: "sending" });
  if (!error) return true;
  if (/duplicate|unique/i.test(error.message)) return false;
  throw error;
}

async function deliver(db: SupabaseClient, u: { id: string; email: string }, kind: string, ref: string, b: Built, list: "engagement" | "feedback" | null) {
  if (!(await claim(db, u.id, kind, ref))) return "skipped";
  const unsub = list ? await unsubscribeUrl(u.id, list) : undefined;
  const html = emailShell(b.title, b.body, b.cta, { preheader: b.preheader, unsubscribeUrl: unsub });
  const res = await sendEmail(u.email, b.subject, html, `${kind}:${ref}:${u.id}`, { tags: [{ name: "kind", value: kind }], unsubscribeUrl: unsub });
  // Stay under the email provider's rate limit
  await new Promise((r) => setTimeout(r, 600));
  if (res.ok) {
    let id: string | undefined;
    try { id = JSON.parse((res as any).body || "{}").id; } catch { /* ignore */ }
    await db.from("email_log").update({ status: "sent", provider_id: id ?? null }).eq("user_id", u.id).eq("kind", kind).eq("ref", ref);
    return "sent";
  }
  // Let the next run try again
  await db.from("email_log").delete().eq("user_id", u.id).eq("kind", kind).eq("ref", ref).eq("status", "sending");
  return "failed";
}

async function prefsFor(db: SupabaseClient, ids: string[]) {
  const map = new Map<string, { engagement: boolean; feedback: boolean }>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("email_preferences").select("user_id, engagement, feedback").in("user_id", ids.slice(i, i + 300));
    (data || []).forEach((r: any) => map.set(r.user_id, { engagement: r.engagement !== false, feedback: r.feedback !== false }));
  }
  return map;
}

// ---------- feedback after an activity ends ----------

async function feedbackRun(db: SupabaseClient, prefs: Map<string, { engagement: boolean; feedback: boolean }>, emails: Map<string, Person>) {
  const out = { sent: 0, skipped: 0, failed: 0 };
  const now = Date.now();
  const from = new Date(now - 3 * DAY).toISOString().slice(0, 10);
  const to = new Date(now + 3600_000).toISOString().slice(0, 10);
  const minutes = (t?: string | null) => {
    if (!t) return null;
    const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    if (m[3]) { const pm = m[3].toLowerCase() === "pm"; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
    return h * 60 + parseInt(m[2], 10);
  };
  // Lagos wall clock to a real time
  const at = (date: string, mins: number) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), 0, mins) - 3600_000;
  const ended = (date: string, start?: string | null, end?: string | null, fallback = 120) => {
    const s = minutes(start) ?? 0;
    let e = minutes(end);
    if (e == null || e <= s) e = s + fallback;
    return at(String(date).slice(0, 10), e);
  };

  // Matches that ended more than an hour ago and less than 3 days ago
  const { data: ms } = await db.from("matches")
    .select("id, slug, title, match_date, match_time, end_time, cancellation_status, organizer_name, players(id, confirmation_code, player_status, cancellation_status)")
    .gte("match_date", from).lte("match_date", to);
  for (const m of ms || []) {
    if ((m as any).cancellation_status) continue;
    const end = ended((m as any).match_date, (m as any).match_time, (m as any).end_time);
    if (now < end + 3600_000 || now > end + 3 * DAY) continue;
    const players: any[] = (m as any).players || [];
    const anyCheckedIn = players.some((x) => x.player_status === "Checked In");
    const { data: links } = await db.from("user_joined_matches").select("user_id, player_id").eq("match_id", (m as any).id);
    for (const l of links || []) {
      const pl = players.find((x) => x.id === l.player_id);
      if (!pl || pl.cancellation_status) continue;
      // When the organiser checked people in, only ask those who actually played
      if (anyCheckedIn && pl.player_status !== "Checked In") continue;
      if (prefs.get(l.user_id)?.feedback === false) continue;
      const u = emails.get(l.user_id);
      if (!u) continue;
      const r = await deliver(db, u, "feedback_match", (m as any).id, {
        subject: `How was ${(m as any).title}?`,
        title: `Thanks for playing, ${u.first}`,
        preheader: "Rate the game in 30 seconds and help the next one be even better.",
        body: p(`Thanks for joining <b>${esc((m as any).title)}</b>. How did it go?`) +
          p(`Rate the venue, how ${esc((m as any).organizer_name || "the organiser")} ran the game and the refereeing. Add a suggestion if you have one. It takes about 30 seconds and goes straight to the organiser.`),
        cta: { label: "Rate this match", path: `/feedback?matchSlug=${encodeURIComponent((m as any).slug)}&code=${encodeURIComponent(pl.confirmation_code || "")}` },
      }, "feedback");
      out[r as keyof typeof out]++;
    }
  }

  // Rides, the same way
  const { data: rs } = await db.from("cycling_events")
    .select("id_uuid, slug, title, event_date, start_time, end_time, duration_type, duration_value, cancellation_status, host_name")
    .gte("event_date", from).lte("event_date", to);
  for (const e of rs || []) {
    const ev: any = e;
    if (ev.cancellation_status) continue;
    const v = Number(ev.duration_value) || 0;
    const len = ev.duration_type === "hours" ? v * 60 : ev.duration_type === "minutes" ? v : 180;
    const end = ended(ev.event_date, ev.start_time, ev.end_time, Math.max(30, len || 180));
    if (now < end + 3600_000 || now > end + 3 * DAY) continue;
    const { data: links } = await db.from("user_joined_cycling")
      .select("user_id, attendee:cycling_attendees!user_joined_cycling_attendee_id_fkey(id_uuid, confirmation_code, status)")
      .eq("cycling_event_id", ev.id_uuid);
    for (const l of (links as any[]) || []) {
      const a = l.attendee;
      if (!a || /cancel/i.test(String(a.status || ""))) continue;
      if (prefs.get(l.user_id)?.feedback === false) continue;
      const u = emails.get(l.user_id);
      if (!u) continue;
      const r = await deliver(db, u, "feedback_ride", ev.id_uuid, {
        subject: `How was ${ev.title}?`,
        title: `Thanks for riding, ${u.first}`,
        preheader: "Rate the ride in 30 seconds.",
        body: p(`Thanks for riding <b>${esc(ev.title)}</b>. How was it?`) +
          p(`Rate the ride, the route and how ${esc(ev.host_name || "the host")} organised it, and tell us what would make the next one better.`),
        cta: { label: "Rate this ride", path: `/feedback/ride/${encodeURIComponent(ev.slug)}?code=${encodeURIComponent(a.confirmation_code || "")}` },
      }, "feedback");
      out[r as keyof typeof out]++;
    }
  }
  return out;
}

// ---------- entry ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  const db = admin();
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body */ }

  try {
    // A new user's app asks for their own welcome email
    if (body?.welcome) {
      const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      const { data } = await db.auth.getUser(jwt);
      const user = data?.user;
      if (!user?.email) return json(req, { error: "not signed in" }, 401);
      if (Date.now() - new Date(user.created_at).getTime() > 7 * DAY) return json(req, { skipped: "not a new account" });
      const [person] = await people(db, [user]);
      const up = await upcoming(db);
      const result = await deliver(db, person, "welcome", "", welcome(person, pick(person, up)), null);
      return json(req, { welcome: result });
    }

    if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) return json(req, { error: "unauthorised" }, 401);

    const users = await allUsers(db);
    const everyone = await people(db, users);
    const byId = new Map(everyone.map((u) => [u.id, u]));
    const prefs = await prefsFor(db, everyone.map((u) => u.id));
    const up = await upcoming(db);
    const tally: Record<string, number> = {};
    const add = (k: string) => (tally[k] = (tally[k] || 0) + 1);
    const now = Date.now();

    for (const u of everyone) {
      const age = (now - u.created) / DAY;
      // Welcome anyone new who did not get one when they signed up
      if (age <= 3) { add(`welcome_${await deliver(db, u, "welcome", "", welcome(u, pick(u, up)), null)}`); continue; }
      if (prefs.get(u.id)?.engagement === false) continue;
      const stage = STAGES.find((s) => age >= s.day && age < s.day + 4);
      if (!stage) continue;
      // Skip people who already did what the email asks
      if (stage.needsNoActivity && u.everJoined) { add(`${stage.kind}_not_needed`); continue; }
      if (stage.quietDays > 0) {
        const recent = Math.max(u.lastActive, u.lastSignIn);
        if (recent && now - recent < stage.quietDays * DAY) { add(`${stage.kind}_active`); continue; }
      }
      const b = engagement(stage.kind, u, pick(u, up));
      if (b) add(`${stage.kind}_${await deliver(db, u, stage.kind, "", b, "engagement")}`);
    }

    const fb = await feedbackRun(db, prefs, byId);
    return json(req, { users: everyone.length, emails: tally, feedback: fb });
  } catch (e) {
    console.error("lifecycle emails", e);
    return json(req, { error: String((e as Error)?.message || e) }, 500);
  }
});
