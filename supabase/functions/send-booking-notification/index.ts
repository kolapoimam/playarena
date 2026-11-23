import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { Resend } from "https://esm.sh/resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  try {
    const {
      venue_email,
      venue_name,
      match_date,
      start_time,
      end_time,
      user_email,
      access_code,
    } = await req.json();

    if (!venue_email || !venue_name || !match_date || !start_time || !end_time || !user_email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          missing: { venue_email, venue_name, match_date, start_time, end_time, user_email },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background-color: #f3f2f8;
      color: #000000;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #17a34a 0%, #138a3e 100%);
      padding: 25px;
      text-align: center;
    }
    .header img {
      max-width: 140px;
      height: auto;
    }
    .content {
      padding: 30px 25px;
      text-align: center;
    }
    .content h2 {
      font-size: 24px;
      font-weight: 700;
      color: #17a34a;
      margin-bottom: 16px;
    }
    .content p {
      font-size: 15px;
      color: #6b7280;
      margin-bottom: 20px;
      max-width: 85%;
      margin-left: auto;
      margin-right: auto;
      text-align: justify;
    }
    .booking-details {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .detail-icon {
      width: 24px;
      height: 24px;
      margin-right: 10px;
    }
    .detail-label {
      font-weight: 600;
      color: #000000;
      width: 120px;
      text-align: left;
    }
    .detail-value {
      color: #6b7280;
      flex: 1;
      text-align: right;
      padding-left: 10px;
    }
    .button {
      display: inline-block;
      background-color: #17a34a;
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 20px 0;
      transition: background-color 0.3s ease;
    }
    .button:hover {
      background-color: #138a3e;
    }
    .support {
      font-size: 14px;
      color: #6b7280;
      margin-top: 12px;
      margin-bottom: 20px;
      text-align: center;
    }
    .support a {
      color: #17a34a;
      text-decoration: none;
      font-weight: 600;
    }
    .support a:hover {
      text-decoration: underline;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
    }
    .footer a {
      color: #17a34a;
      text-decoration: none;
      margin: 0 6px;
    }
    .footer a:hover {
      text-decoration: underline;
    }
    .social-icons img {
      width: 24px;
      vertical-align: middle;
      margin: 0 6px;
    }
    /* Dark Mode Styles */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #17171a;
        color: #ffffff;
      }
      .container {
        background-color: #17171a;
        border: 1px solid #2f2f36;
      }
      .header {
        background: linear-gradient(135deg, #17a34a 0%, #138a3e 100%);
      }
      .header img {
        content: url('https://sportcliq.com/playarenadark.png');
      }
      .content h2 {
        color: #17a34a;
      }
      .content p {
        color: #ffffff;
      }
      .booking-details {
        background-color: #202024;
      }
      .detail-label {
        color: #ffffff;
      }
      .detail-value {
        color: #a3a3aa;
      }
      .button {
        background-color: #17a34a;
        color: #ffffff;
      }
      .button:hover {
        background-color: #138a3e;
      }
      .support {
        color: #a3a3aa;
      }
      .support a {
        color: #17a34a;
      }
      .footer {
        background-color: #202024;
        color: #a3a3aa;
      }
      .footer a {
        color: #17a34a;
      }
      .social-icons img, .detail-icon {
        filter: brightness(0) invert(1) hue-rotate(180deg) saturate(1.5);
      }
    }
    @media (max-width: 600px) {
      .container {
        margin: 15px;
        border-radius: 10px;
      }
      .header {
        padding: 20px;
      }
      .header img {
        max-width: 120px;
      }
      .content {
        padding: 20px;
      }
      .content h2 {
        font-size: 20px;
      }
      .content p {
        font-size: 14px;
      }
      .booking-details {
        padding: 15px;
      }
      .detail-row {
        margin-bottom: 12px;
      }
      .detail-icon {
        width: 20px;
        height: 20px;
      }
      .detail-label {
        width: 110px;
        font-size: 14px;
      }
      .detail-value {
        font-size: 14px;
      }
      .button {
        font-size: 14px;
        padding: 10px 20px;
      }
      .support {
        font-size: 13px;
        margin-top: 10px;
        margin-bottom: 15px;
      }
      .footer {
        font-size: 12px;
        padding: 15px;
      }
      .social-icons img {
        width: 20px;
        margin: 0 4px;
      }
      .footer a {
        margin: 0 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://sportcliq.com/playarenadark.png" alt="SportCliq Logo">
    </div>
    <div class="content">
      <h2>Score! New Booking Alert! 💰</h2>
      <p>Game on! A SportCliq organizer has just booked your awesome venue, ${venue_name}, for an epic match. Check out the details below and get ready to host some serious action!</p>
      <div class="booking-details">
        <div class="detail-row">
          <img class="detail-icon" src="https://img.icons8.com/ios-filled/16/17a34a/stadium.png" alt="Venue">
          <div class="detail-label">Venue:</div>
          <div class="detail-value">${venue_name}</div>
        </div>
        <div class="detail-row">
          <img class="detail-icon" src="https://img.icons8.com/ios-filled/16/17a34a/calendar.png" alt="Date">
          <div class="detail-label">Date:</div>
          <div class="detail-value">${match_date}</div>
        </div>
        <div class="detail-row">
          <img class="detail-icon" src="https://img.icons8.com/ios-filled/16/17a34a/clock.png" alt="Time">
          <div class="detail-label">Time Slot:</div>
          <div class="detail-value">${start_time} - ${end_time}</div>
        </div>
        <div class="detail-row">
          <img class="detail-icon" src="https://img.icons8.com/ios-filled/16/17a34a/user.png" alt="Booked By">
          <div class="detail-label">Booked By:</div>
          <div class="detail-value">${user_email}</div>
        </div>
      </div>
      <p>The player’s got their confirmation, and you’re all set to make this match a great experience!.</p>
      <div class="support">
        <p style="text-align: center;">Need to make changes? <br>Contact our team at <a href="mailto:sportcliqapp@gmail.com">sportcliqapp@gmail.com</a>.</p>
      </div>
    </div>
    <div class="footer">
      <p>Stay connected with us:</p>
      <div class="social-icons">
        <a href="https://www.instagram.com/SportCliqHQ" target="_blank">
          <img src="https://img.icons8.com/ios-filled/50/17a34a/instagram-new.png" alt="Instagram">
        </a>
        <a href="https://x.com/SportCliq" target="_blank">
          <img src="https://img.icons8.com/ios-filled/50/17a34a/twitter.png" alt="Twitter">
        </a>
      </div>
      <p>© 2025 SportCliq. Making sports booking a breeze!</p>
    </div>
  </div>
</body>
</html>`;

    const response = await resend.emails.send({
      from: "Kay from SportCliq <hello@sportcliq.com>",
      reply_to: "sportcliqapp@gmail.com",
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
