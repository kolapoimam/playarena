import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://playarenagames.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

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
      event_id?: string;
      slug: string;
    };
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const headers = {
    ...corsHeaders,
    "Content-Type": "application/json",
  };

  try {
    const { reference } = await req.json();
    console.log("Received Verification Request:", { reference });

    if (!reference) {
      console.error("Missing reference");
      return new Response(
        JSON.stringify({ error: "Reference is required" }),
        { status: 400, headers }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !supabaseKey || !paystackSecretKey) {
      console.error("Missing environment variables", {
        supabaseUrl: !!supabaseUrl,
        supabaseKey: !!supabaseKey,
        paystackSecretKey: !!paystackSecretKey,
      });
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey); // Fixed typo: supabase_key -> supabaseKey

    const { data: pendingTransaction, error: transactionError } = await supabase
      .from("pending_transactions")
      .select("resource_id, resource_type, slug, amount")
      .eq("reference", reference)
      .single();

    if (transactionError || !pendingTransaction) {
      console.error("Pending transaction not found:", { reference, error: transactionError?.message });
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers }
      );
    }

    console.log("Pending Transaction:", pendingTransaction);

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    const paystackData: PaystackVerifyResponse = await paystackResponse.json();
    console.log("Paystack Verification Response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status || paystackData.data.status !== "success") {
      console.error("Paystack verification failed:", paystackData.message);
      return new Response(
        JSON.stringify({ error: "Payment verification failed" }),
        { status: 400, headers }
      );
    }

    const expectedAmountInKobo = Math.round(pendingTransaction.amount * 100);
    if (paystackData.data.amount !== expectedAmountInKobo) {
      console.error("Amount mismatch:", {
        expected: expectedAmountInKobo,
        received: paystackData.data.amount,
      });
      return new Response(
        JSON.stringify({ error: "Transaction amount does not match" }),
        { status: 400, headers }
      );
    }

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
        event_id: paystackData.data.metadata.event_id,
      }),
      { status: 200, headers }
    );
  } catch (error: any) {
    console.error("Verification Error:", {
      message: error.message,
      stack: error.stack,
    });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers }
    );
  }
});
