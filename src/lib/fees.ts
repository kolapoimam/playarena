import { supabase } from "@/integrations/supabase/client";

/**
 * SportCliq platform fees, as stated in the Terms and the Guides.
 * Every paid activity (matches, rides and any we add later) is free for the first 2
 * an organiser runs, then 5% goes to the platform. Venues get their first paid booking
 * free, then pay 10% on each paid booking.
 * Change the numbers here and every cashout screen follows.
 */
export const FEES = {
  activityRate: 0.05,
  activityFreeCount: 2,
  venueRate: 0.1,
  venueFreeBookings: 1,
};

export type Payout = {
  /** money collected before fees */
  gross: number;
  /** the platform's share */
  fee: number;
  /** percentage used, 0 when the activity is inside the free allowance */
  rate: number;
  /** cashouts already requested, in review or paid */
  requested: number;
  /** what the organiser, host or venue can still cash out */
  available: number;
  /** why the rate is what it is, in plain words */
  note: string;
};

// Round the fee up so rounding never costs the platform money
const feeOf = (gross: number, rate: number) => Math.ceil(Math.max(0, gross) * rate);

export function payout(gross: number, rate: number, requested: number, note: string): Payout {
  const fee = feeOf(gross, rate);
  return { gross, fee, rate, requested, available: Math.max(0, Math.floor(gross - fee - requested)), note };
}

/** The organiser's first free paid activities, matches and rides counted together. */
async function firstPaid(userId: string): Promise<Set<string>> {
  const n = FEES.activityFreeCount;
  const [m, r] = await Promise.all([
    supabase.from("matches").select("id, created_at").eq("user_id", userId).eq("is_paid", true).order("created_at", { ascending: true }).limit(n),
    supabase.from("cycling_events").select("id_uuid, created_at").eq("host_id", userId).eq("is_free", false).order("created_at", { ascending: true }).limit(n),
  ]);
  const all = [
    ...((m.data as any[]) || []).map((x) => ({ id: String(x.id), at: x.created_at })),
    ...((r.data as any[]) || []).map((x) => ({ id: String(x.id_uuid), at: x.created_at })),
  ].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return new Set(all.slice(0, n).map((x) => x.id));
}

const charged = () => ({ rate: FEES.activityRate, note: `${FEES.activityRate * 100}% platform fee` });
const free = () => ({ rate: 0, note: `No platform fee on your first ${FEES.activityFreeCount} paid activities` });

/** Fee rate for a paid match. */
export async function organiserRate(matchId: string): Promise<{ rate: number; note: string }> {
  const { data: m } = await supabase.from("matches").select("id, user_id").eq("id", matchId).limit(1);
  const owner = (m as any[])?.[0]?.user_id;
  if (!owner) return charged();
  return (await firstPaid(owner)).has(String(matchId)) ? free() : charged();
}

/** Fee rate for a paid ride. */
export async function hostRate(eventId: string, hostId?: string | null): Promise<{ rate: number; note: string }> {
  if (!hostId) return charged();
  return (await firstPaid(hostId)).has(String(eventId)) ? free() : charged();
}

/** Venue earnings after the referral fee and earlier cashouts. */
export async function venuePayout(venueId: string): Promise<Payout | null> {
  const [paid, out] = await Promise.all([
    supabase.from("bookings").select("amount, created_at").eq("venue_id", venueId).eq("payment_status", "paid").order("created_at", { ascending: true }),
    supabase.from("venue_booking_cashout").select("amount, status").eq("venue_id", venueId).in("status", ["Review", "Processed", "Successful"]),
  ]);
  if (paid.error || out.error) return null;
  const gross = ((paid.data as any[]) || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const requested = ((out.data as any[]) || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  // the first paid booking carries no fee, every later one carries the venue rate
  const rows = (paid.data as any[]) || [];
  const freeAmount = rows.slice(0, FEES.venueFreeBookings).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const fee = Math.ceil(Math.max(0, gross - freeAmount) * FEES.venueRate);
  const note = rows.length <= FEES.venueFreeBookings ? "Your first booking has no fee" : `${FEES.venueRate * 100}% fee after your first booking`;
  return { gross, fee, rate: rows.length <= FEES.venueFreeBookings ? 0 : FEES.venueRate, requested, available: Math.max(0, Math.floor(gross - fee - requested)), note };
}
