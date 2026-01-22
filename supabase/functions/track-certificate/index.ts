import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 1x1 transparent GIF for tracking pixel
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
]);

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const trackingId = url.searchParams.get("tid");
  const action = url.searchParams.get("action") || "open";

  console.log(`Tracking request: action=${action}, trackingId=${trackingId}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!trackingId) {
    // Return pixel anyway to not break emails
    return new Response(TRACKING_PIXEL, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "open") {
      // First get current count
      const { data: current } = await supabase
        .from("certificate_recipients")
        .select("open_count")
        .eq("tracking_id", trackingId)
        .maybeSingle();

      // Track email open with incremented count
      const { error } = await supabase
        .from("certificate_recipients")
        .update({
          email_opened: true,
          email_opened_at: new Date().toISOString(),
          open_count: (current?.open_count || 0) + 1,
        })
        .eq("tracking_id", trackingId);

      if (error) {
        console.error("Error tracking open:", error);
      } else {
        console.log(`Tracked email open for tracking_id: ${trackingId}`);
      }

      // Return tracking pixel
      return new Response(TRACKING_PIXEL, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } else if (action === "download") {
      // Track certificate download
      const { data: recipient, error: fetchError } = await supabase
        .from("certificate_recipients")
        .select("download_count")
        .eq("tracking_id", trackingId)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching recipient:", fetchError);
      }

      const { error } = await supabase
        .from("certificate_recipients")
        .update({
          certificate_downloaded: true,
          certificate_downloaded_at: new Date().toISOString(),
          download_count: (recipient?.download_count || 0) + 1,
        })
        .eq("tracking_id", trackingId);

      if (error) {
        console.error("Error tracking download:", error);
        return new Response(
          JSON.stringify({ error: "Failed to track download" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Tracked certificate download for tracking_id: ${trackingId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in track-certificate:", error);
    
    // Still return pixel for opens to not break emails
    if (action === "open") {
      return new Response(TRACKING_PIXEL, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
