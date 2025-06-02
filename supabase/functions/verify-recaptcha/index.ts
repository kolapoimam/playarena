import { serve } from "https://deno.land/std@0.131.0/http/server.ts";

serve(async (req) => {
  try {
    const { token } = await req.json();
    const secretKey = Deno.env.get("RECAPTCHA_SECRET_KEY");

    if (!token || !secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing token or secret key" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      { method: "POST" }
    );
    const result = await response.json();

    if (result.success && result.score >= 0.5) { // Adjust threshold as needed
      return new Response(JSON.stringify({ success: true, score: result.score }), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "reCAPTCHA verification failed", details: result["error-codes"] }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
