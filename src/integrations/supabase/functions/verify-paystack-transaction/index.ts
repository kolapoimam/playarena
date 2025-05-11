
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_test_your_secret_key";
const PAYSTACK_VERIFY_URL = "https://api.paystack.co/transaction/verify/";

serve(async (req) => {
  try {
    const { reference } = await req.json();
    console.log("Verify transaction request:", { reference });

    if (!reference) {
      console.log("Reference is required");
      return new Response(JSON.stringify({ error: "Reference is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify transaction with Paystack
    const response = await fetch(`${PAYSTACK_VERIFY_URL}${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("Paystack verify response:", data);

    if (!response.ok || data.status === false) {
      console.log("Paystack verify failed:", data.message);
      throw new Error(data.message || "Failed to verify transaction");
    }

    const { status, amount, metadata } = data.data;

    if (status !== "success") {
      console.log("Transaction not successful:", status);
      return new Response(JSON.stringify({ verified: false, message: "Transaction not successful" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        verified: true,
        amount: amount / 100, // Convert back to NGN
        match_id: metadata.match_id,
        slug: metadata.slug,
        title: metadata.title,
        phone: metadata.phone,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verify transaction error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});