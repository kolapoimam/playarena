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
      venue_id,
      slug,
      name,
      start_time,
      end_time,
      match_date,
    } = body;

    // Validate required fields
    const missingFields = [];
    if (!email) missingFields.push("email");
    if (!amount) missingFields.push("amount");
    if (!venue_id) missingFields.push("venue_id");
    if (!slug) missingFields.push("slug");
    if (!name) missingFields.push("name");
    if (!start_time) missingFields.push("start_time");
    if (!end_time) missingFields.push("end_time");
    if (!match_date) missingFields.push("match_date");

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

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      console.error("Invalid time format:", { start_time, end_time });
      throw new Error("Start and end times must be in HH:MM format");
    }

    // Validate duration (minimum 1 hour)
    const [startHours, startMinutes] = start_time.split(":").map(Number);
    const [endHours, endMinutes] = end_time.split(":").map(Number);
    const start = new Date(0);
    start.setHours(startHours, startMinutes);
    const end = new Date(0);
    end.setHours(endHours, endMinutes);
    const durationMs = end.getTime() - start.getTime();
    if (durationMs < 60 * 60 * 1000) {
      console.error("Invalid duration:", { start_time, end_time });
      throw new Error("Booking duration must be at least 1 hour");
    }
    if (durationMs > 12 * 60 * 60 * 1000) {
      console.error("Duration too long:", { start_time, end_time });
      throw new Error("Booking duration cannot exceed 12 hours");
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(match_date)) {
      console.error("Invalid date format:", match_date);
      throw new Error("Match date must be in YYYY-MM-DD format");
    }

    // Check if booking is at least 1 hour from now
    const now = new Date();
    const selectedDateTime = new Date(`${match_date}T${start_time}:00`);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    if (selectedDateTime < oneHourLater) {
      console.error("Booking too soon:", { match_date, start_time });
      throw new Error("Booking must start at least 1 hour from now");
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Verify venue exists and is verified
    const { data: venueData, error: venueError } = await supabase
      .from("venues")
      .select("id, slug, name, booking_fee, verified_status")
      .eq("id", venue_id)
      .eq("slug", slug)
      .single();

    if (venueError || !venueData) {
      console.error("Venue not found:", { venue_id, slug, error: venueError?.message });
      throw new Error("Venue not found or invalid");
    }

    if (venueData.verified_status !== "True") {
      console.error("Venue not verified:", { venue_id, slug });
      throw new Error("Venue is not verified for booking");
    }

    // Check for booking conflicts
    const { data: existingBookings, error: bookingError } = await supabase
      .from("venue_access_codes")
      .select("start_time, end_time")
      .eq("venue_id", venue_id)
      .eq("match_date", match_date);

    if (bookingError) {
      console.error("Error checking bookings:", bookingError.message);
      throw new Error("Failed to check booking conflicts");
    }

    const newStart = new Date(`1970-01-01T${start_time}:00`);
    const newEnd = new Date(`1970-01-01T${end_time}:00`);
    const hasConflict = existingBookings.some((booking) => {
      const existingStart = new Date(`1970-01-01T${booking.start_time}:00`);
      const existingEnd = new Date(`1970-01-01T${booking.end_time}:00`);
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasConflict) {
      console.error("Booking conflict:", { venue_id, match_date, start_time, end_time });
      throw new Error("Selected time slot is already booked");
    }

    // Calculate expected amount
    const durationHours = durationMs / (1000 * 60 * 60);
    const expectedAmount = venueData.booking_fee * durationHours;
    if (Math.abs(parsedAmount - expectedAmount) > 0.01) {
      console.error("Amount mismatch:", { received: parsedAmount, expected: expectedAmount });
      throw new Error(`Amount mismatch: expected ₦${expectedAmount.toFixed(2)} for ${durationHours} hours`);
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
        resource_id: venue_id,
        resource_type: "venue",
        status: "pending",
        metadata: { slug, name, start_time, end_time, match_date },
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
          venue_id,
          slug,
          name,
          start_time,
          end_time,
          match_date,
        },
      }),
    });

    const paystackData: PaystackResponse = await paystackResponse.json();
    console.log("Paystack Response:", JSON.stringify(paystackData, null, 2));

    if (!paystackData.status) {
      console.error("Paystack Error:", paystackData.message);
      throw new Error(paystackData.message);
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
