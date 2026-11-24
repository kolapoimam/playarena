// Emails a venue when it is booked through SportCliq, and pushes the venue owner.
// The app sends only the booking id. The venue email is read from the database,
// so this function cannot be used to email anyone else.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { admin, cors, emailShell, esc, json, notifyUsers, recent, sendEmail } from "../_shared/notify.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const bookingId = body.booking_id;
    if (!bookingId) return json(req, { error: "booking_id is required" }, 400);

    const db = admin();
    const { data: b } = await db.from("bookings")
      .select("id, venue_id, title, organizer_name, match_date, start_time, end_time, created_at")
      .eq("id", bookingId).maybeSingle();
    if (!b) return json(req, { error: "Booking not found" }, 404);
    if (!recent(b.created_at, 48 * 60)) return json(req, { skipped: "booking is too old to notify" });

    const { data: v } = await db.from("venues").select("id, name, slug, email, user_id").eq("id", b.venue_id).maybeSingle();
    if (!v) return json(req, { error: "Venue not found" }, 404);

    const { data: code } = await db.from("booking_access_codes").select("code").eq("booking_id", b.id).maybeSingle();

    // Who booked: the signed in user if there is one
    let bookerEmail = "";
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data } = await db.auth.getUser(jwt);
      bookerEmail = data?.user?.email || "";
    }

    const time = (t?: string | null) => String(t || "").slice(0, 5);
    const rows: [string, string][] = [
      ["Venue", v.name],
      ["Date", String(b.match_date || "")],
      ["Time", `${time(b.start_time)} to ${time(b.end_time)}`],
      ["Booked by", b.organizer_name || bookerEmail || "A SportCliq user"],
      ...(bookerEmail ? [["Contact", bookerEmail] as [string, string]] : []),
      ...(code?.code ? [["Access code", code.code] as [string, string]] : []),
    ];
    const table = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 4px;border-collapse:collapse">${rows
      .map(([k, val]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #E5E7EB;color:#6B7280;width:40%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #E5E7EB;font-weight:bold;color:#0E1411;text-align:right">${esc(val)}</td></tr>`)
      .join("")}</table>`;

    const out: Record<string, unknown> = {};
    if (v.email) {
      out.email = await sendEmail(
        v.email,
        `New booking at ${v.name}`,
        emailShell(
          `New booking at ${v.name}`,
          `<p>Good news. Your venue has a new booking through SportCliq.</p>${table}<p>The organiser will share the access code with you when they arrive.</p>`,
          { label: "See your bookings", path: `/profile/my-bookings` },
        ),
        `booking-email:${b.id}`,
      );
    } else {
      out.email = { skipped: "venue has no email" };
    }

    out.push = await notifyUsers(db, [v.user_id], "booking_confirmation",
      `New booking at ${v.name}`,
      `${b.title || "A match"} on ${b.match_date}, ${time(b.start_time)} to ${time(b.end_time)}.`,
      `/profile/my-bookings`, `booking:${b.id}`);

    return json(req, out);
  } catch (e) {
    console.error("send-booking-notification failed", e);
    return json(req, { error: "Failed to send booking notification" }, 500);
  }
});
