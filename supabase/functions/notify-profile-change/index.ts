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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Password Changed</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Your edLEAD Admin Portal password has been successfully changed.
              </p>
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Security Notice:</strong> If you did not make this change, please contact your administrator immediately.
                </p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                This is an automated security notification from the edLEAD Admin Portal.
              </p>
            </div>
          </div>
        `,
      };
    case "profile_updated":
      return {
        subject: "Your edLEAD Admin Profile Has Been Updated",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a365d 0%, #2d5a87 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Profile Updated</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Your edLEAD Admin Portal profile information has been updated successfully.
              </p>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you did not make this change, please contact your administrator.
              </p>
            </div>
          </div>
        `,
      };
    case "mfa_enabled":
      return {
        subject: "Two-Factor Authentication Enabled on Your edLEAD Account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #065f46 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🔐 2FA Enabled</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Two-factor authentication has been successfully enabled on your edLEAD Admin Portal account.
              </p>
              <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                  <strong>Your account is now more secure!</strong> You'll need your authenticator app to log in.
                </p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you did not enable 2FA, please contact your administrator immediately.
              </p>
            </div>
          </div>
        `,
      };
    case "mfa_disabled":
      return {
        subject: "Two-Factor Authentication Disabled on Your edLEAD Account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ 2FA Disabled</h1>
            </div>
            <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">Hello ${displayName},</p>
              <p style="font-size: 16px; color: #334155; margin-bottom: 20px;">
                Two-factor authentication has been disabled on your edLEAD Admin Portal account.
              </p>
              <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>Security Warning:</strong> Your account is now less secure. We recommend re-enabling 2FA for better protection.
                </p>
              </div>
              <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                If you did not disable 2FA, please contact your administrator immediately.
              </p>
            </div>
          </div>
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
