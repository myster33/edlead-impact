import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriticalAlertRequest {
  action: string;
  performed_by_email: string;
  performed_by_name?: string;
  target_email?: string;
  target_name?: string;
  details?: Record<string, unknown>;
}

const alertConfigs: Record<string, { title: string; description: string; severity: "high" | "critical" }> = {
  admin_user_deleted: {
    title: "Admin User Deleted",
    description: "An admin user account has been permanently deleted from the system.",
    severity: "critical"
  },
  password_changed: {
    title: "Password Changed",
    description: "An admin account password has been changed.",
    severity: "high"
  },
  mfa_disabled: {
    title: "Two-Factor Authentication Disabled",
    description: "Two-factor authentication has been disabled for an admin account.",
    severity: "high"
  },
  admin_role_changed: {
    title: "Admin Role Changed",
    description: "An admin user's role/permissions have been modified.",
    severity: "high"
  },
  bulk_applications_deleted: {
    title: "Bulk Applications Deleted",
    description: "Multiple applications have been deleted from the system.",
    severity: "critical"
  },
  bulk_blogs_deleted: {
    title: "Bulk Blog Posts Deleted",
    description: "Multiple blog posts have been deleted from the system.",
    severity: "critical"
  }
};

const generateAlertHtml = (
  config: { title: string; description: string; severity: "high" | "critical" },
  request: CriticalAlertRequest
): string => {
  const severityColor = config.severity === "critical" ? "#dc2626" : "#ea580c";
  const severityBg = config.severity === "critical" ? "#fef2f2" : "#fff7ed";
  const severityLabel = config.severity === "critical" ? "CRITICAL" : "HIGH PRIORITY";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: ${severityColor}; padding: 20px; text-align: center;">
          <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 4px 12px; border-radius: 4px; margin-bottom: 10px;">
            <span style="color: white; font-size: 12px; font-weight: bold; letter-spacing: 1px;">⚠️ ${severityLabel}</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 22px;">${config.title}</h1>
        </div>

        <!-- Alert Details -->
        <div style="padding: 30px;">
          <div style="background: ${severityBg}; border-left: 4px solid ${severityColor}; padding: 15px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; color: #1e293b; font-size: 14px;">${config.description}</p>
          </div>

          <h2 style="font-size: 14px; color: #64748b; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.5px;">Action Details</h2>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; width: 140px;">Performed By</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 500;">
                ${request.performed_by_name || request.performed_by_email}
                ${request.performed_by_name ? `<br><span style="font-weight: normal; color: #64748b; font-size: 12px;">${request.performed_by_email}</span>` : ''}
              </td>
            </tr>
            ${request.target_email ? `
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Affected Account</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px; font-weight: 500;">
                ${request.target_name || request.target_email}
                ${request.target_name ? `<br><span style="font-weight: normal; color: #64748b; font-size: 12px;">${request.target_email}</span>` : ''}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Action Type</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">${request.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Time</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #1e293b; font-size: 14px;">${new Date().toLocaleString('en-US', { 
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}</td>
            </tr>
            ${request.details && Object.keys(request.details).length > 0 ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 13px; vertical-align: top;">Additional Info</td>
              <td style="padding: 10px 0; color: #1e293b; font-size: 13px;">
                ${Object.entries(request.details).map(([key, value]) => 
                  `<div style="margin-bottom: 4px;"><strong>${key}:</strong> ${value}</div>`
                ).join('')}
              </td>
            </tr>
            ` : ''}
          </table>

          <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 6px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
              If you did not perform this action, please investigate immediately.
            </p>
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              Log in to the admin dashboard to review the full audit log.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding: 15px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
            This is an automated security alert from EdLead Admin System.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: CriticalAlertRequest = await req.json();
    console.log("Critical alert request:", JSON.stringify(request));

    const config = alertConfigs[request.action];
    if (!config) {
      console.log(`Unknown action type: ${request.action}, skipping alert`);
      return new Response(
        JSON.stringify({ message: "Unknown action type, no alert sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch admin users who have critical alerts enabled
    const { data: admins, error: adminsError } = await supabase
      .from("admin_users")
      .select("id, email, full_name, notify_critical_alerts")
      .eq("role", "admin")
      .eq("notify_critical_alerts", true);

    if (adminsError) {
      console.error("Error fetching admin users:", adminsError);
      throw adminsError;
    }

    console.log(`Found ${admins?.length || 0} admin users with critical alerts enabled`);

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin users with critical alerts enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlContent = generateAlertHtml(config, request);
    const subjectPrefix = config.severity === "critical" ? "🚨 CRITICAL:" : "⚠️ Alert:";

    // Send email to each subscribed admin
    const emailPromises = admins.map(async (admin) => {
      console.log(`Sending critical alert to ${admin.email}...`);
      
      try {
        const result = await resend.emails.send({
          from: "edLEAD Admin <noreply@edlead.co.za>",
          to: [admin.email],
          subject: `${subjectPrefix} ${config.title} - EdLead Admin`,
          html: htmlContent,
        });
        
        console.log(`Alert sent to ${admin.email}:`, result);
        return { email: admin.email, success: true, result };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send alert to ${admin.email}:`, error);
        return { email: admin.email, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(emailPromises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Critical alert sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: "Critical alert sent",
        emailsSent: successful,
        emailsFailed: failed,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in send-critical-alert function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
