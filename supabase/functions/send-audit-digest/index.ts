import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  email_digest_enabled: boolean;
}

const actionLabels: Record<string, string> = {
  application_approved: "Application Approved",
  application_rejected: "Application Rejected",
  application_deleted: "Application Deleted",
  blog_approved: "Blog Approved",
  blog_rejected: "Blog Rejected",
  blog_deleted: "Blog Deleted",
  blog_featured: "Blog Featured",
  admin_user_added: "Admin Added",
  admin_user_updated: "Admin Updated",
  admin_user_deleted: "Admin Deleted",
  profile_updated: "Profile Updated",
  password_changed: "Password Changed",
  mfa_enabled: "2FA Enabled",
  mfa_disabled: "2FA Disabled",
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const generateDigestHtml = (
  logs: AuditLogEntry[],
  adminEmails: Record<string, string>,
  startDate: Date,
  endDate: Date
): string => {
  // Group logs by table
  const byTable: Record<string, AuditLogEntry[]> = {};
  logs.forEach(log => {
    if (!byTable[log.table_name]) {
      byTable[log.table_name] = [];
    }
    byTable[log.table_name].push(log);
  });

  // Count actions
  const actionCounts: Record<string, number> = {};
  logs.forEach(log => {
    const label = actionLabels[log.action] || log.action;
    actionCounts[label] = (actionCounts[label] || 0) + 1;
  });

  // Count by admin
  const adminCounts: Record<string, number> = {};
  logs.forEach(log => {
    const email = log.admin_user_id ? adminEmails[log.admin_user_id] || "Unknown" : "System";
    adminCounts[email] = (adminCounts[email] || 0) + 1;
  });

  const tableRows = Object.entries(byTable)
    .map(([table, tableLogs]) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${table}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${tableLogs.length}</td>
      </tr>
    `).join('');

  const actionRows = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([action, count]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${action}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${count}</td>
      </tr>
    `).join('');

  const adminRows = Object.entries(adminCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([admin, count]) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${admin}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${count}</td>
      </tr>
    `).join('');

  const recentLogs = logs.slice(0, 10).map(log => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${formatDate(log.created_at)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${log.admin_user_id ? adminEmails[log.admin_user_id] || "Unknown" : "System"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${actionLabels[log.action] || log.action}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">${log.table_name}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <style>
        @media (prefers-color-scheme: dark) {
          body { background-color: #1a1a2e !important; }
          .email-container { background-color: #1f2937 !important; }
          .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
          .section-header { color: #f3f4f6 !important; border-bottom-color: #374151 !important; }
          .stat-box { background-color: #374151 !important; }
          .stat-value { color: #60a5fa !important; }
          .stat-label { color: #9ca3af !important; }
          .table-header { background-color: #374151 !important; }
          .table-header th { color: #9ca3af !important; }
          .table-cell { border-bottom-color: #374151 !important; color: #e5e7eb !important; }
          .footer-section { background-color: #111827 !important; border-top-color: #374151 !important; }
          .footer-text { color: #9ca3af !important; }
          .footer-subtext { color: #6b7280 !important; }
        }
      </style>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div class="email-container" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
          <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;" />
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Weekly Audit Log Digest</h2>
          <p style="color: #64748b; margin: 10px 0 0 0; font-size: 14px;">
            ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <!-- Summary Stats -->
        <div class="stat-box" style="padding: 20px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-around; text-align: center;">
            <div style="flex: 1; padding: 10px;">
              <div class="stat-value" style="font-size: 32px; font-weight: bold; color: #2563eb;">${logs.length}</div>
              <div class="stat-label" style="font-size: 12px; color: #64748b; text-transform: uppercase;">Total Actions</div>
            </div>
            <div style="flex: 1; padding: 10px;">
              <div class="stat-value" style="font-size: 32px; font-weight: bold; color: #16a34a;">${Object.keys(adminCounts).length}</div>
              <div class="stat-label" style="font-size: 12px; color: #64748b; text-transform: uppercase;">Active Admins</div>
            </div>
            <div style="flex: 1; padding: 10px;">
              <div class="stat-value" style="font-size: 32px; font-weight: bold; color: #ea580c;">${Object.keys(actionCounts).length}</div>
              <div class="stat-label" style="font-size: 12px; color: #64748b; text-transform: uppercase;">Action Types</div>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="email-content" style="padding: 20px; background: white;">
          
          <!-- Activity by Table -->
          <h2 class="section-header" style="font-size: 16px; color: #1e293b; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Activity by Table</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr class="table-header" style="background: #f1f5f9;">
                <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Table</th>
                <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <!-- Top Actions -->
          <h2 class="section-header" style="font-size: 16px; color: #1e293b; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Top Actions</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr class="table-header" style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Action</th>
                <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b;">Count</th>
              </tr>
            </thead>
            <tbody>
              ${actionRows}
            </tbody>
          </table>

          <!-- Admin Activity -->
          <h2 class="section-header" style="font-size: 16px; color: #1e293b; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Admin Activity</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
            <thead>
              <tr class="table-header" style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Admin</th>
                <th style="padding: 8px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${adminRows}
            </tbody>
          </table>

          <!-- Recent Activity -->
          <h2 class="section-header" style="font-size: 16px; color: #1e293b; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0;">Recent Activity</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr class="table-header" style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Date</th>
                <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Admin</th>
                <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Action</th>
                <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">Table</th>
              </tr>
            </thead>
            <tbody>
              ${recentLogs}
            </tbody>
          </table>

        </div>

        <!-- Footer -->
        <div class="footer-section" style="padding: 20px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
          <p class="footer-text" style="margin: 0; font-size: 12px; color: #64748b;">
            This is an automated weekly digest from edLEAD Admin System.
          </p>
          <p class="footer-subtext" style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">
            To view full audit logs, log in to the admin dashboard.
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting audit digest generation...");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    console.log(`Fetching logs from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Fetch audit logs from the past week
    const { data: logs, error: logsError } = await supabase
      .from("admin_audit_log")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (logsError) {
      console.error("Error fetching audit logs:", logsError);
      throw logsError;
    }

    console.log(`Found ${logs?.length || 0} audit log entries`);

    // Fetch all admin users with role 'admin' who have digest enabled
    const { data: admins, error: adminsError } = await supabase
      .from("admin_users")
      .select("id, email, full_name, email_digest_enabled")
      .eq("role", "admin")
      .eq("email_digest_enabled", true);

    if (adminsError) {
      console.error("Error fetching admin users:", adminsError);
      throw adminsError;
    }

    console.log(`Found ${admins?.length || 0} admin users with digest enabled`);

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin users with digest enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build admin email map (for all admins, not just those with digest enabled)
    const { data: allAdmins } = await supabase
      .from("admin_users")
      .select("id, email");
    
    const adminEmails: Record<string, string> = {};
    (allAdmins || []).forEach((admin) => {
      adminEmails[admin.id] = admin.email;
    });

    // Generate HTML digest
    const htmlContent = generateDigestHtml(
      logs || [],
      adminEmails,
      startDate,
      endDate
    );

    // Send email to each subscribed admin
    const emailPromises = admins.map(async (admin) => {
      console.log(`Sending digest to ${admin.email}...`);
      
      try {
        const result = await resend.emails.send({
          from: "edLEAD Admin <noreply@edlead.co.za>",
          to: [admin.email],
          subject: `Weekly Audit Log Digest - ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          html: htmlContent,
        });
        
        console.log(`Email sent to ${admin.email}:`, result);
        return { email: admin.email, success: true, result };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send email to ${admin.email}:`, error);
        return { email: admin.email, success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(emailPromises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Digest sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: "Audit digest sent",
        logsCount: logs?.length || 0,
        emailsSent: successful,
        emailsFailed: failed,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-audit-digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
