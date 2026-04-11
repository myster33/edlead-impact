import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

function formatPhoneE164(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    cleaned = "27" + cleaned;
  }
  if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
  return cleaned;
}

async function sendSms(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) return false;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }),
      }
    );
    const data = await res.json();
    if (!res.ok) { console.error("SMS error:", data); return false; }
    console.log("SMS sent:", data.sid);
    return true;
  } catch (e) { console.error("SMS error:", e); return false; }
}

async function sendWhatsApp(to: string, body: string) {
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) return false;
  const waNumber = to.replace("+", "");
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: waNumber,
          type: "text",
          text: { body },
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) { console.error("WhatsApp error:", data); return false; }
    return true;
  } catch (e) { console.error("WhatsApp error:", e); return false; }
}

async function sendEmail(to: string, subject: string, htmlBody: string) {
  if (!RESEND_API_KEY) { console.log("Resend not configured, skipping email"); return false; }
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [to],
        subject,
        html: htmlBody,
      }),
    });
    const data = await res.json();
    if (!res.ok) { console.error("Email error:", data); return false; }
    console.log("Email sent to", to);
    return true;
  } catch (e) { console.error("Email error:", e); return false; }
}

function buildMessage(attendeeName: string, ticketNumber: string, eventTitle: string, isParent = false, parentName?: string) {
  if (isParent) {
    return `🎟️ edLEAD Event Check-In Confirmed!\n\nDear ${parentName || "Parent/Guardian"},\n\nYour child ${attendeeName} has been checked in for: ${eventTitle}\n\n📋 Ticket Number: ${ticketNumber}\n\nPlease keep this ticket number for reference.\n\nThank you!\n— edLEAD Team`;
  }
  return `🎟️ edLEAD Event Check-In Confirmed!\n\nHi ${attendeeName},\n\nYou have been checked in for: ${eventTitle}\n\n📋 Your Ticket Number: ${ticketNumber}\n\nPlease keep this ticket number for reference.\n\nThank you for attending!\n— edLEAD Team`;
}

function buildEmailHtml(attendeeName: string, ticketNumber: string, eventTitle: string, isParent = false, parentName?: string) {
  const heading = isParent
    ? `Dear ${parentName || "Parent/Guardian"},<br/>Your child <strong>${attendeeName}</strong> has been checked in for <strong>${eventTitle}</strong>.`
    : `Hi <strong>${attendeeName}</strong>,<br/>You have been checked in for <strong>${eventTitle}</strong>.`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px;">
      <h2 style="color:#ED7621;">🎟️ Event Check-In Confirmed</h2>
      <p>${heading}</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:6px;text-align:center;margin:16px 0;">
        <p style="margin:0;font-size:12px;color:#666;">Ticket Number</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:bold;letter-spacing:2px;">${ticketNumber}</p>
      </div>
      <p style="font-size:13px;color:#666;">Please keep this ticket number for reference. You may need it to check out.</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;"/>
      <p style="font-size:12px;color:#999;">— edLEAD Team</p>
    </div>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attendeeName, ticketNumber, eventTitle, phone, email, attendeeType, parentPhone, parentEmail, parentName } = await req.json();

    if (!attendeeName || !ticketNumber) {
      return new Response(
        JSON.stringify({ error: "attendeeName and ticketNumber are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results: Record<string, boolean> = {};

    // Send to attendee
    const attendeeMsg = buildMessage(attendeeName, ticketNumber, eventTitle);
    const attendeeEmailHtml = buildEmailHtml(attendeeName, ticketNumber, eventTitle);

    if (phone) {
      const formatted = formatPhoneE164(phone);
      results.smsSent = await sendSms(formatted, attendeeMsg);
      results.whatsappSent = await sendWhatsApp(formatted, attendeeMsg);
    }
    if (email) {
      results.emailSent = await sendEmail(email, `🎟️ Check-In Confirmed — ${eventTitle}`, attendeeEmailHtml);
    }

    // For students, also notify parent
    if (attendeeType === "student") {
      const parentMsg = buildMessage(attendeeName, ticketNumber, eventTitle, true, parentName);
      const parentHtml = buildEmailHtml(attendeeName, ticketNumber, eventTitle, true, parentName);

      if (parentPhone) {
        const formatted = formatPhoneE164(parentPhone);
        results.parentSmsSent = await sendSms(formatted, parentMsg);
        results.parentWhatsappSent = await sendWhatsApp(formatted, parentMsg);
      }
      if (parentEmail) {
        results.parentEmailSent = await sendEmail(parentEmail, `🎟️ Your child checked in — ${eventTitle}`, parentHtml);
      }
    }

    const anySuccess = Object.values(results).some(v => v === true);

    return new Response(
      JSON.stringify({ success: anySuccess, ...results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
