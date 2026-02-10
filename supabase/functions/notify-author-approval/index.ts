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

interface ApprovalNotificationRequest {
  author_email: string;
  author_name: string;
  author_phone?: string;
  title: string;
  slug: string;
}

// Default template as fallback
const defaultTemplate = {
  subject: `🎉 Your Story Has Been Published: "{{title}}"`,
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
      .email-content h1, .email-content p { color: #e5e7eb !important; }
      .footer-text { color: #9ca3af !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
    <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" style="max-width: 196px; height: auto;" />
  </div>
  
  <div class="email-content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Congratulations, {{author_name}}! 🎉</h1>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Great news! Your story <strong>"{{title}}"</strong> has been reviewed and approved by our team.
    </p>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Your leadership journey is now live on the edLEAD blog, inspiring other young leaders across South Africa!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{blog_url}}" 
         style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        View Your Published Story
      </a>
    </div>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Feel free to share your story with friends, family, and on social media. Your voice matters, and your experience can make a real difference!
    </p>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Thank you for being part of the edLEAD community and for sharing your inspiring journey with us.
    </p>
    
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-top: 30px;">
      Keep leading,<br>
      <strong>The edLEAD Team</strong>
    </p>
  </div>
  
  <div class="footer-text" style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This email was sent because you submitted a story to the edLEAD blog.</p>
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

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "27" + cleaned.substring(1);
  } else if (cleaned.length === 9 && !cleaned.startsWith("27")) {
    cleaned = "27" + cleaned;
  }
  return "+" + cleaned;
}

function formatWhatsAppNumber(phone: string): string {
  const formatted = formatPhoneNumber(phone);
  return `whatsapp:${formatted}`;
}

async function sendTwilioMessage(
  to: string,
  body: string,
  channel: "sms" | "whatsapp"
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const fromNumber = channel === "whatsapp" ? TWILIO_WHATSAPP_NUMBER : TWILIO_PHONE_NUMBER;
  const formattedTo = channel === "whatsapp" ? formatWhatsAppNumber(to) : formatPhoneNumber(to);

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !fromNumber) {
    return { success: false, error: `Twilio ${channel} credentials not configured` };
  }

  const cleanedFrom = channel === "whatsapp"
    ? (fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`)
    : fromNumber;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: cleanedFrom,
          Body: body,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || `Failed to send ${channel}` };
    }
    return { success: true, sid: data.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-author-approval function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data: ApprovalNotificationRequest = await req.json();
    console.log("Sending approval notification to:", data.author_email);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template from database
    const template = await getEmailTemplate(supabase, "blog-approved");

    const blogUrl = `https://edlead.lovable.app/blog/${data.slug}`;

    const variables = {
      author_name: data.author_name,
      title: data.title,
      blog_url: blogUrl,
    };

    const subject = replaceVariables(template.subject, variables);
    const htmlContent = replaceVariables(template.html_content, variables);

    // Send email
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [data.author_email],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
    } else {
      console.log("Email sent successfully:", emailResult);
    }

    // Send SMS/WhatsApp if author_phone is provided
    const messagingResults: { sms?: any; whatsapp?: any } = {};

    if (data.author_phone) {
      const smsMessage = `🎉 Congrats ${data.author_name}! Your story "${data.title}" has been published on edLEAD. View it here: ${blogUrl}`;

      // Check SMS settings
      const { data: smsSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "sms_notifications_enabled")
        .maybeSingle();

      const smsEnabled = smsSettings?.setting_value === true || smsSettings?.setting_value === "true";

      if (smsEnabled) {
        const smsResult = await sendTwilioMessage(data.author_phone, smsMessage, "sms");
        messagingResults.sms = smsResult;
        console.log("SMS result:", smsResult);

        await supabase.from("message_logs").insert({
          channel: "sms",
          recipient_phone: data.author_phone,
          recipient_type: "learner",
          message_content: smsMessage,
          status: smsResult.success ? "sent" : "failed",
          twilio_sid: smsResult.sid,
          error_message: smsResult.error,
        });
      }

      // Check WhatsApp settings
      const { data: whatsappSettings } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "whatsapp_notifications_enabled")
        .maybeSingle();

      const whatsappEnabled = whatsappSettings?.setting_value === true || whatsappSettings?.setting_value === "true";

      if (whatsappEnabled) {
        const waResult = await sendTwilioMessage(data.author_phone, smsMessage, "whatsapp");
        messagingResults.whatsapp = waResult;
        console.log("WhatsApp result:", waResult);

        await supabase.from("message_logs").insert({
          channel: "whatsapp",
          recipient_phone: data.author_phone,
          recipient_type: "learner",
          message_content: smsMessage,
          status: waResult.success ? "sent" : "failed",
          twilio_sid: waResult.sid,
          error_message: waResult.error,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Approval notification sent",
        id: emailResult.id,
        messaging: messagingResults,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-author-approval function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
