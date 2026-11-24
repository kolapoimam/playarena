import { supabase } from "@/integrations/supabase/client";

/**
 * Fire and forget. Asks the server to send push and email notifications
 * for something that just happened. Never blocks or breaks the user's flow.
 */
export function notify(
  event: "match_joined" | "ride_joined" | "match_created" | "ride_created",
  ids: Record<string, string | number | undefined | null>,
) {
  supabase.functions
    .invoke("send-notification", { body: { event, ...ids } })
    .then(({ error }) => { if (error) console.warn("Notification not sent", event, error.message); })
    .catch((e) => console.warn("Notification not sent", event, e));
}

export function notifyBooking(bookingId: string | number) {
  supabase.functions
    .invoke("send-booking-notification", { body: { booking_id: bookingId } })
    .then(({ error }) => { if (error) console.warn("Booking notification not sent", error.message); })
    .catch((e) => console.warn("Booking notification not sent", e));
}
