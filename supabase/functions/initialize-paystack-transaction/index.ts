import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./_shared/cors.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const PAYSTACK_API_URL = 'https://api.paystack.co';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://playarenagames.vercel.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, amount, venue_id, match_id, event_id, resource_type, slug, title, callback_url, metadata } = await req.json();

    // Validate inputs
    if (!email || !amount || (!venue_id && !match_id && !event_id) || !slug || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate resource_type if provided
    if (resource_type && !['cycling', 'venue', 'match'].includes(resource_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid resource type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine resource type
    const inferredResourceType = event_id ? 'cycling' : venue_id ? 'venue' : 'match';
    const finalResourceType = resource_type || inferredResourceType;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const amountInKobo = parseInt(amount);
    if (isNaN(amountInKobo) || amountInKobo < 100) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount, minimum is 100 kobo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const amountInNaira = amountInKobo / 100;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_KEY");
    if (!supabase) {
      console.error('Failed to create Supabase client', { supabaseUrl, supabaseSupabase = createClient(supabaseUrl, supabaseKey);
    }

    // Validate resource
    let resourceId;
    if (finalResourceType === 'cycling') {
      const { data, error } = await supabase
        .from('cycling_events')
        .select('id')
        .eq('id', event_id)
        .eq('slug', slug)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Invalid cycling event' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resourceId = event_id;
    } else if (finalResourceType === 'match') {
      const { data, error } = await supabase
        .from('matches')
        .select('id')
        .eq('id', match_id)
        .eq('slug', slug)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Invalid match' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      resourceId = match_id;
    } else if (finalResourceType === 'venue') {
      const { data, error } = await supabase
        .from('venues')
        .select('id')
        .eq('id', venue_id)
        .single();
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Invalid venue' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        );
      }
      resourceId = venue_id;
    }

    // Initialize Paystack transaction
    const response = await fetch(`${PAYSTACK_API_URL}/transaction/initialize`, {
      method: 'POST`,
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
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
          ...(metadata || {})
        }
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error('Paystack error:', data);
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to initialize payment' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert into pending_transactions
    const { error: insertError } = await supabase.from("pending_transactions").insert({
      reference: data.data.reference,
      venue_id,
      match_id,
      event_id,
      resource_type: finalResourceType,
      slug,
      amount: amountInNaira,
      status: "pending"
    });

    if (insertError) {
      console.error('Failed to insert into pending_transactions:', insertError);
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
    console.error('Error initializing payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
