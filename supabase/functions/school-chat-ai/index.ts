import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callBedrock } from "../lovable-ai-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_RESUME_TIMEOUT_MS = 7000; // 7 seconds

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") || "unknown";
}

function buildSystemPrompt(schoolName: string, knowledgeArticles: any[], visitorRole: string): string {
  let prompt = `You are the AI assistant for ${schoolName}. You are helpful, professional, and friendly. You assist students, parents, educators, and guests with questions about the school.

The visitor's role is: ${visitorRole}.

Adapt your tone and information based on the visitor's role:
- For students: Be encouraging, use a slightly more casual but respectful tone. Focus on academic info, activities, and school life.
- For parents/guardians: Be professional and reassuring. Focus on policies, fees, safety, and academic progress.
- For educators/teachers: Be collegial and informative. Focus on curriculum, policies, and institutional procedures.
- For guests: Be welcoming and provide general information about the school.

Keep answers concise (2-4 sentences) unless the question requires more detail.
If you don't have specific information about something, say so honestly and suggest the visitor contact the school directly.
Do NOT make up specific facts about the school (dates, fees, policies) unless they are in the knowledge base below.`;

  if (knowledgeArticles.length > 0) {
    prompt += `\n\n=== SCHOOL KNOWLEDGE BASE ===\n`;
    for (const article of knowledgeArticles) {
      prompt += `\n### ${article.title} (${article.category})\n${article.content}\n`;
    }
    prompt += `\n=== END KNOWLEDGE BASE ===\n\nUse the knowledge base above to answer questions accurately. Prioritise this information over general knowledge when relevant.`;
  } else {
    prompt += `\n\nNote: This school has not yet added specific information to their knowledge base. Provide general, helpful responses and suggest contacting the school directly for specific details.`;
  }

  return prompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: 30 requests per minute
    const clientIp = getClientIp(req);
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _ip: clientIp, _endpoint: "school-chat-ai", _max_requests: 30, _window_minutes: 1,
    });
    if (!allowed) {
      return new Response(
        JSON.stringify({ reply: "You're sending messages too quickly. Please wait a moment and try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { school_id, messages, visitor_role, conversation_id } = await req.json();

    if (!school_id) {
      return new Response(
        JSON.stringify({ error: "school_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if AI is paused (admin is responding)
    if (conversation_id) {
      const { data: conv } = await supabase
        .from("school_chat_conversations")
        .select("ai_paused, admin_last_reply_at")
        .eq("id", conversation_id)
        .single();

      if (conv?.ai_paused && conv?.admin_last_reply_at) {
        const elapsed = Date.now() - new Date(conv.admin_last_reply_at).getTime();
        if (elapsed < AI_RESUME_TIMEOUT_MS) {
          // AI is still paused, admin is active
          return new Response(
            JSON.stringify({ reply: null, ai_paused: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // 7 seconds passed, resume AI
          await supabase
            .from("school_chat_conversations")
            .update({ ai_paused: false })
            .eq("id", conversation_id);
        }
      }
    }

    // Load school details
    const { data: school } = await supabase
      .from("schools")
      .select("name, address, province, country, email, phone")
      .eq("id", school_id)
      .single();

    if (!school) {
      return new Response(
        JSON.stringify({ error: "School not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load active knowledge articles
    const { data: knowledge } = await supabase
      .from("school_chat_knowledge")
      .select("title, content, category")
      .eq("school_id", school_id)
      .eq("is_active", true)
      .order("category")
      .limit(50);

    const systemPrompt = buildSystemPrompt(
      school.name,
      knowledge || [],
      visitor_role || "guest"
    );

    // Filter and prepare messages for Bedrock
    const userMessages = (messages || [])
      .filter((m: any) => m.role !== "system")
      .map((m: any) => ({ role: m.role, content: m.content }));

    const bedrockResponse = await callBedrock({
      system: systemPrompt,
      messages: userMessages,
      max_tokens: 2048,
    });

    let reply = "I'm sorry, I couldn't process that. Please try again or contact the school directly.";
    const textBlock = bedrockResponse.content?.find((b: any) => b.type === "text");
    if (textBlock?.text) {
      reply = textBlock.text;
    }

    return new Response(
      JSON.stringify({ reply, ai_paused: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("school-chat-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
