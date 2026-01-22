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
  parentEmail?: string;
  parentName?: string;
}

// Default templates for learners
const defaultLearnerTemplates: Record<string, { subject: string; html_content: string }> = {
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Under Review</h1>
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
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Cancelled</h1>
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
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">🎉 Congratulations!</h1>
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
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Update</h1>
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
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
};

// Default templates for parents/guardians
const defaultParentTemplates: Record<string, { subject: string; html_content: string }> = {
  pending: {
    subject: "Update on Your Child's edLEAD Application",
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Under Review</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p>We are writing to inform you about an update regarding <strong>{{applicant_name}}'s</strong> application to the <strong>edLEAD Leadership Programme</strong>.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Applicant:</strong> {{applicant_name}}</p>
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Pending</p>
      </div>
      <p>The application has been moved back to pending review status. Our team is reviewing the application again. This may happen when:</p>
      <ul>
        <li>Additional information needs to be verified</li>
        <li>The application is being reconsidered</li>
        <li>There are updates to the review process</li>
      </ul>
      <p>We will notify both you and your child once a decision has been made.</p>
      <p>Thank you for your patience and support in your child's leadership development journey.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
  cancelled: {
    subject: "Your Child's edLEAD Application Has Been Cancelled",
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Cancelled</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p>We are writing to inform you that <strong>{{applicant_name}}'s</strong> application to the <strong>edLEAD Leadership Programme</strong> has been cancelled.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Applicant:</strong> {{applicant_name}}</p>
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Cancelled</p>
      </div>
      <p>If you believe this was done in error or would like more information, please contact our support team.</p>
      <p>Your child is welcome to submit a new application if they wish to be considered for future intakes.</p>
      <p>Thank you for your interest in the edLEAD Leadership Programme.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
  approved: {
    subject: "🎉 Great News! Your Child's edLEAD Application Has Been Approved",
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">🎉 Congratulations!</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p>We are thrilled to inform you that <strong>{{applicant_name}}'s</strong> application to the <strong>edLEAD Leadership Programme</strong> has been approved!</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Applicant:</strong> {{applicant_name}}</p>
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Approved</p>
      </div>
      <p>This is an exciting milestone in your child's leadership journey. Our team will be in touch shortly with more details about the programme, including:</p>
      <ul>
        <li>Programme orientation dates</li>
        <li>Required materials and resources</li>
        <li>Next steps for enrollment</li>
        <li>Information for parents/guardians</li>
      </ul>
      <p>As a parent/guardian, your support is invaluable to your child's success in this programme. Please ensure they have access to a device with internet connectivity, as many of our programme activities will be conducted online.</p>
      <p>Thank you for supporting your child's leadership development. We look forward to working together!</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
  rejected: {
    subject: "Update on Your Child's edLEAD Application",
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
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Update</h1>
    </div>
    <div class="content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p>We are writing to inform you about the outcome of <strong>{{applicant_name}}'s</strong> application to the <strong>edLEAD Leadership Programme</strong>.</p>
      <div class="highlight" style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Applicant:</strong> {{applicant_name}}</p>
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Not Successful</p>
      </div>
      <p>After careful consideration, we regret to inform you that we are unable to offer your child a place in the programme at this time.</p>
      <p>This decision was not easy, as we received many strong applications. We encourage you to support your child in:</p>
      <ul>
        <li>Continuing to develop their leadership skills in school and community</li>
        <li>Seeking out other leadership opportunities and programmes</li>
        <li>Considering applying again in future intake periods</li>
      </ul>
      <p>We truly appreciate your child's enthusiasm for leadership and your support as a parent/guardian. We wish your child the very best in their future endeavours.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div class="footer" style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
};

async function getEmailTemplate(supabase: any, templateKey: string, status: string, isParent: boolean = false) {
  try {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      console.log(`Using default template for ${templateKey}`);
      const templates = isParent ? defaultParentTemplates : defaultLearnerTemplates;
      return templates[status] || templates.pending;
    }

    console.log(`Loaded template from database: ${templateKey}`);
    return template;
  } catch (err) {
    console.error("Error fetching template:", err);
    const templates = isParent ? defaultParentTemplates : defaultLearnerTemplates;
    return templates[status] || templates.pending;
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
    const { applicantEmail, applicantName, referenceNumber, newStatus, oldStatus, parentEmail, parentName }: StatusChangeRequest = await req.json();

    console.log(`Sending status change notification: ${oldStatus} -> ${newStatus}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: { learner: boolean; parent: boolean } = { learner: false, parent: false };

    // Send learner email
    const learnerTemplateKey = `applicant-status-${newStatus}`;
    const learnerTemplate = await getEmailTemplate(supabase, learnerTemplateKey, newStatus, false);
    
    const learnerVariables = {
      applicant_name: applicantName,
      reference_number: referenceNumber,
      new_status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      old_status: oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1),
    };

    const learnerSubject = replaceVariables(learnerTemplate.subject, learnerVariables);
    const learnerHtmlContent = replaceVariables(learnerTemplate.html_content, learnerVariables);

    console.log(`Sending learner notification to: ${applicantEmail}`);
    const learnerResult = await sendEmail(applicantEmail, learnerSubject, learnerHtmlContent);
    results.learner = learnerResult.success;

    // Send parent email if parent email is provided and different from learner
    if (parentEmail && parentEmail.trim() !== "" && parentEmail !== applicantEmail) {
      const parentTemplateKey = `parent-status-${newStatus}`;
      const parentTemplate = await getEmailTemplate(supabase, parentTemplateKey, newStatus, true);
      
      const displayParentName = parentName && parentName.trim() !== "" ? parentName : "Parent/Guardian";
      
      const parentVariables = {
        parent_name: displayParentName,
        applicant_name: applicantName,
        reference_number: referenceNumber,
        new_status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
        old_status: oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1),
      };

      const parentSubject = replaceVariables(parentTemplate.subject, parentVariables);
      const parentHtmlContent = replaceVariables(parentTemplate.html_content, parentVariables);

      console.log(`Sending parent notification to: ${parentEmail}`);
      const parentResult = await sendEmail(parentEmail, parentSubject, parentHtmlContent);
      results.parent = parentResult.success;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Learner: ${results.learner ? 'sent' : 'failed'}, Parent: ${parentEmail ? (results.parent ? 'sent' : 'failed') : 'not applicable'}`
    }), {
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
