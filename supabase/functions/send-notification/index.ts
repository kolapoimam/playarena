// Edge Function: send-notification
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OneSignal from "https://esm.sh/@onesignal/node-onesignal@2.0.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const onesignalClient = OneSignal.createClient({
  appId: Deno.env.get("ONESIGNAL_APP_ID")!,
  restApiKey: Deno.env.get("ONESIGNAL_API_KEY")!,
});

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { record } = await req.json();
  const { event_type, user_id, message, data } = record;

  const { data: settings, error } = await supabase
    .from("user_notifications")
    .select("*")
    .eq("user_id", user_id)
    .eq("event_type", event_type)
    .eq("is_enabled", true)
    .single();

  if (error || !settings) return new Response("No notification settings found", { status: 404 });

  if (["push", "both"].includes(settings.notification_type) && settings.subscription_id) {
    const notification = {
      contents: { en: message },
      include_player_ids: [settings.subscription_id],
      data,
    };
    await onesignalClient.createNotification(notification);
  }

  if (["email", "both"].includes(settings.notification_type)) {
    // Use Resend to send email (configured earlier)
    // Placeholder: Add email sending logic here
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
