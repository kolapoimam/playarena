import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
const oneSignalApiKey = Deno.env.get("ONESIGNAL_API_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;

    // Map the Supabase webhook payload to the expected format
    let event_type = "match_playing_time"; // Default event type
    let user_id = record?.user_id || old_record?.user_id;
    let message = "A match event occurred!";
    let data = { match_id: record?.id || old_record?.id };

    if (type === "INSERT") {
      event_type = "match_playing_time";
      message = "New match created!";
    } else if (type === "UPDATE") {
      event_type = "match_organizing_slot_filled";
      message = "Match slot updated!";
    } else if (type === "DELETE") {
      event_type = "match_organizing_slot_filled";
      message = "Match deleted!";
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ message: "No user_id found in the record" }),
        { status: 400 }
      );
    }

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
