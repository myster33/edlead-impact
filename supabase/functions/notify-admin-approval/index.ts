import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminApprovalRequest {
  email: string;
  role: string;
  country?: string;
  province?: string;
}

// Default template as fallback
const defaultTemplate = {
  subject: "✅ Your edLEAD Admin Access Has Been Approved",
  html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header img { max-width: 280px; height: auto; margin-bottom: 15px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .content p { color: #e5e7eb !important; }
      .highlight { background-color: #1e3a8a !important; }
      .highlight p { color: #bfdbfe !important; }
      .footer { color: #9ca3af !important; }
      .footer p { color: #9ca3af !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://edlead.co.za/images/edlead-logo-full.png" alt="edLEAD - Transforming Student Leaders" />
      <h1>✅ Access Approved!</h1>
    </div>
    <div class="content">
      <p>Great news! Your request to access the <strong>edLEAD Admin Dashboard</strong> has been approved.</p>
      
      <div class="highlight">
        <p><strong>Your Access Details:</strong></p>
        <p><strong>Role:</strong> {{role_display_name}}</p>
        <p><strong>Assigned Region:</strong> {{region_text}}</p>
      </div>
      
      <p style="text-align: center;">
        <a href="{{dashboard_url}}" class="button" style="color: white;">
          Access Dashboard
        </a>
      </p>
      
      <p>Welcome to the team!</p>
      <p>Best regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer">
      <p>This email was sent because your admin access was approved.</p>
    </div>
  </div>
</body>
</html>`,
};

async function getEmailTemplate(supabase: any, templateKey: string) {
  try {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      console.log(`Using default template for ${templateKey}`);
      return defaultTemplate;
    }

    console.log(`Loaded template from database: ${templateKey}`);
    return template;
  } catch (err) {
    console.error("Error fetching template:", err);
    return defaultTemplate;
  }
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, country, province }: AdminApprovalRequest = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template from database
    const template = await getEmailTemplate(supabase, "admin-approved");

    const regionText = country && province ? `${province}, ${country}` : country || province || "All regions";
    const roleDisplayName = role === "admin" ? "Administrator" : role === "reviewer" ? "Reviewer" : "Viewer";
    const dashboardUrl = Deno.env.get("SITE_URL") || "https://edlead.lovable.app";

    // Replace variables
    const variables = {
      role_display_name: roleDisplayName,
      region_text: regionText,
      dashboard_url: `${dashboardUrl}/admin`,
    };

    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [email],
        subject,
        html: htmlContent,
      }),
    });

    const data = await emailResponse.json();
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
