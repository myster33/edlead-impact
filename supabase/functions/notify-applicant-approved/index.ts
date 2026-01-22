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

// Default template for learner
const defaultLearnerTemplate = {
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
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Application Approved!</h2>
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

// Default template for parent/guardian
const defaultParentTemplate = {
  subject: "🎉 Great News! Your Child's edLEAD Application Has Been Approved",
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
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Application Approved!</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{parent_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">We are thrilled to inform you that <strong>{{applicant_name}}'s</strong> application to the edLEAD Programme has been <strong style="color: #10b981;">approved</strong>!</p>
        <div class="bg-light" style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Applicant:</strong> {{applicant_name}}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Reference Number:</strong> {{reference_number}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">This is an exciting milestone in your child's leadership journey. As a parent/guardian, your support is invaluable to their success in this programme.</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">We will be in touch shortly with next steps and additional information about the programme, including orientation dates and resources for parents.</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Thank you for supporting your child's leadership development!</p>
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

async function getEmailTemplate(supabase: any, templateKey: string, isParent: boolean = false) {
  try {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      console.log(`Using default template for ${templateKey}`);
      return isParent ? defaultParentTemplate : defaultLearnerTemplate;
    }

    console.log(`Loaded template from database: ${templateKey}`);
    return template;
  } catch (err) {
    console.error("Error fetching template:", err);
    return isParent ? defaultParentTemplate : defaultLearnerTemplate;
  }
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
      return { success: false, error: errorData.message || "Failed to send email" };
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
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

    // Check if parent emails are enabled globally
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "parent_emails_enabled")
      .maybeSingle();
    
    const parentEmailsEnabled = settingsData?.setting_value === true || settingsData?.setting_value === "true";
    console.log(`Parent emails enabled: ${parentEmailsEnabled}`);

    const results: { learner: boolean; parent: boolean } = { learner: false, parent: false };

    // Send learner email
    const learnerTemplate = await getEmailTemplate(supabase, "applicant-approved", false);
    const learnerVariables = {
      applicant_name: applicantName,
      reference_number: referenceNumber,
    };
    const learnerSubject = replaceVariables(learnerTemplate.subject, learnerVariables);
    const learnerHtmlContent = replaceVariables(learnerTemplate.html_content, learnerVariables);

    const learnerResult = await sendEmail(applicantEmail, learnerSubject, learnerHtmlContent);
    results.learner = learnerResult.success;
    console.log("Learner approval notification sent:", learnerResult.success);

    // Send parent email if parent emails are enabled, and parent email is provided and different from learner
    if (parentEmailsEnabled && parentEmail && parentEmail.trim() !== "" && parentEmail !== applicantEmail) {
      const parentTemplate = await getEmailTemplate(supabase, "parent-approved", true);
      const displayParentName = parentName && parentName.trim() !== "" ? parentName : "Parent/Guardian";
      
      const parentVariables = {
        parent_name: displayParentName,
        applicant_name: applicantName,
        reference_number: referenceNumber,
      };
      const parentSubject = replaceVariables(parentTemplate.subject, parentVariables);
      const parentHtmlContent = replaceVariables(parentTemplate.html_content, parentVariables);

      console.log(`Sending parent approval notification to: ${parentEmail}`);
      const parentResult = await sendEmail(parentEmail, parentSubject, parentHtmlContent);
      results.parent = parentResult.success;
      console.log("Parent approval notification sent:", parentResult.success);
    } else if (!parentEmailsEnabled && parentEmail) {
      console.log("Parent emails are disabled globally, skipping parent notification");
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      parentEmailsEnabled,
      message: `Learner: ${results.learner ? 'sent' : 'failed'}, Parent: ${parentEmailsEnabled ? (parentEmail ? (results.parent ? 'sent' : 'failed') : 'not applicable') : 'disabled'}`
    }), {
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
