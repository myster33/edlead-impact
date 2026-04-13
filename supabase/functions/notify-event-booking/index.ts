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


const EVENT_LINK = "https://edlead.co.za/events";

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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
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
    console.log("Email sent:", data.id);
    return true;
  } catch (e) { console.error("Email error:", e); return false; }
}

function buildSmsMessage(name: string, ticketNumber: string, eventTitle: string, statusChange?: string) {
  if (statusChange === "confirmed") {
    return `edLEAD: Hi ${name}, booking CONFIRMED for "${eventTitle}". Ticket: ${ticketNumber}. Check email for details. edlead.co.za`;
  }
  if (statusChange === "cancelled") {
    return `edLEAD: Hi ${name}, booking for "${eventTitle}" cancelled. Ticket: ${ticketNumber}. Check email for details. edlead.co.za`;
  }
  return `edLEAD: Hi ${name}, booking received for "${eventTitle}". Ticket: ${ticketNumber}. Check email for details. edlead.co.za`;
}

function buildParentSmsMessage(parentName: string, childName: string, ticketNumber: string, eventTitle: string, statusChange?: string) {
  const parent = parentName || "Parent";
  if (statusChange === "confirmed") {
    return `edLEAD: Dear ${parent}, ${childName}'s booking CONFIRMED for "${eventTitle}". Ticket: ${ticketNumber}. Check email for details. edlead.co.za`;
  }
  if (statusChange === "cancelled") {
    return `edLEAD: Dear ${parent}, ${childName}'s booking for "${eventTitle}" cancelled. Ticket: ${ticketNumber}. Check email for details. edlead.co.za`;
  }
  return `edLEAD: Dear ${parent}, ${childName} booked for "${eventTitle}". Ticket: ${ticketNumber}. Check email for details. edlead.co.za`;
}

function buildEmailHtml(name: string, ticketNumber: string, eventTitle: string, isParent = false, childName?: string, statusChange?: string) {
  let heading: string;
  let color = "#ED7621";
  let icon = "🎟️";
  let title = "Event Booking Received";
  let note = "Please keep this ticket number for check-in at the event.";

  if (statusChange === "confirmed") {
    color = "#22c55e";
    icon = "✅";
    title = "Event Booking Confirmed";
    note = "Your booking has been confirmed. Please keep this ticket number for check-in.";
    heading = isParent
      ? `Dear <strong>${name}</strong>,<br/>Your child <strong>${childName}</strong>'s booking for <strong>${eventTitle}</strong> has been confirmed!`
      : `Hi <strong>${name}</strong>,<br/>Your booking for <strong>${eventTitle}</strong> has been confirmed!`;
  } else if (statusChange === "cancelled") {
    color = "#ef4444";
    icon = "❌";
    title = "Event Booking Cancelled";
    note = "Your booking has been cancelled. If this was unexpected, please contact us.";
    heading = isParent
      ? `Dear <strong>${name}</strong>,<br/>Unfortunately, your child <strong>${childName}</strong>'s booking for <strong>${eventTitle}</strong> has been cancelled.`
      : `Hi <strong>${name}</strong>,<br/>Unfortunately, your booking for <strong>${eventTitle}</strong> has been cancelled.`;
  } else {
    heading = isParent
      ? `Dear <strong>${name}</strong>,<br/>Your child <strong>${childName}</strong> has been booked for <strong>${eventTitle}</strong>.`
      : `Hi <strong>${name}</strong>,<br/>Your booking for <strong>${eventTitle}</strong> has been received.`;
  }

  const eventLinkHtml = `<p style="text-align:center;margin:16px 0;"><a href="${EVENT_LINK}" style="display:inline-block;background:${color};color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">View Event Details</a></p>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px;">
      <h2 style="color:${color};">${icon} ${title}</h2>
      <p>${heading}</p>
      <div style="background:#f5f5f5;padding:16px;border-radius:6px;text-align:center;margin:16px 0;">
        <p style="margin:0;font-size:12px;color:#666;">Ticket Number</p>
        <p style="margin:4px 0 0;font-size:24px;font-weight:bold;letter-spacing:2px;">${ticketNumber}</p>
      </div>
      ${eventLinkHtml}
      <p style="font-size:13px;color:#666;">${note}</p>
      <p style="font-size:12px;color:#888;margin-top:12px;">If you have any questions, contact us on <a href="mailto:info@edlead.co.za">info@edlead.co.za</a> or talk to us through our website edLEAD Chat at <a href="https://edlead.co.za">edlead.co.za</a></p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0;"/>
      <p style="font-size:12px;color:#999;">— edLEAD Team</p>
    </div>`;
}

async function notifyContact(phone: string | null, email: string | null, name: string, ticketNumber: string, eventTitle: string, statusChange?: string) {
  const results: Record<string, boolean> = {};
  const msg = buildSmsMessage(name, ticketNumber, eventTitle, statusChange);
  if (phone) {
    const formatted = formatPhoneE164(phone);
    results.sms = await sendSms(formatted, msg);
    results.whatsapp = await sendWhatsApp(formatted, msg);
  }
  if (email) {
    const subjectPrefix = statusChange === "confirmed" ? "✅ Booking Confirmed" : statusChange === "cancelled" ? "❌ Booking Cancelled" : "🎟️ Booking Received";
    results.email = await sendEmail(email, `${subjectPrefix} — ${eventTitle}`, buildEmailHtml(name, ticketNumber, eventTitle, false, undefined, statusChange));
  }
  return results;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookerType, ticketNumber, eventTitle, contacts, statusChange } = await req.json();

    if (!ticketNumber || !eventTitle) {
      return new Response(
        JSON.stringify({ error: "ticketNumber and eventTitle are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const allResults: Record<string, any> = {};

    for (const contact of (contacts || [])) {
      if (!contact.phone && !contact.email) continue;
      
      if (contact.role === "parent" && contact.parentOf) {
        const msg = buildParentSmsMessage(contact.name, contact.parentOf, ticketNumber, eventTitle, statusChange);
        if (contact.phone) {
          const formatted = formatPhoneE164(contact.phone);
          allResults[`${contact.name}_sms`] = await sendSms(formatted, msg);
          allResults[`${contact.name}_whatsapp`] = await sendWhatsApp(formatted, msg);
        }
        if (contact.email) {
          const subjectPrefix = statusChange === "confirmed" ? "✅ Booking Confirmed" : statusChange === "cancelled" ? "❌ Booking Cancelled" : "🎟️ Booking Received";
          allResults[`${contact.name}_email`] = await sendEmail(
            contact.email,
            `${subjectPrefix} — ${eventTitle}`,
            buildEmailHtml(contact.name, ticketNumber, eventTitle, true, contact.parentOf, statusChange)
          );
        }
      } else {
        const res = await notifyContact(contact.phone, contact.email, contact.name, ticketNumber, eventTitle, statusChange);
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
