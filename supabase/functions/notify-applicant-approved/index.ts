import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicantApprovedRequest {
  applicantEmail: string;
  applicantName: string;
  referenceNumber: string;
  parentEmail?: string;
  parentName?: string;
}

// Default template as fallback
const defaultTemplate = {
  subject: "🎉 Congratulations! Your edLEAD Application Has Been Approved",
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
      <div class="email-header" style="background-color: #4A4A4A; padding: 30px; text-align: center;">
        <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Application Approved!</h2>
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
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2026 edLEAD Programme. All rights reserved.</p>
      </div>
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
    const { applicantEmail, applicantName, referenceNumber, parentEmail, parentName }: ApplicantApprovedRequest = await req.json();

    console.log(`Sending approval notification to applicant: ${applicantEmail}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template from database
    const template = await getEmailTemplate(supabase, "applicant-approved");

    // Replace variables
    const variables = {
      applicant_name: applicantName,
      reference_number: referenceNumber,
    };

    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    // Build recipient list - always include applicant, optionally include parent
    const recipients = [applicantEmail];
    if (parentEmail && parentEmail.trim() !== "" && parentEmail !== applicantEmail) {
      recipients.push(parentEmail);
      console.log(`Also sending to parent: ${parentEmail}`);
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: recipients,
        subject,
        html: htmlContent,
      }),
    });

    const data = await emailResponse.json();
    console.log("Approval notification sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data, recipients }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
