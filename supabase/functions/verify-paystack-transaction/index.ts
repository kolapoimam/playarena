import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    metadata: {
      venue_id?: string;
      match_id?: string;
      slug: string;
    };
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();
    console.log("Received Verification Request:", { reference });

    if (!reference) {
      console.error("Missing reference");
      throw new Error("Reference is required");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Check pending transaction
    const { data: pendingTransaction, error: transactionError } = await supabase
      .from("pending_transactions")
      .select("resource_id, resource_type, slug, amount")
      .eq("reference", reference)
      .single();

    if (transactionError || !pendingTransaction) {
      console.error("Pending transaction not found:", { reference, error: transactionError?.message });
      throw new Error("Transaction not found");
    }

    console.log("Pending Transaction:", pendingTransaction);

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
    });

    const paystackData: PaystackVerifyResponse = await paystackResponse.json();
    console.log("Paystack Verification Response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status || paystackData.data.status !== "success") {
      console.error("Paystack verification failed:", paystackData.message);
      throw new Error("Payment verification failed");
    }

    // Validate amount (convert stored naira to kobo for comparison)
    const expectedAmountInKobo = Math.round(pendingTransaction.amount * 100);
    if (paystackData.data.amount !== expectedAmountInKobo) {
      console.error("Amount mismatch:", {
        expected: expectedAmountInKobo,
        received: paystackData.data.amount,
      });
      throw new Error("Transaction amount does not match");
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from("pending_transactions")
      .update({ status: "verified" })
      .eq("reference", reference);

    if (updateError) {
      console.error("Failed to update transaction status:", updateError.message);
    }

    return new Response(
      JSON.stringify({
        verified: true,
        resource_id: pendingTransaction.resource_id,
        resource_type: pendingTransaction.resource_type,
        slug: pendingTransaction.slug,
        venue_id: paystackData.data.metadata.venue_id,
        match_id: paystackData.data.metadata.match_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Verification Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
