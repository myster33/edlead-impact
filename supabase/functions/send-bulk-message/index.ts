import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Twilio for SMS only
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

// WhatsApp Cloud API (Meta)
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  phone: string;
  name: string;
  type: "learner" | "parent";
  applicationId?: string;
}

interface SendBulkMessageRequest {
  channel: "sms" | "whatsapp" | "both";
  recipients: Recipient[];
  message: string;
  sentBy?: string;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    cleaned = "27" + cleaned;
  }
  return cleaned;
}

async function sendSms(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: "Twilio SMS credentials not configured" };
  }

  const formattedTo = "+" + formatPhoneNumber(to);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({ To: formattedTo, From: TWILIO_PHONE_NUMBER, Body: body }),
      }
    );
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message || "Failed to send SMS" };
    return { success: true, sid: data.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { success: false, error: "WhatsApp Cloud API credentials not configured" };
  }

  const formattedTo = formatPhoneNumber(to);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedTo,
          type: "text",
          text: { body },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) return { success: false, error: data?.error?.message || "Failed to send WhatsApp" };
    return { success: true, messageId: data?.messages?.[0]?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channel, recipients, message, sentBy }: SendBulkMessageRequest = await req.json();

    if (!channel || !recipients || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: channel, recipients, and message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: smsSettings } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "sms_notifications_enabled")
      .maybeSingle();

    const { data: whatsappSettings } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_notifications_enabled")
      .maybeSingle();

    const smsEnabled = smsSettings?.setting_value === true || smsSettings?.setting_value === "true";
    const whatsappEnabled = whatsappSettings?.setting_value === true || whatsappSettings?.setting_value === "true";

    const results = {
      sms: { sent: 0, failed: 0 },
      whatsapp: { sent: 0, failed: 0 },
    };

    const channelsToSend: ("sms" | "whatsapp")[] = [];
    if (channel === "both") {
      if (smsEnabled) channelsToSend.push("sms");
      if (whatsappEnabled) channelsToSend.push("whatsapp");
    } else if (channel === "sms" && smsEnabled) {
      channelsToSend.push("sms");
    } else if (channel === "whatsapp" && whatsappEnabled) {
      channelsToSend.push("whatsapp");
    }

    if (channelsToSend.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "Requested channels are disabled", results }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending bulk messages to ${recipients.length} recipients via ${channelsToSend.join(", ")}`);

    for (const recipient of recipients) {
      const personalizedMessage = message.replace(/\{\{name\}\}/gi, recipient.name);

      for (const sendChannel of channelsToSend) {
        let logSid: string | undefined;
        let logError: string | undefined;
        let success = false;

        if (sendChannel === "sms") {
          const r = await sendSms(recipient.phone, personalizedMessage);
          success = r.success;
          logSid = r.sid;
          logError = r.error;
        } else {
          const r = await sendWhatsApp(recipient.phone, personalizedMessage);
          success = r.success;
          logSid = r.messageId;
          logError = r.error;
        }

        await supabase.from("message_logs").insert({
          channel: sendChannel,
          recipient_phone: recipient.phone,
          recipient_type: recipient.type,
          message_content: personalizedMessage,
          status: success ? "sent" : "failed",
          twilio_sid: logSid,
          error_message: logError,
          application_id: recipient.applicationId,
          sent_by: sentBy,
        });

        if (success) {
          results[sendChannel].sent++;
        } else {
          results[sendChannel].failed++;
          console.error(`Failed to send ${sendChannel} to ${recipient.phone}:`, logError);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    const totalSent = results.sms.sent + results.whatsapp.sent;
    const totalFailed = results.sms.failed + results.whatsapp.failed;
    console.log(`Bulk message complete. Sent: ${totalSent}, Failed: ${totalFailed}`);

    return new Response(
      JSON.stringify({ success: true, message: `Sent ${totalSent} messages, ${totalFailed} failed`, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-message function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
