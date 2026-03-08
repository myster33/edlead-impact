import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA256 signing
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deliverWebhook(
  url: string,
  event: string,
  payload: Record<string, unknown>,
  secret: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const signature = await signPayload(body, secret);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    return { success: response.ok, status: response.status };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { event, payload } = await req.json();

    if (!event || !payload) {
      return new Response(
        JSON.stringify({ error: "event and payload are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get active webhooks subscribed to this event
    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("is_active", true)
      .contains("events", [event]);

    if (error) {
      console.error("Error fetching webhooks:", error);
      throw error;
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active webhooks for this event", event }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.all(
      webhooks.map(async (webhook) => {
        const result = await deliverWebhook(webhook.url, event, payload, webhook.secret);

        // Update webhook metadata
        const updates: Record<string, unknown> = {
          last_triggered_at: new Date().toISOString(),
        };

        if (!result.success) {
          updates.failure_count = (webhook.failure_count || 0) + 1;
          // Disable after 10 consecutive failures
          if ((webhook.failure_count || 0) + 1 >= 10) {
            updates.is_active = false;
          }
        } else {
          updates.failure_count = 0;
        }

        await supabase.from("webhooks").update(updates).eq("id", webhook.id);

        return { webhook_id: webhook.id, url: webhook.url, ...result };
      })
    );

    return new Response(
      JSON.stringify({ event, delivered: results.filter((r) => r.success).length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("fire-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
