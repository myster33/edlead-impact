import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BlogSubmissionRequest {
  title: string;
  author_name: string;
  author_school: string;
  author_province: string;
  author_email: string;
  category: string;
  summary: string;
}

// Default template as fallback
const defaultTemplate = {
  subject: `📝 New Blog Post Submitted: "{{title}}"`,
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
      .email-content { background-color: #1f2937 !important; }
      .email-content p { color: #e5e7eb !important; }
      .details-box { background-color: #374151 !important; }
      .details-box h2 { color: #f3f4f6 !important; }
      .details-box td { color: #e5e7eb !important; }
      .details-box strong { color: #9ca3af !important; }
      .footer-text { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
    <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" style="max-width: 280px; height: auto;" />
    <h1 style="color: #ffffff; margin: 15px 0 0; font-size: 24px;">📝 New Blog Post Submitted</h1>
  </div>
  
  <div class="email-content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
      A new story has been submitted for review on the edLEAD blog.
    </p>
    
    <div class="details-box" style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 0;">{{title}}</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666; width: 120px;"><strong>Author:</strong></td><td style="padding: 8px 0; color: #1a1a1a;">{{author_name}}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;"><strong>School:</strong></td><td style="padding: 8px 0; color: #1a1a1a;">{{author_school}}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;"><strong>Province:</strong></td><td style="padding: 8px 0; color: #1a1a1a;">{{author_province}}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;"><strong>Category:</strong></td><td style="padding: 8px 0; color: #1a1a1a;">{{category}}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td><td style="padding: 8px 0; color: #1a1a1a;">{{author_email}}</td></tr>
      </table>
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
        <strong style="color: #666;">Summary:</strong>
        <p style="color: #1a1a1a; margin: 8px 0 0 0; font-style: italic;">"{{summary}}"</p>
      </div>
    </div>
    
    <p style="color: #4a4a4a; font-size: 14px;">Please log in to the admin panel to review and approve this submission.</p>
  </div>
  
  <p class="footer-text" style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">
    This is an automated notification from the edLEAD platform.
  </p>
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
  console.log("notify-blog-submission function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const submission: BlogSubmissionRequest = await req.json();
    console.log("Received blog submission notification request:", submission.title);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminUsers, error: adminError } = await supabase
      .from("admin_users")
      .select("email");

    if (adminError) {
      console.error("Error fetching admin users:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmails = adminUsers.map(admin => admin.email);

    // Get template from database
    const template = await getEmailTemplate(supabase, "blog-admin-notification");

    // Replace variables
    const variables = {
      title: submission.title,
      author_name: submission.author_name,
      author_school: submission.author_school,
      author_province: submission.author_province,
      author_email: submission.author_email,
      category: submission.category,
      summary: submission.summary,
    };

    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: adminEmails,
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-blog-submission function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
