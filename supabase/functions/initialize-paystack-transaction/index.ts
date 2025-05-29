import { serve } from "https://deno.land/std@0.175.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
};

// Environment constants
const PAYSTACK_API_URL = Deno.env.get("PAYSTACK_SECRET_KEY") || "https://api.ppaystack.co";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://playarenagames.vercel.app/";

// Input validation types
interface Payload {
  email: string;
  amount: number;
  venue_id?: string;
  match_id?: string;
  event_id?: string;
  resource_type?: string;
  slug: string;
  title?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

// Transaction data type
interface TransactionData {
  reference: string;
  venue_id?: string;
  match_id?: string;
  event_id?: string;
  resource_id: string;
  resource_type: string;
  slug: string;
  amount: number;
  status: string;
  email: string;
}

// Main handler
serve(async (req: Request) => {
  // Log incoming request
  console.log("Received request:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
  });

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request body
    const payload: Payload = await req.json();
    const { email, amount, venue_id, match_id, event_id, resource_type, slug, title, callback_url, metadata } = payload;

    // Validate required fields
    if (!email || !amount || (!venue_id && !match_id && !event_id) || !slug || !title) {
      console.error("Missing required fields:", { email, amount, venue_id, match_id, event_id, slug, title });
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate resource_type
    const validResourceTypes = ["cycling", "venue", "match"];
    if (resource_type && !validResourceTypes.includes(resource_type)) {
      console.error("Invalid resource type:", resource_type);
      return new Response(JSON.stringify({ error: "Invalid resource type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Infer resource type
    const inferredResourceType = event_id ? "cycling" : venue_id ? "venue" : "match";
    const finalResourceType = resource_type || inferredResourceType;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate amount
    const amountInKobo = parseInt(amount.toString());
    if (isNaN(amountInKobo) || amountInKobo < 100) {
      console.error("Invalid amount:", amountInKobo);
      return new Response(JSON.stringify({ error: "Invalid amount, minimum is 100 kobo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const amountInNaira = amountInKobo / 100;

    // Validate event_id format for cycling events
    if (event_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(event_id)) {
        console.error("Invalid event_id format:", event_id);
        return new Response(JSON.stringify({ error: "Invalid event_id format, must be a UUID" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Initialize Supabase client
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Validate resource and set resourceId
    let resourceId: string;
    if (finalResourceType === "cycling") {
      const { data, error } = await supabase
        .from("cycling_events")
        .select("id_uuid, price, max_attendees, event_date, start_time, status")
        .eq("id_uuid", event_id)
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.error("Cycling event validation failed:", {
          event_id,
          slug,
          error: error?.message,
        });
        return new Response(JSON.stringify({ error: "Invalid cycling event" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate event status
      if (data.status === "passed") {
        console.error("Event has passed:", event_id);
        return new Response(JSON.stringify({ error: "Invalid cycling event: Event has passed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate event date and time
      const eventDateTime = new Date(`${data.event_date}T${data.start_time || "00:00"}`);
      if (eventDateTime < new Date()) {
        console.error("Event is in the past:", { event_id, eventDateTime });
        return new Response(JSON.stringify({ error: "Invalid cycling event: Event is in the past" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate attendee capacity
      const { count, error: attendeesError } = await supabase
        .from("cycling_attendees")
        .select("id_uuid", { count: "exact" })
        .eq("cycling_event_id_uuid", event_id);

      if (attendeesError || count >= data.max_attendees) {
        console.error("Event is full or attendee query failed:", {
          event_id,
          count,
          max_attendees: data.max_attendees,
          error: attendeesError?.message,
        });
        return new Response(JSON.stringify({ error: "Invalid cycling event: Event is full" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate amount against event price
      if (data.price * 100 !== amountInKobo) {
        console.error("Amount mismatch:", {
          expected: data.price * 100,
          received: amountInKobo,
        });
        return new Response(
          JSON.stringify({
            error: `Invalid amount: Expected ${data.price * 100} kobo, received ${amountInKobo} kobo`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      resourceId = event_id!;
    } else if (finalResourceType === "match") {
      const { data, error } = await supabase
        .from("matches")
        .select("id")
        .eq("id", match_id)
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.error("Match validation failed:", {
          match_id,
          slug,
          error: error?.message,
        });
        return new Response(JSON.stringify({ error: "Invalid match" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resourceId = match_id!;
    } else if (finalResourceType === "venue") {
      const { data, error } = await supabase
        .from("venues")
        .select("id")
        .eq("id", venue_id)
        .single();

      if (error || !data) {
        console.error("Venue validation failed:", {
          venue_id,
          error: error?.message,
        });
        return new Response(JSON.stringify({ error: "Invalid venue" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resourceId = venue_id!;
    } else {
      console.error("Unknown resource type:", finalResourceType);
      return new Response(JSON.stringify({ error: "Invalid resource type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        callback_url: callback_url || `${FRONTEND_URL}/join/${slug}`,
        metadata: {
          venue_id,
          match_id,
          event_id,
          resource_type: finalResourceType,
          slug,
          title,
          ...metadata || {},
        },
      }),
    });

    const paystackData = await paystackResponse.json();
    if (!paystackData.status) {
      console.error("Paystack initialization failed:", paystackData);
      return new Response(JSON.stringify({ error: paystackData.message || "Failed to initialize payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into pending_transactions
    const transactionData: TransactionData = {
      reference: paystackData.data.reference,
      venue_id,
      match_id,
      event_id,
      resource_id: resourceId,
      resource_type: finalResourceType,
      slug,
      amount: amountInNaira,
      status: "pending",
      email,
    };

    console.log("Inserting into pending_transactions:", transactionData);
    const { error: insertError } = await supabase.from("pending_transactions").insert(transactionData);

    if (insertError) {
      console.error("Failed to insert into pending_transactions:", {
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        transactionData,
      });
      return new Response(JSON.stringify({ error: `Failed to save transaction: ${insertError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return success response
    return new Response(
      JSON.stringify({
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error initializing payment:", {
      message: error.message,
      stack: error.stack,
      payload: await req.json().catch(() => "Failed to parse payload"),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
