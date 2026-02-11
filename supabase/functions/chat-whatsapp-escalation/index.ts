import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    if (!response.ok) return { success: false, error: data?.error?.message || "Failed" };
    return { success: true, messageId: data?.messages?.[0]?.id };
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

    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "support_whatsapp_number")
      .maybeSingle();

    const supportNumber = settingsData?.setting_value as string | null;
    const results: any[] = [];

    if (supportNumber) {
      const r = await sendWhatsApp(supportNumber, adminMessage);
      results.push({ target: "support", ...r });
    }

    if (conv.visitor_phone) {
      const visitorMsg = `Hi ${conv.visitor_name || "there"}! 👋 Our team at edLEAD received your chat message. We'll get back to you shortly via WhatsApp. Thank you for your patience!`;
      const r = await sendWhatsApp(conv.visitor_phone, visitorMsg);
      results.push({ target: "visitor", ...r });
    }

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
