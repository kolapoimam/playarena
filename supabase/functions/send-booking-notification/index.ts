import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { Resend } from "https://esm.sh/resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  try {
    const { venue_email, venue_name, match_date, start_time, end_time, user_email, access_code } = await req.json();

    if (!venue_email || !venue_name || !match_date || !start_time || !end_time || !user_email) {
      console.error("Missing required fields:", { venue_email, venue_name, match_date, start_time, end_time, user_email, access_code });
      return new Response(
        JSON.stringify({ error: "Missing required fields", missing: { venue_email, venue_name, match_date, start_time, end_time, user_email } }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Nunito', sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
      padding: 30px 20px;
      text-align: center;
    }
    .header img {
      max-width: 180px;
      height: auto;
    }
    .content {
      padding: 30px 20px;
    }
    .content h2 {
      font-size: 24px;
      font-weight: 700;
      color: #15803d;
      margin-bottom: 16px;
      text-align: center;
    }
    .booking-details {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      margin-bottom: 12px;
    }
    .detail-label {
      font-weight: 600;
      color: #1f2937;
      width: 120px;
    }
    .detail-value {
      color: #4b5563;
      flex: 1;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
    }
    .footer a {
      color: #22c55e;
      text-decoration: none;
    }
    @media (max-width: 600px) {
      .container {
        margin: 10px;
        border-radius: 8px;
      }
      .header {
        padding: 20px;
      }
      .content {
        padding: 20px;
      }
      .content h2 {
        font-size: 20px;
      }
      .detail-row {
        flex-direction: column;
      }
      .detail-label {
        width: 100%;
        margin-bottom: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://playarenagames.vercel.app/playarenadark.png" alt="Sport Cliq Logo">
    </div>
    <div class="content">
      <h2>New Booking Confirmation! 🎉</h2>
      <p>Exciting news! You've received a new booking through Sport Cliq. Here are all the details:</p>
      
      <div class="booking-details">
        <div class="detail-row">
          <div class="detail-label">Venue:</div>
          <div class="detail-value">${venue_name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Date:</div>
          <div class="detail-value">${match_date}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Time Slot:</div>
          <div class="detail-value">${start_time} - ${end_time}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Booked By:</div>
          <div class="detail-value">${user_email}</div>
        </div>
      </div>
      
      <p>Everything is confirmed and ready to go! The player will receive their booking confirmation shortly.</p>
    </div>
    <div class="footer">
      <p>Need to make any changes? Contact us at <a href="mailto:support@sportcliq.com">support@sportcliq.com</a></p>
      <p>© 2025 Sport Cliq. Making sports booking effortless.</p>
    </div>
  </div>
</body>
</html>
`;

    const response = await resend.emails.send({
      from: "hello@sportcliq.com",
      to: venue_email,
      subject: `⚽ New Booking for ${venue_name}!`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", response);

    return new Response(
      JSON.stringify({ success: true, emailId: response.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
