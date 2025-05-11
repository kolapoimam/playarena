// supabase/functions/initialize-paystack-transaction/index.ts
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "sk_test_8ece8bb7320d1d2b738a74b74457f8aa4e937172";
const PAYSTACK_API_URL = "https://api.paystack.co/transaction/initialize";

serve(async (req) => {
  try {
    const { match_id, phone, email, amount, slug, title } = await req.json();
    console.log("Initialize transaction request:", { match_id, phone, email, amount, slug, title });

    // Validate input
    if (!match_id || !phone || !email || !amount || !slug) {
      console.log("Missing required fields");
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate phone format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      console.log("Invalid phone format:", phone);
      return new Response(JSON.stringify({ error: "Invalid phone format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("Invalid email format:", email);
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate unique reference
    const reference = `match_${match_id}_${Date.now()}`;
    const callbackUrl = `https://playarenagames.vercel.app/join/${slug}?reference=${encodeURIComponent(reference)}`;

    // Initialize transaction with Paystack
    const response = await fetch(PAYSTACK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo
        reference,
        callback_url: callbackUrl,
        metadata: { match_id, slug, title, phone },
      }),
    });

    const data = await response.json();
    console.log("Paystack initialize response:", data);

    if (!response.ok || data.status === false) {
      console.log("Paystack initialize failed:", data.message);
      throw new Error(data.message || "Failed to initialize transaction");
    }

    return new Response(
      JSON.stringify({ reference: data.data.reference }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Initialize transaction error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});