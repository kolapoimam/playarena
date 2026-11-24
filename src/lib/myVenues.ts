import { supabase } from "@/integrations/supabase/client";

export type MyVenue = { id: string; name: string; slug: string; city?: string | null; state?: string | null; image_urls?: string[] | null; is_verified?: boolean | null; pin?: string | null };

/**
 * Venues this user manages. A venue counts when it is assigned to the user,
 * or when the user linked it with its access pin. Either one is enough.
 */
export async function getMyVenues(userId: string): Promise<MyVenue[]> {
  const [owned, pins] = await Promise.all([
    supabase.from("venues").select("id, name, slug, city, state, image_urls, is_verified").eq("user_id", userId),
    supabase.from("access_pins").select("pin, venue_id, venues(id, name, slug, city, state, image_urls, is_verified)").eq("user_id", userId),
  ]);
  const byId = new Map<string, MyVenue>();
  for (const v of (owned.data as any[]) || []) byId.set(v.id, { ...v });
  for (const p of (pins.data as any[]) || []) {
    const v = p.venues;
    if (!v) continue;
    byId.set(v.id, { ...(byId.get(v.id) || v), pin: p.pin });
  }
  return [...byId.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function canManageVenue(userId: string, venueId: string) {
  const [venue, pin] = await Promise.all([
    supabase.from("venues").select("user_id").eq("id", venueId).limit(1),
    supabase.from("access_pins").select("id").eq("venue_id", venueId).eq("user_id", userId).limit(1),
  ]);
  return ((venue.data as any[]) || [])[0]?.user_id === userId || ((pin.data as any[]) || []).length > 0;
}

export type LinkResult = { ok: true; venue: MyVenue; already: boolean } | { ok: false; message: string };

/**
 * Links a venue to this user with its access pin.
 * Entering a pin you already linked simply opens the venue again.
 * A pin is only refused when a different account holds it.
 */
export async function linkVenueWithPin(userId: string, raw: string): Promise<LinkResult> {
  const code = raw.trim();
  let { data: pins, error } = await supabase
    .from("access_pins")
    .select("id, venue_id, pin, verified, user_id")
    .eq("pin", code)
    .limit(1);
  if (!error && !(pins || []).length) {
    // codes are sometimes typed in a different case
    ({ data: pins, error } = await supabase.from("access_pins").select("id, venue_id, pin, verified, user_id").ilike("pin", code).limit(1));
  }
  if (error) return { ok: false, message: error.message };
  const pin = (pins || [])[0] as any;
  if (!pin) return { ok: false, message: "That access code does not match any venue. Check it and try again." };

  const { data: venueRows } = await supabase
    .from("venues")
    .select("id, name, slug, city, state, image_urls, is_verified, user_id")
    .eq("id", pin.venue_id)
    .limit(1);
  const venue = ((venueRows as any[]) || [])[0];
  if (!venue) return { ok: false, message: "We could not find the venue for this code." };

  const pinMine = pin.user_id === userId;
  const venueMine = (venue as any).user_id === userId;
  const pinTaken = pin.user_id && !pinMine;
  const venueTaken = (venue as any).user_id && !venueMine;

  if (pinTaken || venueTaken) {
    return { ok: false, message: "This venue is managed by a different SportCliq account. Sign in with that account, or email sportcliqapp@gmail.com to move it to you." };
  }

  const now = new Date().toISOString();
  if (!pinMine || pin.verified !== "true") {
    const { error: e1 } = await supabase.from("access_pins").update({ user_id: userId, verified: "true", updated_at: now }).eq("id", pin.id);
    if (e1) return { ok: false, message: `Could not link this code. ${e1.message}` };
  }
  if (!venueMine) {
    const { error: e2 } = await supabase.from("venues").update({ user_id: userId, updated_at: now }).eq("id", venue.id);
    if (e2) console.warn("Venue owner not updated, the pin link still gives access", e2);
  }
  const { user_id: _omit, ...clean } = venue as any;
  return { ok: true, venue: { ...clean, pin: pin.pin }, already: pinMine || venueMine };
}
