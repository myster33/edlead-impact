import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

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
  applicantPhone?: string;
  parentPhone?: string;
  applicantPhotoUrl?: string;
}

// Format phone number to E.164 format
function formatPhoneToE164(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

// Default SMS templates
const defaultSmsTemplates: Record<string, Record<string, string>> = {
  learner: {
    approved: "🎉 Congratulations {{applicant_name}}! Your edLEAD application ({{reference_number}}) has been APPROVED! We'll be in touch with next steps soon. - edLEAD Team",
    rejected: "Dear {{applicant_name}}, Thank you for applying to edLEAD ({{reference_number}}). Unfortunately, we cannot offer you a place at this time. We encourage you to apply again. - edLEAD Team",
    pending: "Dear {{applicant_name}}, Your edLEAD application ({{reference_number}}) is now under review. We'll notify you once a decision is made. - edLEAD Team",
    cancelled: "Dear {{applicant_name}}, Your edLEAD application ({{reference_number}}) has been cancelled. Contact us if you have questions. - edLEAD Team",
  },
  parent: {
    approved: "🎉 Great news! {{applicant_name}}'s edLEAD application ({{reference_number}}) has been APPROVED! We'll send more details soon. - edLEAD Team",
    rejected: "Dear Parent/Guardian, {{applicant_name}}'s edLEAD application ({{reference_number}}) was not successful. We encourage them to apply again. - edLEAD Team",
    pending: "Dear Parent/Guardian, {{applicant_name}}'s edLEAD application ({{reference_number}}) is under review. We'll notify you once decided. - edLEAD Team",
    cancelled: "Dear Parent/Guardian, {{applicant_name}}'s edLEAD application ({{reference_number}}) has been cancelled. Contact us if needed. - edLEAD Team",
  },
};

// Default email templates for learners
const defaultLearnerTemplates: Record<string, { subject: string; html_content: string }> = {
  pending: {
    subject: "Your edLEAD Application Status Has Been Updated",
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Under Review</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong>.</p>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>New Status:</strong> Pending</p>
      </div>
      <p>Your application has been moved back to pending review status.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Cancelled</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Your edLEAD application ({{reference_number}}) has been cancelled.</p>
      <p>If you believe this was done in error, please contact our support team.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">🎉 Congratulations!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>Your application to the edLEAD Leadership Programme has been approved!</p>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>Status:</strong> Approved</p>
      </div>
      <p>Our team will be in touch shortly with more details about the programme.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Update</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{applicant_name}},</p>
      <p>After careful consideration, we regret to inform you that we are unable to offer you a place in the programme at this time.</p>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
      </div>
      <p>We encourage you to continue developing your leadership skills and consider applying again in future intake periods.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
      <p>© 2026 edLEAD Programme. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
  },
};

// Default email templates for parents
const defaultParentTemplates: Record<string, { subject: string; html_content: string }> = {
  pending: {
    subject: "Update on Your Child's edLEAD Application",
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Under Review</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p><strong>{{applicant_name}}'s</strong> application to edLEAD ({{reference_number}}) is under review.</p>
      <p>We will notify you once a decision has been made.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Cancelled</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p><strong>{{applicant_name}}'s</strong> edLEAD application ({{reference_number}}) has been cancelled.</p>
      <p>If you have questions, please contact our support team.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">🎉 Congratulations!</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p><strong>{{applicant_name}}'s</strong> application to edLEAD has been approved!</p>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
        <p><strong>Status:</strong> Approved</p>
      </div>
      <p>Our team will be in touch with next steps.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
      <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
      <h1 style="color: #ffffff;">Application Update</h1>
    </div>
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
      <p>Dear {{parent_name}},</p>
      <p>After careful consideration, we are unable to offer <strong>{{applicant_name}}</strong> a place in the programme at this time.</p>
      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Reference Number:</strong> {{reference_number}}</p>
      </div>
      <p>We encourage your child to apply again in future intake periods.</p>
      <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
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

async function getMessageTemplate(supabase: any, templateKey: string): Promise<string | null> {
  try {
    const { data: template, error } = await supabase
      .from("message_templates")
      .select("message_content")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      return null;
    }
    return template.message_content;
  } catch (err) {
    console.error("Error fetching message template:", err);
    return null;
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

async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio SMS credentials not configured");
    return { success: false, error: "SMS not configured" };
  }

  try {
    const formattedPhone = formatPhoneToE164(to);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Twilio SMS error:", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    console.log("SMS sent successfully:", data.sid);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending SMS:", error);
    return { success: false, error: error.message };
  }
}

async function sendWhatsApp(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    console.log("Twilio WhatsApp credentials not configured");
    return { success: false, error: "WhatsApp not configured" };
  }

  try {
    const formattedPhone = formatPhoneToE164(to);
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Clean the WhatsApp From number — remove spaces and ensure proper format
    const cleanedFromNumber = TWILIO_WHATSAPP_NUMBER.replace(/\s/g, "");
    const formattedFrom = cleanedFromNumber.startsWith("whatsapp:")
      ? cleanedFromNumber
      : `whatsapp:${cleanedFromNumber}`;

    console.log(`Sending WhatsApp from ${formattedFrom} to whatsapp:${formattedPhone}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: `whatsapp:${formattedPhone}`,
        From: formattedFrom,
        Body: message,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Twilio WhatsApp error:", data);
      return { success: false, error: data.message || "Failed to send WhatsApp" };
    }

    console.log("WhatsApp sent successfully:", data.sid);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      applicantEmail, 
      applicantName, 
      referenceNumber, 
      newStatus, 
      oldStatus, 
      parentEmail, 
      parentName,
      applicantPhone,
      parentPhone,
      applicantPhotoUrl
    }: StatusChangeRequest = await req.json();

    console.log(`Sending status change notification: ${oldStatus} -> ${newStatus}`);
    console.log(`Applicant phone: ${applicantPhone}, Parent phone: ${parentPhone}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate social banner for approved status
    let socialBannerUrl: string | null = null;
    if (newStatus === "approved") {
      try {
        console.log("Generating social media banner for approved applicant...");
        const bannerResponse = await fetch(`${supabaseUrl}/functions/v1/generate-social-banner`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            applicantName,
            applicantPhotoUrl: applicantPhotoUrl || "",
          }),
        });

        if (bannerResponse.ok) {
          const bannerData = await bannerResponse.json();
          socialBannerUrl = bannerData.bannerUrl;
          console.log("Social banner generated:", socialBannerUrl ? "success" : "no URL");
        } else {
          console.error("Failed to generate banner:", await bannerResponse.text());
        }
      } catch (bannerError) {
        console.error("Error generating social banner:", bannerError);
      }
    }

    // Check notification settings
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["parent_emails_enabled", "sms_notifications_enabled", "whatsapp_notifications_enabled"]);

    const settings: Record<string, boolean> = {};
    settingsData?.forEach((s: any) => {
      settings[s.setting_key] = s.setting_value === true || s.setting_value === "true";
    });

    const parentEmailsEnabled = settings.parent_emails_enabled ?? false;
    const smsEnabled = settings.sms_notifications_enabled ?? false;
    const whatsappEnabled = settings.whatsapp_notifications_enabled ?? false;

    console.log(`Settings - Parent emails: ${parentEmailsEnabled}, SMS: ${smsEnabled}, WhatsApp: ${whatsappEnabled}`);

    const results = {
      learner: { email: false, sms: false, whatsapp: false },
      parent: { email: false, sms: false, whatsapp: false },
    };

    const variables = {
      applicant_name: applicantName,
      reference_number: referenceNumber,
      new_status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
      old_status: oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1),
    };

    const parentVariables = {
      ...variables,
      parent_name: parentName && parentName.trim() !== "" ? parentName : "Parent/Guardian",
    };

    // --- LEARNER NOTIFICATIONS ---
    
    // Email
    const learnerTemplateKey = `applicant-status-${newStatus}`;
    const learnerTemplate = await getEmailTemplate(supabase, learnerTemplateKey, newStatus, false);
    const learnerSubject = replaceVariables(learnerTemplate.subject, variables);
    let learnerHtmlContent = replaceVariables(learnerTemplate.html_content, variables);
    
    // Add social banner section for approved status
    if (newStatus === "approved" && socialBannerUrl) {
      const socialBannerSection = `
        <div style="margin: 30px 0; text-align: center; padding: 20px; background: #fff8f5; border-radius: 8px;">
          <h3 style="color: #ED7621; margin-bottom: 15px; font-size: 18px;">🎉 Share Your Achievement!</h3>
          <p style="font-size: 14px; color: #666; margin-bottom: 15px;">
            We've created a special shareable image for you. Download and share on your social media to celebrate!
          </p>
          <img src="${socialBannerUrl}" alt="Your edLEAD Acceptance Banner" style="max-width: 400px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
          <p style="font-size: 12px; color: #888; margin-top: 10px;">
            Tag us <strong>@edlead_za</strong> when you share! 📱
          </p>
          <a href="${socialBannerUrl}" download="edLEAD-Acceptance-${applicantName.replace(/[^a-zA-Z0-9]/g, '_')}.png" 
             style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #ED7621; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
            📥 Download Your Banner
          </a>
        </div>
      `;
      
      // Insert before "Warm regards" or at the end of content
      const insertPoint = learnerHtmlContent.lastIndexOf("<p>Warm regards");
      if (insertPoint > 0) {
        learnerHtmlContent = learnerHtmlContent.slice(0, insertPoint) + socialBannerSection + learnerHtmlContent.slice(insertPoint);
      } else {
        // Fallback: insert before the footer section
        const footerIndex = learnerHtmlContent.lastIndexOf("</div>");
        if (footerIndex > 0) {
          const secondLastDiv = learnerHtmlContent.lastIndexOf("</div>", footerIndex - 1);
          if (secondLastDiv > 0) {
            learnerHtmlContent = learnerHtmlContent.slice(0, secondLastDiv) + socialBannerSection + learnerHtmlContent.slice(secondLastDiv);
          }
        }
      }
    }
    
    console.log(`Sending learner email to: ${applicantEmail}`);
    const learnerEmailResult = await sendEmail(applicantEmail, learnerSubject, learnerHtmlContent);
    results.learner.email = learnerEmailResult.success;

    // SMS
    if (smsEnabled && applicantPhone) {
      const smsTemplateKey = `status_${newStatus}_learner_sms`;
      let smsContent = await getMessageTemplate(supabase, smsTemplateKey);
      if (!smsContent) {
        smsContent = defaultSmsTemplates.learner[newStatus] || defaultSmsTemplates.learner.pending;
      }
      const smsMessage = replaceVariables(smsContent, variables);
      console.log(`Sending learner SMS to: ${applicantPhone}`);
      const smsResult = await sendSms(applicantPhone, smsMessage);
      results.learner.sms = smsResult.success;
    }

    // WhatsApp
    if (whatsappEnabled && applicantPhone) {
      const waTemplateKey = `status_${newStatus}_learner_whatsapp`;
      let waContent = await getMessageTemplate(supabase, waTemplateKey);
      if (!waContent) {
        waContent = defaultSmsTemplates.learner[newStatus] || defaultSmsTemplates.learner.pending;
      }
      const waMessage = replaceVariables(waContent, variables);
      console.log(`Sending learner WhatsApp to: ${applicantPhone}`);
      const waResult = await sendWhatsApp(applicantPhone, waMessage);
      results.learner.whatsapp = waResult.success;
    }

    // --- PARENT NOTIFICATIONS ---
    
    // Email
    if (parentEmailsEnabled && parentEmail && parentEmail.trim() !== "" && parentEmail !== applicantEmail) {
      const parentTemplateKey = `parent-status-${newStatus}`;
      const parentTemplate = await getEmailTemplate(supabase, parentTemplateKey, newStatus, true);
      const parentSubject = replaceVariables(parentTemplate.subject, parentVariables);
      const parentHtmlContent = replaceVariables(parentTemplate.html_content, parentVariables);

      console.log(`Sending parent email to: ${parentEmail}`);
      const parentEmailResult = await sendEmail(parentEmail, parentSubject, parentHtmlContent);
      results.parent.email = parentEmailResult.success;
    }

    // SMS
    if (smsEnabled && parentPhone && parentPhone !== applicantPhone) {
      const smsTemplateKey = `status_${newStatus}_parent_sms`;
      let smsContent = await getMessageTemplate(supabase, smsTemplateKey);
      if (!smsContent) {
        smsContent = defaultSmsTemplates.parent[newStatus] || defaultSmsTemplates.parent.pending;
      }
      const smsMessage = replaceVariables(smsContent, parentVariables);
      console.log(`Sending parent SMS to: ${parentPhone}`);
      const smsResult = await sendSms(parentPhone, smsMessage);
      results.parent.sms = smsResult.success;
    }

    // WhatsApp
    if (whatsappEnabled && parentPhone && parentPhone !== applicantPhone) {
      const waTemplateKey = `status_${newStatus}_parent_whatsapp`;
      let waContent = await getMessageTemplate(supabase, waTemplateKey);
      if (!waContent) {
        waContent = defaultSmsTemplates.parent[newStatus] || defaultSmsTemplates.parent.pending;
      }
      const waMessage = replaceVariables(waContent, parentVariables);
      console.log(`Sending parent WhatsApp to: ${parentPhone}`);
      const waResult = await sendWhatsApp(parentPhone, waMessage);
      results.parent.whatsapp = waResult.success;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      settings: { parentEmailsEnabled, smsEnabled, whatsappEnabled },
      message: `Notifications sent for status change: ${oldStatus} -> ${newStatus}`
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
