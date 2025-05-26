import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
      const oneSignalUrl = `https://onesignal.com/api/v1/notifications`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Basic ${oneSignalApiKey}`,
      };
      const body = {
        app_id: oneSignalAppId,
        contents: { en: message },
        filters: [{ field: "tag", key: "user_id", relation: "=", value: user_id }],
        data: data || {},
      };

      const response = await fetch(oneSignalUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`OneSignal API error: ${await response.text()}`);
      }
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
