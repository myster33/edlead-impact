import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    cleaned = "27" + cleaned;
  }
  return `whatsapp:+${cleaned}`;
}

async function sendWhatsApp(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    return { success: false, error: "Twilio WhatsApp credentials not configured" };
  }

  const formattedTo = formatWhatsAppNumber(to);
  const cleanedFrom = TWILIO_WHATSAPP_NUMBER.replace(/\s/g, "");
  const formattedFrom = cleanedFrom.startsWith("whatsapp:") ? cleanedFrom : `whatsapp:${cleanedFrom}`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({ To: formattedTo, From: formattedFrom, Body: body }),
      }
    );
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message || "Failed" };
    return { success: true, sid: data.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation
    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", conversation_id)
      .maybeSingle();

    if (!conv) {
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conv.escalated_to_whatsapp) {
      return new Response(JSON.stringify({ success: true, message: "Already escalated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get messages for summary
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("content, sender_type, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(20);

    const summary = (messages || [])
      .map((m) => `${m.sender_type === "visitor" ? conv.visitor_name || "Visitor" : "edLEAD"}: ${m.content}`)
      .join("\n");

    const adminMessage = `📩 Chat Escalation\nVisitor: ${conv.visitor_name || "Anonymous"}${conv.visitor_email ? `\nEmail: ${conv.visitor_email}` : ""}${conv.visitor_province ? `\nProvince: ${conv.visitor_province}` : ""}${conv.visitor_phone ? `\nPhone: ${conv.visitor_phone}` : ""}\n\nConversation:\n${summary}`;

    // Get edLEAD support WhatsApp number from system settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "support_whatsapp_number")
      .maybeSingle();

    const supportNumber = settingsData?.setting_value as string | null;
    const results: any[] = [];

    // Send to support team
    if (supportNumber) {
      const r = await sendWhatsApp(supportNumber, adminMessage);
      results.push({ target: "support", ...r });
    }

    // Send to visitor if they provided a phone
    if (conv.visitor_phone) {
      const visitorMsg = `Hi ${conv.visitor_name || "there"}! 👋 Our team at edLEAD received your chat message. We'll get back to you shortly via WhatsApp. Thank you for your patience!`;
      const r = await sendWhatsApp(conv.visitor_phone, visitorMsg);
      results.push({ target: "visitor", ...r });
    }

    // Mark as escalated
    await supabase
      .from("chat_conversations")
      .update({ escalated_to_whatsapp: true })
      .eq("id", conversation_id);

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Escalation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
