import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const PAYSTACK_API_URL = 'https://api.paystack.co';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://playarenagames.vercel.app';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, amount, venue_id, match_id, slug, title } = await req.json();

    // Validate inputs
    if (!email || !amount || (!venue_id && !match_id) || !slug || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert amount to kobo (smallest currency unit)
    const amountInKobo = Math.round(parseFloat(amount) * 100);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables', { supabaseUrl, supabaseKey });
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Paystack transaction
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        callback_url: `${FRONTEND_URL}/join/${slug}`,
        metadata: {
          venue_id,
          match_id,
          slug,
          title
        }
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error('Paystack error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize payment' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into pending_transactions table
    const { error: insertError } = await supabase.from("pending_transactions").insert({
      reference: data.data.reference,
      resource_id: venue_id || match_id,
      resource_type: venue_id ? "venue" : "match",
      slug,
      amount: amountInKobo / 100,
      status: "pending"
    });

    if (insertError) {
      console.error('Failed to insert into pending_transactions:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      return new Response(
        JSON.stringify({ error: 'Failed to save transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        access_code: data.data.access_code,
        reference: data.data.reference
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error initializing payment:', {
      message: error.message,
      stack: error.stack
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
