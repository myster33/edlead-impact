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
  if (!RESEND_API_KEY) return false;
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
    return true;
  } catch (e) { console.error("Email error:", e); return false; }
}

function buildAttendeeMsg(name: string, ticketNumber: string, eventTitle: string) {
  return `👋 edLEAD Event Check-Out\n\nHi ${name},\n\nYou have been checked out of: ${eventTitle}\n\n📋 Ticket Number: ${ticketNumber}\n\nThank you for attending!\n— edLEAD Team`;
}

function buildParentMsg(parentName: string, childName: string, ticketNumber: string, eventTitle: string) {
  return `👋 edLEAD Event Check-Out\n\nDear ${parentName || "Parent/Guardian"},\n\nYour child ${childName} has been checked out of: ${eventTitle}\n\n📋 Ticket Number: ${ticketNumber}\n\nYour child has safely departed from the event.\n\nThank you!\n— edLEAD Team`;
}

function buildEmailHtml(heading: string, ticketNumber: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px;">
      <h2 style="color:#ED7621;">👋 Event Check-Out</h2>
      <p>${heading}</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:6px;text-align:center;margin:16px 0;">
        <p style="margin:0;font-size:12px;color:#666;">Ticket Number</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:bold;letter-spacing:2px;">${ticketNumber}</p>
      </div>
      <p style="font-size:13px;color:#666;">Thank you for attending. We hope you enjoyed the event!</p>
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

    // Notify attendee
    const attendeeMsg = buildAttendeeMsg(attendeeName, ticketNumber, eventTitle);
    if (phone) {
      const formatted = formatPhoneE164(phone);
      results.smsSent = await sendSms(formatted, attendeeMsg);
      results.whatsappSent = await sendWhatsApp(formatted, attendeeMsg);
    }
    if (email) {
      const heading = `Hi <strong>${attendeeName}</strong>,<br/>You have been checked out of <strong>${eventTitle}</strong>.`;
      results.emailSent = await sendEmail(email, `👋 Check-Out — ${eventTitle}`, buildEmailHtml(heading, ticketNumber));
    }

    // Notify parent (especially for students)
    if (attendeeType === "student") {
      const parentMsg = buildParentMsg(parentName, attendeeName, ticketNumber, eventTitle);
      if (parentPhone) {
        const formatted = formatPhoneE164(parentPhone);
        results.parentSmsSent = await sendSms(formatted, parentMsg);
        results.parentWhatsappSent = await sendWhatsApp(formatted, parentMsg);
      }
      if (parentEmail) {
        const heading = `Dear <strong>${parentName || "Parent/Guardian"}</strong>,<br/>Your child <strong>${attendeeName}</strong> has been checked out of <strong>${eventTitle}</strong>. Your child has safely departed.`;
        results.parentEmailSent = await sendEmail(parentEmail, `👋 Your child checked out — ${eventTitle}`, buildEmailHtml(heading, ticketNumber));
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
