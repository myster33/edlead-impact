import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "edLEAD <info@edlead.co.za>";
const ADMIN_EMAIL = "info@edlead.co.za";
const SITE_URL = "https://edlead.co.za";
const LOGO_URL = `${SITE_URL}/images/edlead-logo-full.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeString = (str: string, maxLength: number = 1000): string => {
  if (!str) return "";
  return str.trim().substring(0, maxLength);
};

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY secret");
    throw new Error("missing_resend_api_key");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("Email send error:", text);

    if (response.status === 403 && text.includes("verify a domain")) {
      throw new Error("resend_testing_mode");
    }

    throw new Error("email_send_failed");
  }

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true };
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactRequest = await req.json();

    // Validation
    if (!name || name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid name" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!subject || subject.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Please provide a subject" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!message || message.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Please provide a message (at least 5 characters)" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name, 100);
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedSubject = sanitizeString(subject, 200);
    const sanitizedMessage = sanitizeString(message, 5000);

    const formattedDate = new Intl.DateTimeFormat("en-ZA", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    // Send notification email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          :root { color-scheme: light dark; }
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { padding: 30px; text-align: center; }
          .header img { max-width: 280px; height: auto; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          h1 { margin: 0; }
          .highlight { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .message-box { background: white; padding: 20px; border-radius: 5px; border: 1px solid #ddd; margin-top: 20px; }
          @media (prefers-color-scheme: dark) {
            body { background-color: #1a1a2e !important; }
            .content { background-color: #1f2937 !important; }
            .highlight { background-color: #1e3a5f !important; }
            .highlight strong { color: #93c5fd !important; }
            .message-box { background-color: #374151 !important; border-color: #4b5563 !important; }
            .message-box strong, .message-box p { color: #e5e7eb !important; }
            .footer { color: #9ca3af !important; }
            .footer p { color: #9ca3af !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background-color: #4A4A4A;">
            <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" />
            <h1 style="margin-top: 15px; color: #ffffff;">New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="highlight">
              <strong>From:</strong> ${sanitizedName}<br>
              <strong>Email:</strong> ${sanitizedEmail}<br>
              <strong>Subject:</strong> ${sanitizedSubject}<br>
              <strong>Date:</strong> ${formattedDate}
            </div>
            
            <div class="message-box">
              <strong>Message:</strong>
              <p style="white-space: pre-wrap;">${sanitizedMessage}</p>
            </div>
            
            <p style="margin-top: 20px;">
              <a href="mailto:${sanitizedEmail}?subject=Re: ${sanitizedSubject}" style="background: #1e3a5f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reply to ${sanitizedName}</a>
            </p>
          </div>
          <div class="footer">
            <p>This message was sent via the edLEAD website contact form.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      ADMIN_EMAIL,
      `[edLEAD Contact] ${sanitizedSubject}`,
      adminEmailHtml
    );
    console.log("Admin notification email sent");

    // Send confirmation email to sender
    const confirmationEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          :root { color-scheme: light dark; }
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { padding: 30px; text-align: center; }
          .header img { max-width: 280px; height: auto; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          h1 { margin: 0; }
          @media (prefers-color-scheme: dark) {
            body { background-color: #1a1a2e !important; }
            .content { background-color: #1f2937 !important; }
            .content h2, .content p { color: #e5e7eb !important; }
            blockquote { background-color: #1e3a5f !important; }
            blockquote strong { color: #93c5fd !important; }
            .footer { color: #9ca3af !important; }
            .footer p { color: #9ca3af !important; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header" style="background-color: #4A4A4A;">
            <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" />
          </div>
          <div class="content">
            <h2>Thank you for contacting us, ${sanitizedName}!</h2>
            <p>We have received your message and will get back to you as soon as possible.</p>
            <p>Here's a copy of your message:</p>
            <blockquote style="background: #e8f4f8; padding: 15px; border-radius: 5px; border-left: 4px solid #1e3a5f;">
              <strong>Subject:</strong> ${sanitizedSubject}<br><br>
              ${sanitizedMessage}
            </blockquote>
            <p>Best regards,<br><strong>The edLEAD Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated confirmation. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} edLEAD. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail(
        sanitizedEmail,
        "We received your message - edLEAD",
        confirmationEmailHtml
      );
      console.log("Confirmation email sent to sender");
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Continue - admin was notified, that's the important part
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-contact function:", error);

    if (error?.message === "resend_testing_mode") {
      return new Response(
        JSON.stringify({
          error:
            "Email sending is in testing mode. Please verify the edlead.co.za domain in Resend and use a sender like info@edlead.co.za, then try again.",
        }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (error?.message === "missing_resend_api_key") {
      return new Response(
        JSON.stringify({ error: "Email service is not configured yet. Please try again later." }),
        { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again later." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
