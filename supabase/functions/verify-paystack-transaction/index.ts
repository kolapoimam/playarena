import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  try {
    const { reference } = await req.json();
    console.log("Received Verification Request:", { reference });

    if (!reference) {
      console.error("Missing reference");
      throw new Error("Reference is required");
    }

    // Initialize Supabase client
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

    // Check pending transaction
    const { data: pendingTransaction, error: transactionError } = await supabase
      .from("pending_transactions")
      .select("venue_id, match_id, event_id, resource_type, slug, amount")
      .eq("reference", reference)
      .single();

    if (transactionError || !pendingTransaction) {
      console.error("Pending transaction not found:", {
        reference,
        error: transactionError?.message
      });
      throw new Error("Transaction not found");
    }

    console.log("Pending Transaction:", pendingTransaction);

    // Validate event_id if resource_type is cycling
    if (pendingTransaction.resource_type === "cycling" && pendingTransaction.event_id) {
      const { data: eventData, error: eventError } = await supabase
        .from("cycling_events")
        .select("id_uuid")
        .eq("id_uuid", pendingTransaction.event_id)
        .single();

      if (eventError || !eventData) {
        console.error("Cycling event validation failed:", {
          event_id: pendingTransaction.event_id,
          slug: pendingTransaction.slug,
          error: eventError?.message
        });
        throw new Error("Invalid cycling event in transaction");
      }
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json"
      }
    });

    const paystackData = await paystackResponse.json();
    console.log("Paystack Verification Response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status || paystackData.data.status !== "success") {
      console.error("Paystack verification failed:", paystackData.message);
      throw new Error("Payment verification failed");
    }

    // Validate amount
    const expectedAmountInKobo = Math.round(pendingTransaction.amount * 100);
    if (paystackData.data.amount !== expectedAmountInKobo) {
      console.error("Amount mismatch:", {
        expected: expectedAmountInKobo,
        received: paystackData.data.amount
      });
      throw new Error("Transaction amount does not match");
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("pending_transactions")
      .update({
        status: "verified"
      })
      .eq("reference", reference);

    if (updateError) {
      console.error("Failed to update transaction status:", {
        error: updateError.message,
        code: updateError.code,
        details: updateError.details
      });
      // Log the error but don't throw to preserve existing functionality
    }

    // Determine response fields
    const responseData = {
      verified: true,
      slug: pendingTransaction.slug,
      resource_type: pendingTransaction.resource_type
    };

    if (pendingTransaction.event_id) {
      responseData.event_id = pendingTransaction.event_id;
    } else if (pendingTransaction.match_id) {
      responseData.match_id = pendingTransaction.match_id;
    } else if (pendingTransaction.venue_id) {
      responseData.venue_id = pendingTransaction.venue_id;
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Verification Error:", {
      message: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 400
    });
  }
});
