import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusChangeRequest {
  applicantEmail: string;
  applicantName: string;
  referenceNumber: string;
  newStatus: string;
  oldStatus: string;
}

// Default templates as fallback for each status
const defaultTemplates: Record<string, { subject: string; html_content: string }> = {
  pending: {
    subject: "Your edLEAD Application Status Has Been Updated",
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .content p, .content li { color: #e5e7eb !important; }
      .highlight { background-color: #1e3a8a !important; }
      .highlight p { color: #bfdbfe !important; }
      .footer { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4A4A4A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 280px; height: auto; margin-bottom: 15px;">
      <h1>Application Under Review</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong>.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Pending</p>
      </div>
      <p>Your application has been moved back to pending review status.</p>
      <p>Our team is reviewing your application again. This may happen when:</p>
      <ul>
        <li>Additional information needs to be verified</li>
        <li>Your application is being reconsidered</li>
        <li>There are updates to the review process</li>
      </ul>
      <p>We will notify you once a decision has been made.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>This email was sent regarding your edLEAD application.</p>
    </div>
  </div>
</body>
</html>`,
  },
  cancelled: {
    subject: "Your edLEAD Application Has Been Cancelled",
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .content p { color: #e5e7eb !important; }
      .highlight { background-color: #1e3a8a !important; }
      .highlight p { color: #bfdbfe !important; }
      .footer { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4A4A4A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 280px; height: auto; margin-bottom: 15px;">
      <h1>Application Cancelled</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong>.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Cancelled</p>
      </div>
      <p>Your application has been cancelled.</p>
      <p>If you believe this was done in error or would like more information, please contact our support team.</p>
      <p>You are welcome to submit a new application if you wish to be considered for future intakes.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>This email was sent regarding your edLEAD application.</p>
    </div>
  </div>
</body>
</html>`,
  },
  approved: {
    subject: "🎉 Great News! Your edLEAD Application Has Been Approved",
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .content p, .content li { color: #e5e7eb !important; }
      .highlight { background-color: #1e3a8a !important; }
      .highlight p { color: #bfdbfe !important; }
      .footer { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4A4A4A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 280px; height: auto; margin-bottom: 15px;">
      <h1>🎉 Congratulations!</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong>.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Approved</p>
      </div>
      <p>Your application to the edLEAD Leadership Programme has been approved!</p>
      <p>This is an exciting first step on your leadership journey. Our team will be in touch shortly with more details about the programme, including:</p>
      <ul>
        <li>Programme orientation dates</li>
        <li>Required materials and resources</li>
        <li>Next steps for enrollment</li>
      </ul>
      <p>In the meantime, please ensure you have access to a device with internet connectivity, as many of our programme activities will be conducted online.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>This email was sent regarding your edLEAD application.</p>
    </div>
  </div>
</body>
</html>`,
  },
  rejected: {
    subject: "Update on Your edLEAD Application",
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .content p, .content li { color: #e5e7eb !important; }
      .highlight { background-color: #1e3a8a !important; }
      .highlight p { color: #bfdbfe !important; }
      .footer { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #4A4A4A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 280px; height: auto; margin-bottom: 15px;">
      <h1>Application Update</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong>.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Rejected</p>
      </div>
      <p>After careful consideration, we regret to inform you that we are unable to offer you a place in the programme at this time.</p>
      <p>This decision was not easy, as we received many strong applications. We encourage you to:</p>
      <ul>
        <li>Continue developing your leadership skills in your school and community</li>
        <li>Seek out other leadership opportunities and programmes</li>
        <li>Consider applying again in future intake periods</li>
      </ul>
      <p>We truly appreciate your enthusiasm for leadership and wish you the very best in your future endeavours.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>This email was sent regarding your edLEAD application.</p>
    </div>
  </div>
</body>
</html>`,
  },
};

async function getEmailTemplate(supabase: any, templateKey: string, status: string) {
  try {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      console.log(`Using default template for ${templateKey}`);
      return defaultTemplates[status] || defaultTemplates.pending;
    }

    console.log(`Loaded template from database: ${templateKey}`);
    return template;
  } catch (err) {
    console.error("Error fetching template:", err);
    return defaultTemplates[status] || defaultTemplates.pending;
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
    const { applicantEmail, applicantName, referenceNumber, newStatus, oldStatus }: StatusChangeRequest = await req.json();

    console.log(`Sending status change notification to ${applicantEmail}: ${oldStatus} -> ${newStatus}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template from database based on status
    const templateKey = `applicant-status-${newStatus}`;
    const template = await getEmailTemplate(supabase, templateKey, newStatus);

    // Replace variables
    const variables = {
      applicant_name: applicantName,
      reference_number: referenceNumber,
      new_status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      old_status: oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1),
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
        to: [applicantEmail],
        subject,
        html: htmlContent,
      }),
    });

    const data = await emailResponse.json();
    console.log("Status change notification sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending status change notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
