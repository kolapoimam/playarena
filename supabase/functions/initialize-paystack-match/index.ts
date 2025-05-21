import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PaystackResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

serve(async (req: Request) => {
  // Log the incoming request method and headers for debugging
  console.log(`Request Method: ${req.method}`);
  console.log("Request Headers:", JSON.stringify([...req.headers.entries()], null, 2));

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response(null, {
      status: 204, // Use 204 No Content for preflight responses
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log("Received Payload:", JSON.stringify(body, null, 2));

    const {
      email,
      amount,
      match_id,
      slug,
      name,
      number_of_slots,
    } = body;

    // Validate required fields
    const missingFields = [];
    if (!email) missingFields.push("email");
    if (!amount) missingFields.push("amount");
    if (!match_id) missingFields.push("match_id");
    if (!slug) missingFields.push("slug");
    if (!name) missingFields.push("name");
    if (!number_of_slots) missingFields.push("number_of_slots");

    if (missingFields.length > 0) {
      console.error("Missing fields:", missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email:", email);
      throw new Error("Invalid email format");
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.error("Invalid amount:", amount);
      throw new Error("Amount must be a positive number");
    }

    // Validate number_of_slots
    const parsedSlots = parseInt(number_of_slots);
    if (isNaN(parsedSlots) || parsedSlots <= 0) {
      console.error("Invalid number of slots:", number_of_slots);
      throw new Error("Number of slots must be a positive integer");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify match exists and has available slots
    const { data: matchData, error: matchError } = await supabase
      .from("matches")
      .select("id, slug, title, total_slots")
      .eq("id", match_id)
      .eq("slug", slug)
      .single();

    if (matchError || !matchData) {
      console.error("Match not found:", { match_id, slug, error: matchError?.message });
      throw new Error("Match not found or invalid");
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("number_of_slots")
      .eq("match_id", match_id);

    if (playersError) {
      console.error("Error fetching players:", playersError.message);
      throw new Error("Failed to check available slots");
    }

    const totalBookedSlots = players.reduce((sum, player) => sum + (player.number_of_slots || 1), 0);
    const availableSlots = matchData.total_slots - totalBookedSlots;

    if (parsedSlots > availableSlots) {
      console.error("Not enough slots:", { requested: parsedSlots, available: availableSlots });
      throw new Error(`Only ${availableSlots} slot(s) are available`);
    }

    // Validate amount against match price (assuming price is per slot)
    const { data: matchPriceData, error: priceError } = await supabase
      .from("matches")
      .select("price")
      .eq("id", match_id)
      .single();

    if (priceError || !matchPriceData.price) {
      console.error("Match price not found:", { match_id, error: priceError?.message });
      throw new Error("Match price not available");
    }

    const expectedAmount = matchPriceData.price * parsedSlots;
    if (Math.abs(parsedAmount - expectedAmount) > 0.01) {
      console.error("Amount mismatch:", { received: parsedAmount, expected: expectedAmount });
      throw new Error(`Amount mismatch: expected ₦${expectedAmount.toFixed(2)} for ${parsedSlots} slot(s)`);
    }

    // Convert amount to kobo
    const amountInKobo = Math.round(parsedAmount * 100);
    console.log("Amount in Kobo:", amountInKobo);

    // Log transaction attempt
    const { error: logError } = await supabase
      .from("pending_transactions")
      .insert({
        email,
        amount: parsedAmount,
        resource_id: match_id,
        resource_type: "match",
        slug,
        reference: null, // Will be set by Paystack
        status: "pending",
        metadata: { name, number_of_slots: parsedSlots },
      });

    if (logError) {
      console.error("Failed to log transaction attempt:", logError.message);
    }

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        metadata: {
          match_id,
          slug,
          name,
          number_of_slots: parsedSlots,
        },
      }),
    });

    const paystackData: PaystackResponse = await paystackResponse.json();
    console.log("Paystack Response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status) {
      console.error("Paystack Error:", paystackData.message);
      throw new Error(paystackData.message);
    }

    // Update pending transaction with reference
    const { error: updateError } = await supabase
      .from("pending_transactions")
      .update({ reference: paystackData.data.reference })
      .eq("email", email)
      .eq("amount", parsedAmount)
      .eq("resource_id", match_id)
      .eq("status", "pending")
      .limit(1);

    if (updateError) {
      console.error("Failed to update transaction reference:", updateError.message);
    }

    return new Response(
      JSON.stringify({
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
