import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

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
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("SMS credentials not configured, skipping");
    return false;
  }
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
  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    console.log("WhatsApp credentials not configured, skipping");
    return false;
  }
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
    console.log("WhatsApp sent");
    return true;
  } catch (e) { console.error("WhatsApp error:", e); return false; }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attendeeName, ticketNumber, eventTitle, phone } = await req.json();

    if (!attendeeName || !ticketNumber || !phone) {
      return new Response(
        JSON.stringify({ error: "attendeeName, ticketNumber, and phone are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const formattedPhone = formatPhoneE164(phone);
    const message = `🎟️ edLEAD Event Check-In Confirmed!\n\nHi ${attendeeName},\n\nYou have been checked in for: ${eventTitle}\n\n📋 Your Ticket Number: ${ticketNumber}\n\nPlease keep this ticket number for reference.\n\nThank you for attending!\n— edLEAD Team`;

    console.log(`Sending check-in notification to ${formattedPhone} for ticket ${ticketNumber}`);

    const smsSent = await sendSms(formattedPhone, message);
    const whatsappSent = await sendWhatsApp(formattedPhone, message);

    return new Response(
      JSON.stringify({ success: smsSent || whatsappSent, smsSent, whatsappSent }),
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
