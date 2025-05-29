import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
const PAYSTACK_API_URL = 'https://api.paystack.co';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://playarenagames.vercel.app';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const { email, amount, venue_id, match_id, event_id, resource_type, slug, title, callback_url, metadata } = await req.json();

    // Validate inputs
    if (!email || !amount || (!venue_id && !match_id && !event_id) || !slug || !title) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate resource_type if provided
    if (resource_type && !['cycling', 'venue', 'match'].includes(resource_type)) {
      return new Response(JSON.stringify({
        error: 'Invalid resource type'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Determine resource type
    const inferredResourceType = event_id ? 'cycling' : venue_id ? 'venue' : 'match';
    const finalResourceType = resource_type || inferredResourceType;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Validate amount
    const amountInKobo = parseInt(amount);
    if (isNaN(amountInKobo) || amountInKobo < 100) {
      return new Response(JSON.stringify({
        error: 'Invalid amount, minimum is 100 kobo'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const amountInNaira = amountInKobo / 100;

    // Validate event_id format if provided
    if (event_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(event_id)) {
        console.error('Invalid event_id format:', event_id);
        return new Response(JSON.stringify({
          error: 'Invalid event_id format, must be a UUID'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables', {
        supabaseUrl,
        supabaseKey
      });
      return new Response(JSON.stringify({
        error: 'Server configuration error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate resource
    let resourceId;
    if (finalResourceType === 'cycling') {
      const { data, error } = await supabase
        .from('cycling_events')
        .select('id_uuid') // Changed from 'id' to 'id_uuid'
        .eq('id_uuid', event_id) // Changed from 'id' to 'id_uuid'
        .eq('slug', slug)
        .single();
      if (error || !data) {
        console.error('Cycling event validation failed:', {
          event_id,
          slug,
          error: error?.message
        });
        return new Response(JSON.stringify({
          error: 'Invalid cycling event'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
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
        console.error('Match validation failed:', {
          match_id,
          slug,
          error: error?.message
        });
        return new Response(JSON.stringify({
          error: 'Invalid match'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      resourceId = match_id;
    } else if (finalResourceType === 'venue') {
      const { data, error } = await supabase
        .from('venues')
        .select('id')
        .eq('id', venue_id)
        .single();
      if (error || !data) {
        console.error('Venue validation failed:', {
          venue_id,
          error: error?.message
        });
        return new Response(JSON.stringify({
          error: 'Invalid venue'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      resourceId = venue_id;
    }

// Insert into pending_transactions
const transactionData = {
  reference: data.data.reference,
  venue_id,
  match_id,
  event_id,
  resource_id: resourceId, // Add resource_id using the resourceId variable
  resource_type: finalResourceType,
  slug,
  amount: amountInNaira,
  status: "pending",
  email: email // From previous fix
};
console.log('Inserting into pending_transactions:', transactionData);
const { error: insertError } = await supabase
  .from("pending_transactions")
  .insert(transactionData);

if (insertError) {
  console.error('Failed to insert into pending_transactions:', {
    error: insertError.message,
    code: insertError.code,
    details: insertError.details,
    hint: insertError.hint,
    transactionData
  });
  return new Response(JSON.stringify({
    error: `Failed to save transaction: ${insertError.message}`
  }), {
    status: 500,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
      });
    }

    // Insert into pending_transactions
    const transactionData = {
      reference: data.data.reference,
      venue_id,
      match_id,
      event_id,
      resource_type: finalResourceType,
      slug,
      amount: amountInNaira,
      status: "pending"
    };
    console.log('Inserting into pending_transactions:', transactionData);
    const { error: insertError } = await supabase
      .from("pending_transactions")
      .insert(transactionData);

    if (insertError) {
      console.error('Failed to insert into pending_transactions:', {
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        transactionData
      });
      return new Response(JSON.stringify({
        error: `Failed to save transaction: ${insertError.message}`
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      access_code: data.data.access_code,
      reference: data.data.reference
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error initializing payment:', {
      message: error.message,
      stack: error.stack
    });
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
