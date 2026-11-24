// Sends SportCliq notifications after something happens in the app.
// The app calls this with an event name and the id of the new record.
// The function looks everything else up itself, so callers cannot choose
// who gets notified or what the message says.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, json, notifyUsers, recent } from "../_shared/notify.ts";

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const x = new Date(d + (d.length === 10 ? "T12:00:00Z" : ""));
  return isNaN(x.getTime()) ? d : x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body */ }

  // Old database webhooks sent { type, table, record }. They are no longer used.
  if (body.type && body.table) return json(req, { ignored: "database webhook payload" });

  const db = admin();
  const event = String(body.event || "");

  try {
    switch (event) {
      // A player joined a match. Tell the organiser, and again when the match is full.
      case "match_joined": {
        const { data: m } = await db.from("matches").select("id, title, slug, user_id, total_slots").eq("id", body.match_id).maybeSingle();
        const { data: p } = await db.from("players").select("id, player_name, number_of_slots, created_at").eq("id", body.player_id).eq("match_id", body.match_id).maybeSingle();
        if (!m || !p) return json(req, { error: "Match or player not found" }, 404);
        if (!recent(p.created_at)) return json(req, { skipped: "not a new join" });

        const { data: all } = await db.from("players").select("number_of_slots, cancellation_status").eq("match_id", m.id);
        const filled = (all ?? []).filter((x) => !x.cancellation_status || x.cancellation_status === "none" || x.cancellation_status === "active")
          .reduce((s, x) => s + (x.number_of_slots || 1), 0);
        const total = m.total_slots || 0;
        const path = `/match/${m.slug}`;
        const out: Record<string, unknown> = {};
        out.registration = await notifyUsers(db, [m.user_id], "match_organizing_registration",
          `New player for ${m.title}`,
          `${p.player_name || "A player"} just joined${(p.number_of_slots || 1) > 1 ? ` with ${p.number_of_slots} slots` : ""}. ${filled} of ${total} spots are filled.`,
          path);
        if (total && filled >= total) {
          out.full = await notifyUsers(db, [m.user_id], "match_organizing_slot_filled",
            `${m.title} is full`, `All ${total} spots are taken. Your squad is ready.`, path);
        }
        return json(req, out);
      }

      // A rider joined a ride. Tell the host, and again when the ride is full.
      case "ride_joined": {
        const { data: ev } = await db.from("cycling_events").select("id_uuid, title, slug, host_id, max_attendees").eq("id_uuid", body.event_id).maybeSingle();
        const { data: a } = await db.from("cycling_attendees").select("id_uuid, attendee_name, created_at").eq("id_uuid", body.attendee_id).eq("cycling_event_id_uuid", body.event_id).maybeSingle();
        if (!ev || !a) return json(req, { error: "Ride or rider not found" }, 404);
        if (!recent(a.created_at)) return json(req, { skipped: "not a new join" });
        const { count } = await db.from("cycling_attendees").select("id_uuid", { count: "exact", head: true }).eq("cycling_event_id_uuid", ev.id_uuid);
        const path = `/cycling/${ev.slug}`;
        const out: Record<string, unknown> = {};
        out.rider = await notifyUsers(db, [ev.host_id], "ride_new_rider",
          `New rider for ${ev.title}`,
          `${a.attendee_name || "A rider"} just joined your ride.${ev.max_attendees ? ` ${count ?? 0} of ${ev.max_attendees} riders so far.` : ""}`,
          path);
        if (ev.max_attendees && (count ?? 0) >= ev.max_attendees) {
          out.full = await notifyUsers(db, [ev.host_id], "ride_full",
            `${ev.title} is full`, `All ${ev.max_attendees} spots are taken. Time to roll.`, path, `ride-full:${ev.id_uuid}`);
        }
        return json(req, out);
      }

      // A ride was created. Tell people who saved its start landmark.
      case "ride_created": {
        const { data: ev } = await db.from("cycling_events").select("id_uuid, title, slug, host_id, event_date, start_landmark_id, created_at").eq("id_uuid", body.event_id).maybeSingle();
        if (!ev) return json(req, { error: "Ride not found" }, 404);
        if (!recent(ev.created_at)) return json(req, { skipped: "not a new ride" });
        if (!ev.start_landmark_id) return json(req, { skipped: "no landmark" });
        const { data: lm } = await db.from("landmarks").select("name").eq("id_uuid", ev.start_landmark_id).maybeSingle();
        const { data: favs } = await db.from("user_landmark_favourites").select("user_id").eq("landmark_id", ev.start_landmark_id).limit(500);
        const ids = (favs ?? []).map((f) => f.user_id).filter((id) => id !== ev.host_id);
        const when = fmtDate(ev.event_date);
        const r = await notifyUsers(db, ids, "landmark_favourite_ride",
          `New ride from ${lm?.name || "a landmark you saved"}`,
          `${ev.title}${when ? ` on ${when}` : ""} is open. Grab a spot before it fills up.`,
          `/cycling/${ev.slug}`, `ride-created:${ev.id_uuid}`);
        return json(req, r);
      }

      // A match was created. Tell the venue owner and people who saved the venue.
      case "match_created": {
        const { data: m } = await db.from("matches").select("id, title, slug, user_id, venue_id, match_date, created_at, is_private").eq("id", body.match_id).maybeSingle();
        if (!m) return json(req, { error: "Match not found" }, 404);
        if (!recent(m.created_at)) return json(req, { skipped: "not a new match" });
        if (!m.venue_id) return json(req, { skipped: "no venue" });
        const { data: v } = await db.from("venues").select("id, name, user_id").eq("id", m.venue_id).maybeSingle();
        if (!v) return json(req, { skipped: "venue not found" });
        const path = `/match/${m.slug}`;
        const when = fmtDate(m.match_date);
        const out: Record<string, unknown> = {};
        if (v.user_id && v.user_id !== m.user_id) {
          out.owner = await notifyUsers(db, [v.user_id], "venue_match_created",
            `New match at ${v.name}`, `${m.title}${when ? ` on ${when}` : ""} has been set up at your venue.`, path);
        }
        if (!m.is_private) {
          const { data: favs } = await db.from("user_venue_favourites").select("user_id").eq("venue_id", v.id).limit(500);
          const ids = (favs ?? []).map((f) => f.user_id).filter((id) => id !== m.user_id && id !== v.user_id);
          out.favourites = await notifyUsers(db, ids, "venue_favourite_match",
            `New game at ${v.name}`, `${m.title}${when ? ` on ${when}` : ""} is open. Grab a spot before it fills up.`, path);
        }
        return json(req, out);
      }

      // A venue was booked. Tell the venue owner in the app.
      case "venue_booked": {
        const { data: b } = await db.from("bookings").select("id, venue_id, title, match_date, start_time, end_time, created_at").eq("id", body.booking_id).maybeSingle();
        if (!b) return json(req, { error: "Booking not found" }, 404);
        if (!recent(b.created_at)) return json(req, { skipped: "not a new booking" });
        const { data: v } = await db.from("venues").select("name, slug, user_id").eq("id", b.venue_id).maybeSingle();
        if (!v) return json(req, { skipped: "venue not found" });
        const r = await notifyUsers(db, [v.user_id], "booking_confirmation",
          `New booking at ${v.name}`,
          `${b.title || "A match"} on ${fmtDate(b.match_date)}, ${String(b.start_time || "").slice(0, 5)} to ${String(b.end_time || "").slice(0, 5)}.`,
          `/profile/my-bookings`);
        return json(req, r);
      }

      default:
        return json(req, { error: "Unknown event" }, 400);
    }
  } catch (e) {
    console.error("send-notification failed", event, e);
    return json(req, { error: "Failed to send notification" }, 500);
  }
});
