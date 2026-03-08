import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Record<string, number> = {};

    // 1. Archive chat conversations older than 90 days
    const chatCutoff = new Date();
    chatCutoff.setDate(chatCutoff.getDate() - 90);

    // First delete messages for old conversations
    const { data: oldConvos } = await supabase
      .from("chat_conversations")
      .select("id")
      .lt("created_at", chatCutoff.toISOString());

    if (oldConvos && oldConvos.length > 0) {
      const convoIds = oldConvos.map((c) => c.id);
      const { count: msgCount } = await supabase
        .from("chat_messages")
        .delete({ count: "exact" })
        .in("conversation_id", convoIds);
      results.chat_messages_deleted = msgCount || 0;

      const { count: convoCount } = await supabase
        .from("chat_conversations")
        .delete({ count: "exact" })
        .in("id", convoIds);
      results.chat_conversations_deleted = convoCount || 0;
    } else {
      results.chat_messages_deleted = 0;
      results.chat_conversations_deleted = 0;
    }

    // 2. Remove expired dashboard announcements
    const { count: announcementCount } = await supabase
      .from("dashboard_announcements")
      .delete({ count: "exact" })
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "is", null);
    results.expired_announcements_deleted = announcementCount || 0;

    // 3. Clean up old rate limit entries (older than 24 hours)
    const rateLimitCutoff = new Date();
    rateLimitCutoff.setHours(rateLimitCutoff.getHours() - 24);
    const { count: rateLimitCount } = await supabase
      .from("rate_limits")
      .delete({ count: "exact" })
      .lt("window_start", rateLimitCutoff.toISOString());
    results.rate_limits_cleaned = rateLimitCount || 0;

    // 4. Count audit log entries older than 1 year (report only, don't delete)
    const auditCutoff = new Date();
    auditCutoff.setFullYear(auditCutoff.getFullYear() - 1);
    const { count: oldAuditCount } = await supabase
      .from("admin_audit_log")
      .select("*", { count: "exact", head: true })
      .lt("created_at", auditCutoff.toISOString());
    results.old_audit_entries = oldAuditCount || 0;

    console.log("Cleanup completed:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
