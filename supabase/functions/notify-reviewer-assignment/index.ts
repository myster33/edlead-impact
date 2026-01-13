import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentRequest {
  reviewer_email: string;
  reviewer_name: string | null;
  country: string | null;
  province: string | null;
  role: string;
}

// Default template as fallback
const defaultTemplate = {
  subject: "Region Assignment: {{region_text}}",
  html_content: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
      :root { color-scheme: light dark; }
      @media (prefers-color-scheme: dark) {
        body { background-color: #1a1a2e !important; }
        .email-content { background-color: #1f2937 !important; border-color: #374151 !important; }
        .email-content p { color: #e5e7eb !important; }
        .region-box { background-color: #374151 !important; border-color: #60a5fa !important; }
        .region-box p { color: #60a5fa !important; }
        .pending-box { background-color: #78350f !important; }
        .pending-box p { color: #fef3c7 !important; }
        .footer-text p { color: #9ca3af !important; }
      }
    </style>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-full.png" alt="edLEAD" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
      <h2 style="margin: 0; font-size: 20px;">Region Assignment</h2>
    </div>
    
    <div class="email-content" style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
      <p style="font-size: 16px; margin-bottom: 20px;">Hello {{display_name}},</p>
      
      <p style="margin-bottom: 20px;">You have been assigned as a <strong>{{role_text}}</strong> for the following region:</p>
      
      <div class="region-box" style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e40af;">{{region_text}}</p>
      </div>
      
      <div class="pending-box" style="background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #92400e;">
          <strong>📋 Pending Applications:</strong> {{pending_count}} application{{pending_suffix}} awaiting review
        </p>
      </div>
      
      <p style="margin-bottom: 20px;">{{role_description}}</p>
      
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://edlead.lovable.app/admin/dashboard" style="display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
    </div>
    
    <div class="footer-text" style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
      <p style="margin: 0;">This is an automated message from edLEAD Admin Portal.</p>
      <p style="margin: 5px 0 0;">Please do not reply to this email.</p>
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

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewer_email, reviewer_name, country, province, role }: AssignmentRequest = await req.json();

    if (!reviewer_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Reviewer email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get pending applications count for the assigned region
    let query = supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (province) {
      query = query.eq("province", province);
    }

    const { count: pendingCount, error: countError } = await query;

    if (countError) {
      console.error("Error fetching pending count:", countError);
    }

    // Get template from database
    const template = await getEmailTemplate(supabase, "reviewer-assignment");

    const regionText = province 
      ? `${province}${country ? `, ${country}` : ""}`
      : country || "All regions";

    const displayName = reviewer_name || reviewer_email.split("@")[0];
    const roleText = role === "reviewer" ? "Reviewer" : "Viewer";
    const roleDescription = role === "reviewer" 
      ? "As a Reviewer, you can view and approve/reject applications from your assigned region."
      : "As a Viewer, you can view applications from your assigned region.";

    // Replace variables
    const variables = {
      display_name: displayName,
      role_text: roleText,
      role_description: roleDescription,
      region_text: regionText,
      pending_count: String(pendingCount || 0),
      pending_suffix: (pendingCount || 0) !== 1 ? "s" : "",
    };

    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "edLEAD <noreply@edlead.co.za>",
      to: [reviewer_email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Region assignment notification sent to:", reviewer_email);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in notify-reviewer-assignment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
