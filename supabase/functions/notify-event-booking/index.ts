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
    return true;
  } catch (e) { console.error("Email error:", e); return false; }
}

function buildSmsMessage(name: string, ticketNumber: string, eventTitle: string, role: string) {
  return `🎟️ edLEAD Event Booking Confirmed!\n\nHi ${name},\n\nYour booking for "${eventTitle}" has been confirmed.\n\n📋 Ticket No: ${ticketNumber}\n\nPlease keep this ticket number for check-in at the event.\n\nThank you!\n— edLEAD Team`;
}

function buildParentSmsMessage(parentName: string, childName: string, ticketNumber: string, eventTitle: string) {
  return `🎟️ edLEAD Event Booking Confirmed!\n\nDear ${parentName || "Parent/Guardian"},\n\nYour child ${childName} has been booked for: ${eventTitle}\n\n📋 Ticket No: ${ticketNumber}\n\nPlease keep this ticket number for reference.\n\nThank you!\n— edLEAD Team`;
}

function buildEmailHtml(name: string, ticketNumber: string, eventTitle: string, isParent = false, childName?: string) {
  const heading = isParent
    ? `Dear <strong>${name}</strong>,<br/>Your child <strong>${childName}</strong> has been booked for <strong>${eventTitle}</strong>.`
    : `Hi <strong>${name}</strong>,<br/>Your booking for <strong>${eventTitle}</strong> has been confirmed.`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px;">
      <h2 style="color:#ED7621;">🎟️ Event Booking Confirmed</h2>
      <p>${heading}</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:6px;text-align:center;margin:16px 0;">
        <p style="margin:0;font-size:12px;color:#666;">Ticket Number</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:bold;letter-spacing:2px;">${ticketNumber}</p>
      </div>
      <p style="font-size:13px;color:#666;">Please keep this ticket number for check-in at the event.</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;"/>
      <p style="font-size:12px;color:#999;">— edLEAD Team</p>
    </div>`;
}

async function notifyContact(phone: string | null, email: string | null, name: string, ticketNumber: string, eventTitle: string) {
  const results: Record<string, boolean> = {};
  const msg = buildSmsMessage(name, ticketNumber, eventTitle, "attendee");
  if (phone) {
    const formatted = formatPhoneE164(phone);
    results.sms = await sendSms(formatted, msg);
    results.whatsapp = await sendWhatsApp(formatted, msg);
  }
  if (email) {
    results.email = await sendEmail(email, `🎟️ Booking Confirmed — ${eventTitle}`, buildEmailHtml(name, ticketNumber, eventTitle));
  }
  return results;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookerType, ticketNumber, eventTitle, contacts } = await req.json();

    if (!ticketNumber || !eventTitle) {
      return new Response(
        JSON.stringify({ error: "ticketNumber and eventTitle are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const allResults: Record<string, any> = {};

    // contacts is an array of { name, phone, email, role, parentOf? }
    for (const contact of (contacts || [])) {
      if (!contact.phone && !contact.email) continue;
      
      if (contact.role === "parent" && contact.parentOf) {
        // Parent notification about their child
        const msg = buildParentSmsMessage(contact.name, contact.parentOf, ticketNumber, eventTitle);
        if (contact.phone) {
          const formatted = formatPhoneE164(contact.phone);
          allResults[`${contact.name}_sms`] = await sendSms(formatted, msg);
          allResults[`${contact.name}_whatsapp`] = await sendWhatsApp(formatted, msg);
        }
        if (contact.email) {
          allResults[`${contact.name}_email`] = await sendEmail(
            contact.email,
            `🎟️ Your child booked — ${eventTitle}`,
            buildEmailHtml(contact.name, ticketNumber, eventTitle, true, contact.parentOf)
          );
        }
      } else {
        const res = await notifyContact(contact.phone, contact.email, contact.name, ticketNumber, eventTitle);
        Object.entries(res).forEach(([k, v]) => { allResults[`${contact.name}_${k}`] = v; });
      }
    }

    const anySuccess = Object.values(allResults).some(v => v === true);

    return new Response(
      JSON.stringify({ success: anySuccess, details: allResults }),
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
