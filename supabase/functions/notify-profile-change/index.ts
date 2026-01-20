import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  email: string;
  name: string;
  change_type: "profile_updated" | "password_changed" | "mfa_enabled" | "mfa_disabled";
}

const getEmailContent = (name: string, changeType: string) => {
  const displayName = name || "Admin";
  
  switch (changeType) {
    case "password_changed":
      return {
        subject: "Your edLEAD Admin Password Has Been Changed",
        html: `
          <!DOCTYPE html>
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
                .warning-box { background-color: #78350f !important; border-color: #f59e0b !important; }
                .warning-box p { color: #fef3c7 !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
              <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Password Changed</h2>
            </div>
            <div class="email-content" style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Your edLEAD Admin Portal password has been successfully changed.
              </p>
              <div class="warning-box" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Security Notice:</strong> If you did not make this change, please contact your administrator immediately.
                </p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                This is an automated security notification from the edLEAD Admin Portal.
              </p>
            </div>
          </div>
          </body>
          </html>
        `,
      };
    case "profile_updated":
      return {
        subject: "Your edLEAD Admin Profile Has Been Updated",
        html: `
          <!DOCTYPE html>
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
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
              <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Profile Updated</h2>
            </div>
            <div class="email-content" style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Your edLEAD Admin Portal profile information has been updated successfully.
              </p>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you did not make this change, please contact your administrator.
              </p>
            </div>
          </div>
          </body>
          </html>
        `,
      };
    case "mfa_enabled":
      return {
        subject: "Two-Factor Authentication Enabled on Your edLEAD Account",
        html: `
          <!DOCTYPE html>
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
                .success-box { background-color: #065f46 !important; border-color: #10b981 !important; }
                .success-box p { color: #d1fae5 !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
              <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">🔐 2FA Enabled</h2>
            </div>
            <div class="email-content" style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Two-factor authentication has been successfully enabled on your edLEAD Admin Portal account.
              </p>
              <div class="success-box" style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  <strong>Your account is now more secure!</strong> You'll need your authenticator app to log in.
                </p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you did not enable 2FA, please contact your administrator immediately.
              </p>
            </div>
          </div>
          </body>
          </html>
        `,
      };
    case "mfa_disabled":
      return {
        subject: "Two-Factor Authentication Disabled on Your edLEAD Account",
        html: `
          <!DOCTYPE html>
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
                .danger-box { background-color: #7f1d1d !important; border-color: #ef4444 !important; }
                .danger-box p { color: #fecaca !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
              <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 200px; height: auto; margin-bottom: 15px;" />
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">⚠️ 2FA Disabled</h2>
            </div>
            <div class="email-content" style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Two-factor authentication has been disabled on your edLEAD Admin Portal account.
              </p>
              <div class="danger-box" style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>Security Warning:</strong> Your account is now less secure. We recommend re-enabling 2FA for better protection.
                </p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you did not disable 2FA, please contact your administrator immediately.
              </p>
            </div>
          </div>
          </body>
          </html>
        `,
      };
    default:
      return {
        subject: "edLEAD Admin Account Update",
        html: `<p>Your account has been updated.</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, change_type }: NotificationRequest = await req.json();

    if (!email) {
      console.error("No email provided");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, html } = getEmailContent(name, change_type);

    console.log(`Sending ${change_type} notification to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "edLEAD Admin <noreply@edlead.co.za>",
      to: [email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-profile-change function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
