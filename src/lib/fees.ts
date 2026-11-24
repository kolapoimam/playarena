import { supabase } from "@/integrations/supabase/client";

/**
 * SportCliq platform fees, as stated in the Terms and the Guides.
 * Organisers and ride hosts keep everything on their first 5 paid activities,
 * then 2% goes to the platform. Venues pay a 10% referral fee on every paid booking.
 * Change the numbers here and every cashout screen follows.
 */
export const FEES = {
  organiserRate: 0.02,
  organiserFreeCount: 5,
  hostRate: 0.02,
  hostFreeCount: 5,
  venueRate: 0.1,
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

/** Is this match one of the organiser's first free paid matches? */
export async function organiserRate(matchId: string): Promise<{ rate: number; note: string }> {
  const charged = { rate: FEES.organiserRate, note: `${FEES.organiserRate * 100}% platform fee` };
  const { data: m } = await supabase.from("matches").select("id, user_id").eq("id", matchId).limit(1);
  const owner = (m as any[])?.[0]?.user_id;
  if (!owner) return charged;
  const { data: firsts } = await supabase
    .from("matches")
    .select("id")
    .eq("user_id", owner)
    .eq("is_paid", true)
    .order("created_at", { ascending: true })
    .limit(FEES.organiserFreeCount);
  return ((firsts as any[]) || []).some((r) => r.id === matchId)
    ? { rate: 0, note: `No platform fee on your first ${FEES.organiserFreeCount} paid matches` }
    : charged;
}

/** Is this ride one of the host's first free paid rides? */
export async function hostRate(eventId: string, hostId?: string | null): Promise<{ rate: number; note: string }> {
  const charged = { rate: FEES.hostRate, note: `${FEES.hostRate * 100}% platform fee` };
  if (!hostId) return charged;
  const { data: firsts } = await supabase
    .from("cycling_events")
    .select("id_uuid")
    .eq("host_id", hostId)
    .eq("is_free", false)
    .order("created_at", { ascending: true })
    .limit(FEES.hostFreeCount);
  return ((firsts as any[]) || []).some((r) => r.id_uuid === eventId)
    ? { rate: 0, note: `No platform fee on your first ${FEES.hostFreeCount} paid rides` }
    : charged;
}

/** Venue earnings after the referral fee and earlier cashouts. */
export async function venuePayout(venueId: string): Promise<Payout | null> {
  const [paid, out] = await Promise.all([
    supabase.from("bookings").select("amount").eq("venue_id", venueId).eq("payment_status", "paid"),
    supabase.from("venue_booking_cashout").select("amount, status").eq("venue_id", venueId).in("status", ["Review", "Processed", "Successful"]),
  ]);
  if (paid.error || out.error) return null;
  const gross = ((paid.data as any[]) || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const requested = ((out.data as any[]) || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  return payout(gross, FEES.venueRate, requested, `${FEES.venueRate * 100}% referral fee on bookings`);
}
