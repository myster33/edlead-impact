import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendWhatsAppRequest {
  to: string;
  message: string;
  templateKey?: string;
  recipientType?: "learner" | "parent";
  applicationId?: string;
  sentBy?: string;
}

// Format phone number to international format for WhatsApp Cloud API (no + prefix, no whatsapp: prefix)
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    cleaned = "27" + cleaned;
  }

  return cleaned;
}

async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("Missing WhatsApp Cloud API credentials");
    return { success: false, error: "WhatsApp Cloud API credentials not configured" };
  }

  const formattedTo = formatPhoneNumber(to);

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: formattedTo,
    type: "text",
    text: { preview_url: false, body: body },
  };

  console.log(`Sending WhatsApp via Meta Cloud API to ${formattedTo}`);
  console.log("Request payload:", JSON.stringify(payload));
  console.log("Phone Number ID:", WHATSAPP_PHONE_NUMBER_ID);

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Cloud API error:", JSON.stringify(data));
      const errorMsg = data?.error?.message || "Failed to send WhatsApp message";
      return { success: false, error: errorMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log("WhatsApp message sent successfully:", messageId);
    return { success: true, messageId };
  } catch (error: any) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, templateKey, recipientType, applicationId, sentBy }: SendWhatsAppRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if WhatsApp notifications are enabled
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "whatsapp_notifications_enabled")
      .maybeSingle();

    const whatsappEnabled = settingsData?.setting_value === true || settingsData?.setting_value === "true";

    if (!whatsappEnabled) {
      console.log("WhatsApp notifications are disabled globally");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp notifications are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const result = await sendWhatsApp(to, message);

    // Log the message
    await supabase.from("message_logs").insert({
      channel: "whatsapp",
      recipient_phone: to,
      recipient_type: recipientType || "learner",
      template_key: templateKey,
      message_content: message,
      status: result.success ? "sent" : "failed",
      twilio_sid: result.messageId,
      error_message: result.error,
      application_id: applicationId,
      sent_by: sentBy,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      }),
      { status: result.success ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
