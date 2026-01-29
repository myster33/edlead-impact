import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSmsRequest {
  to: string;
  message: string;
  templateKey?: string;
  recipientType?: "learner" | "parent";
  applicationId?: string;
  sentBy?: string;
}

// Format phone number to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // Handle South African numbers
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    // South African mobile starting with 0
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    // 9 digit number, assume SA
    cleaned = "27" + cleaned;
  }
  
  // Ensure it starts with +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  
  return cleaned;
}

async function sendSms(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Missing Twilio credentials");
    return { success: false, error: "Twilio credentials not configured" };
  }

  const formattedTo = formatPhoneNumber(to);
  console.log(`Sending SMS to ${formattedTo}`);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Twilio API error:", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    console.log("SMS sent successfully:", data.sid);
    return { success: true, sid: data.sid };
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, templateKey, recipientType, applicationId, sentBy }: SendSmsRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to and message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if SMS notifications are enabled
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "sms_notifications_enabled")
      .maybeSingle();

    const smsEnabled = settingsData?.setting_value === true || settingsData?.setting_value === "true";
    
    if (!smsEnabled) {
      console.log("SMS notifications are disabled globally");
      return new Response(
        JSON.stringify({ success: false, message: "SMS notifications are disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send the SMS
    const result = await sendSms(to, message);

    // Log the message
    await supabase.from("message_logs").insert({
      channel: "sms",
      recipient_phone: to,
      recipient_type: recipientType || "learner",
      template_key: templateKey,
      message_content: message,
      status: result.success ? "sent" : "failed",
      twilio_sid: result.sid,
      error_message: result.error,
      application_id: applicationId,
      sent_by: sentBy,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        sid: result.sid,
        error: result.error,
      }),
      { status: result.success ? 200 : 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-sms function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
