import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TemplateRequest {
  template_key: string;
}

interface EmailTemplate {
  subject: string;
  html_content: string;
  variables: string[];
}

// Default templates as fallback
const defaultTemplates: Record<string, EmailTemplate> = {
  "applicant-approved": {
    subject: "🎉 Congratulations! Your edLEAD Application Has Been Approved",
    variables: ["applicant_name", "reference_number"],
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
      .bg-light { background-color: #374151 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div class="email-header" style="background: #4A4A4A; padding: 0; text-align: center;">
          <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" style="width: 100%; height: auto; display: block;">
        </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{applicant_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Congratulations! 🎉 We are thrilled to inform you that your application to the edLEAD Programme has been <strong style="color: #10b981;">approved</strong>!</p>
        <div class="bg-light" style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Reference Number:</strong> {{reference_number}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">We will be in touch shortly with next steps and additional information about the programme.</p>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  "applicant-rejected": {
    subject: "Update on Your edLEAD Application",
    variables: ["applicant_name", "reference_number"],
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
      <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div class="email-header" style="background: #4A4A4A; padding: 0; text-align: center;">
          <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" style="width: 100%; height: auto; display: block;">
        </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{applicant_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Thank you for your interest in the edLEAD Programme. After careful consideration, we regret to inform you that your application was not successful at this time.</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">We encourage you to apply again in the future. Keep developing your leadership skills!</p>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_key }: TemplateRequest = await req.json();

    if (!template_key) {
      return new Response(
        JSON.stringify({ error: "template_key is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to get template from database
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, html_content, variables")
      .eq("template_key", template_key)
      .eq("is_active", true)
      .single();

    if (error || !template) {
      // Fall back to default template
      const defaultTemplate = defaultTemplates[template_key];
      if (defaultTemplate) {
        console.log(`Using default template for ${template_key}`);
        return new Response(
          JSON.stringify(defaultTemplate),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Template not found: ${template_key}` }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Loaded template from database: ${template_key}`);
    return new Response(
      JSON.stringify({
        subject: template.subject,
        html_content: template.html_content,
        variables: template.variables,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error fetching email template:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
