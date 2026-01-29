import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GetMessageTemplateRequest {
  templateKey: string;
  variables?: Record<string, string>;
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateKey, variables = {} }: GetMessageTemplateRequest = await req.json();

    if (!templateKey) {
      return new Response(
        JSON.stringify({ error: "Missing required field: templateKey" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: template, error } = await supabase
      .from("message_templates")
      .select("*")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("Error fetching template:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch template" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!template) {
      return new Response(
        JSON.stringify({ error: "Template not found or inactive" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Replace variables in the message content
    const processedContent = replaceVariables(template.message_content, variables);

    return new Response(
      JSON.stringify({
        success: true,
        template: {
          ...template,
          processed_content: processedContent,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in get-message-template function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
