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

interface ApplicantApprovedRequest {
  applicantEmail: string;
  applicantName: string;
  referenceNumber: string;
  parentEmail?: string;
  parentName?: string;
  applicantPhone?: string;
  parentPhone?: string;
  applicantPhotoUrl?: string;
}

// Default email templates
const defaultLearnerTemplate = {
  subject: "🎉 Congratulations! Your edLEAD Application Has Been Approved",
  html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
        <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Application Approved!</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6;">Dear <strong>{{applicant_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">Congratulations! 🎉 Your application to the edLEAD Programme has been <strong style="color: #10b981;">approved</strong>!</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Reference Number:</strong> {{reference_number}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">We will be in touch shortly with next steps.</p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
};

const defaultParentTemplate = {
  subject: "🎉 Great News! Your Child's edLEAD Application Has Been Approved",
  html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
        <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 Application Approved!</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6;">Dear <strong>{{parent_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6;">We are thrilled to inform you that <strong>{{applicant_name}}'s</strong> application to the edLEAD Programme has been <strong style="color: #10b981;">approved</strong>!</p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Applicant:</strong> {{applicant_name}}</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Reference Number:</strong> {{reference_number}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6;">We will be in touch shortly with next steps.</p>
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`,
};

// Default SMS/WhatsApp templates
const defaultSmsLearnerMessage = "Hi {{applicant_name}}, congratulations! Your edLEAD application ({{reference_number}}) has been approved. Check your email for details. -edLEAD Team";
const defaultSmsParentMessage = "Dear {{parent_name}}, great news! {{applicant_name}}'s edLEAD application has been approved. Reference: {{reference_number}}. -edLEAD Team";
const defaultWhatsappLearnerMessage = "🎉 *Congratulations {{applicant_name}}!*\n\nYour edLEAD application has been *approved*!\n\n📋 Reference: {{reference_number}}\n\nWe will be in touch shortly with next steps. Check your email for more details.\n\n-The edLEAD Team";
const defaultWhatsappParentMessage = "🎉 *Great News {{parent_name}}!*\n\n{{applicant_name}}'s edLEAD application has been *approved*!\n\n📋 Reference: {{reference_number}}\n\nWe will be in touch shortly with next steps.\n\n-The edLEAD Team";

function formatPhoneToE164(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "+27" + cleaned.substring(1);
  }
  if (cleaned.length === 9 && !cleaned.startsWith("0")) {
    return "+27" + cleaned;
  }
  return "+" + cleaned;
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), value);
  }
  return result;
}

async function getEmailTemplate(supabase: any, templateKey: string, isParent: boolean = false) {
  try {
    const { data: template, error } = await supabase
      .from("email_templates")
      .select("subject, html_content")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) {
      return isParent ? defaultParentTemplate : defaultLearnerTemplate;
    }
    return template;
  } catch (err) {
    return isParent ? defaultParentTemplate : defaultLearnerTemplate;
  }
}

async function getMessageTemplate(supabase: any, templateKey: string, channel: string): Promise<string | null> {
  try {
    const { data: template, error } = await supabase
      .from("message_templates")
      .select("message_content")
      .eq("template_key", templateKey)
      .eq("channel", channel)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !template) return null;
    return template.message_content;
  } catch (err) {
    return null;
  }
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
      return { success: false, error: errorData.message || "Failed to send email" };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { success: false, error: "Twilio SMS not configured" };
  }

  const formattedPhone = formatPhoneToE164(to);
  if (!formattedPhone || formattedPhone.length < 10) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || "Failed to send SMS" };
    }
    return { success: true, sid: data.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function sendWhatsapp(to: string, message: string, mediaUrl?: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
    return { success: false, error: "Twilio WhatsApp not configured" };
  }

  const formattedPhone = formatPhoneToE164(to);
  if (!formattedPhone || formattedPhone.length < 10) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const whatsappFrom = TWILIO_WHATSAPP_NUMBER.startsWith("whatsapp:") 
      ? TWILIO_WHATSAPP_NUMBER 
      : `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

    const params: Record<string, string> = {
      To: `whatsapp:${formattedPhone}`,
      From: whatsappFrom,
      Body: message,
    };

    // Add media URL if provided (for banner image)
    if (mediaUrl && mediaUrl.startsWith("http")) {
      params.MediaUrl = mediaUrl;
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || "Failed to send WhatsApp" };
    }
    return { success: true, sid: data.sid };
  } catch (error: any) {
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
      parentEmail, 
      parentName,
      applicantPhone,
      parentPhone,
      applicantPhotoUrl
    }: ApplicantApprovedRequest = await req.json();

    console.log(`Sending approval notification to applicant: ${applicantEmail}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate social media banner using AI
    let socialBannerUrl: string | null = null;
    try {
      console.log("Generating social media banner...");
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

    // Fetch all system settings at once
    const { data: settingsData } = await supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["parent_emails_enabled", "sms_notifications_enabled", "whatsapp_notifications_enabled"]);

    const settings: Record<string, boolean> = {};
    settingsData?.forEach((s: any) => {
      settings[s.setting_key] = s.setting_value === true || s.setting_value === "true";
    });

    const parentEmailsEnabled = settings.parent_emails_enabled ?? true;
    const smsEnabled = settings.sms_notifications_enabled ?? false;
    const whatsappEnabled = settings.whatsapp_notifications_enabled ?? false;

    console.log(`Settings - Parent emails: ${parentEmailsEnabled}, SMS: ${smsEnabled}, WhatsApp: ${whatsappEnabled}`);

    const results = {
      email: { learner: false, parent: false },
      sms: { learner: false, parent: false },
      whatsapp: { learner: false, parent: false },
      socialBanner: socialBannerUrl ? true : false,
    };

    const variables = {
      applicant_name: applicantName,
      reference_number: referenceNumber,
      parent_name: parentName || "Parent/Guardian",
      social_banner_url: socialBannerUrl || "",
    };

    // Create enhanced email with social banner
    const socialBannerSection = socialBannerUrl ? `
        <div style="margin: 30px 0; text-align: center;">
          <h3 style="color: #ED7621; margin-bottom: 15px;">🎉 Share Your Achievement!</h3>
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
    ` : "";

    // Send learner email with social banner
    const learnerTemplate = await getEmailTemplate(supabase, "applicant-approved", false);
    let learnerHtml = replaceVariables(learnerTemplate.html_content, variables);
    
    // Insert social banner before the closing content div
    if (socialBannerUrl && learnerHtml.includes("</div>")) {
      // Find a good place to insert the banner (before "Best regards" or at end of content)
      const insertPoint = learnerHtml.lastIndexOf("<p style=\"font-size: 14px; color: #6b7280; margin-top: 30px;\">Best regards");
      if (insertPoint > 0) {
        learnerHtml = learnerHtml.slice(0, insertPoint) + socialBannerSection + learnerHtml.slice(insertPoint);
      } else {
        // Fallback: insert before last closing div
        const lastDivIndex = learnerHtml.lastIndexOf("</div>");
        if (lastDivIndex > 0) {
          learnerHtml = learnerHtml.slice(0, lastDivIndex) + socialBannerSection + learnerHtml.slice(lastDivIndex);
        }
      }
    }
    
    const learnerSubject = replaceVariables(learnerTemplate.subject, variables);
    const learnerEmailResult = await sendEmail(applicantEmail, learnerSubject, learnerHtml);
    results.email.learner = learnerEmailResult.success;
    console.log("Learner email sent:", learnerEmailResult.success);

    // Send parent email if enabled
    if (parentEmailsEnabled && parentEmail && parentEmail.trim() !== "" && parentEmail !== applicantEmail) {
      const parentTemplate = await getEmailTemplate(supabase, "parent-approved", true);
      const parentSubject = replaceVariables(parentTemplate.subject, variables);
      const parentHtml = replaceVariables(parentTemplate.html_content, variables);
      const parentEmailResult = await sendEmail(parentEmail, parentSubject, parentHtml);
      results.email.parent = parentEmailResult.success;
      console.log("Parent email sent:", parentEmailResult.success);
    }

    // Send SMS if enabled
    if (smsEnabled) {
      // Learner SMS
      if (applicantPhone) {
        const smsTemplate = await getMessageTemplate(supabase, "approved_learner_sms", "sms") || defaultSmsLearnerMessage;
        const smsMessage = replaceVariables(smsTemplate, variables);
        const smsResult = await sendSms(applicantPhone, smsMessage);
        results.sms.learner = smsResult.success;
        console.log("Learner SMS sent:", smsResult.success, smsResult.error || "");
      }

      // Parent SMS
      if (parentPhone && parentPhone !== applicantPhone) {
        const smsTemplate = await getMessageTemplate(supabase, "approved_parent_sms", "sms") || defaultSmsParentMessage;
        const smsMessage = replaceVariables(smsTemplate, variables);
        const smsResult = await sendSms(parentPhone, smsMessage);
        results.sms.parent = smsResult.success;
        console.log("Parent SMS sent:", smsResult.success, smsResult.error || "");
      }
    }

    // Send WhatsApp if enabled (with banner image attached)
    if (whatsappEnabled) {
      // Learner WhatsApp with banner
      if (applicantPhone) {
        const waTemplate = await getMessageTemplate(supabase, "approved_learner_whatsapp", "whatsapp") || defaultWhatsappLearnerMessage;
        const waMessage = replaceVariables(waTemplate, variables);
        const waResult = await sendWhatsapp(applicantPhone, waMessage, socialBannerUrl || undefined);
        results.whatsapp.learner = waResult.success;
        console.log("Learner WhatsApp sent:", waResult.success, socialBannerUrl ? "with banner" : "no banner", waResult.error || "");
      }

      // Parent WhatsApp (no banner for parent)
      if (parentPhone && parentPhone !== applicantPhone) {
        const waTemplate = await getMessageTemplate(supabase, "approved_parent_whatsapp", "whatsapp") || defaultWhatsappParentMessage;
        const waMessage = replaceVariables(waTemplate, variables);
        const waResult = await sendWhatsapp(parentPhone, waMessage);
        results.whatsapp.parent = waResult.success;
        console.log("Parent WhatsApp sent:", waResult.success, waResult.error || "");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      settings: { parentEmailsEnabled, smsEnabled, whatsappEnabled },
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
