import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OneSignal from "https://esm.sh/@onesignal/node-onesignal@2.0.0-beta2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const oneSignalClient = new OneSignal.DefaultApi(
  new OneSignal.Configuration({
    authMethods: {
      app_key: {
        token: oneSignalApiKey,
      },
    },
  })
);

serve(async (req) => {
  try {
    const { record } = await req.json();
    const { event_type, user_id, message, data } = record;

    const { data: notificationSettings, error: settingsError } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user_id)
      .eq("event_type", event_type)
      .eq("is_enabled", true)
      .single();

    if (settingsError || !notificationSettings) {
      return new Response(
        JSON.stringify({ message: "No matching notification settings found" }),
        { status: 200 }
      );
    }

    if (notificationSettings.notification_type === "push") {
      const notification = new OneSignal.Notification();
      notification.app_id = oneSignalAppId;
      notification.contents = { en: message };
      notification.filters = [
        { field: "tag", key: "user_id", relation: "=", value: user_id },
      ];
      if (data?.match_id) {
        notification.data = { match_id: data.match_id };
      }

      await oneSignalClient.createNotification(notification);
    }

    return new Response(
      JSON.stringify({ message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
