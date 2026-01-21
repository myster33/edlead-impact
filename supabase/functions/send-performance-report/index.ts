import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReviewerStats {
  email: string;
  full_name: string | null;
  province: string | null;
  role: string;
  approved_count: number;
  rejected_count: number;
  total_processed: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { period = "weekly" } = await req.json().catch(() => ({ period: "weekly" }));
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;
    
    if (period === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      periodLabel = `${startDate.toLocaleString("default", { month: "long" })} ${startDate.getFullYear()}`;
    } else {
      // Weekly - last 7 days
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = `${startDate.toLocaleDateString("en-ZA")} - ${now.toLocaleDateString("en-ZA")}`;
    }

    console.log(`Generating ${period} performance report for period: ${periodLabel}`);

    // Get all admin users who have opted in to performance reports
    const { data: adminUsers, error: adminError } = await supabase
      .from("admin_users")
      .select("id, email, full_name, role, province, notify_performance_reports")
      .eq("role", "admin")
      .eq("notify_performance_reports", true);

    if (adminError) {
      console.error("Error fetching admin users:", adminError);
      throw adminError;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found to send report to");
      return new Response(
        JSON.stringify({ success: true, message: "No admin users to send report to" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all reviewers
    const { data: reviewers, error: reviewersError } = await supabase
      .from("admin_users")
      .select("id, email, full_name, province, role")
      .in("role", ["reviewer", "viewer"]);

    if (reviewersError) {
      console.error("Error fetching reviewers:", reviewersError);
      throw reviewersError;
    }

    // Get audit logs for the period
    const { data: auditLogs, error: auditError } = await supabase
      .from("admin_audit_log")
      .select("admin_user_id, action, created_at")
      .in("action", ["application_approved", "application_rejected"])
      .gte("created_at", startDate.toISOString());

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
      throw auditError;
    }

    // Calculate stats per reviewer
    const statsMap = new Map<string, { approved: number; rejected: number }>();
    
    auditLogs?.forEach(log => {
      if (!log.admin_user_id) return;
      const existing = statsMap.get(log.admin_user_id) || { approved: 0, rejected: 0 };
      if (log.action === "application_approved") {
        existing.approved++;
      } else if (log.action === "application_rejected") {
        existing.rejected++;
      }
      statsMap.set(log.admin_user_id, existing);
    });

    // Combine with reviewer data
    const reviewerStats: ReviewerStats[] = (reviewers || []).map(r => {
      const stats = statsMap.get(r.id) || { approved: 0, rejected: 0 };
      return {
        email: r.email,
        full_name: r.full_name,
        province: r.province,
        role: r.role,
        approved_count: stats.approved,
        rejected_count: stats.rejected,
        total_processed: stats.approved + stats.rejected,
      };
    }).sort((a, b) => b.total_processed - a.total_processed);

    // Get overall application stats for the period
    const { count: totalApplications } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString());

    const { count: pendingApplications } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const totalApproved = reviewerStats.reduce((sum, r) => sum + r.approved_count, 0);
    const totalRejected = reviewerStats.reduce((sum, r) => sum + r.rejected_count, 0);
    const totalProcessed = totalApproved + totalRejected;

    // Generate HTML report
    const reviewerRows = reviewerStats.map((r, index) => {
      const approvalRate = r.total_processed > 0 ? Math.round((r.approved_count / r.total_processed) * 100) : 0;
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "";
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; text-align: left;">${medal} ${r.full_name || r.email}</td>
          <td style="padding: 12px; text-align: center;">${r.province || "All"}</td>
          <td style="padding: 12px; text-align: center; color: #16a34a; font-weight: 600;">${r.approved_count}</td>
          <td style="padding: 12px; text-align: center; color: #dc2626; font-weight: 600;">${r.rejected_count}</td>
          <td style="padding: 12px; text-align: center; font-weight: 700;">${r.total_processed}</td>
          <td style="padding: 12px; text-align: center;">${approvalRate}%</td>
        </tr>
      `;
    }).join("");

    const topPerformer = reviewerStats[0];
    const topPerformerHtml = topPerformer && topPerformer.total_processed > 0 ? `
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
        <p style="margin: 0 0 5px; color: #92400e; font-size: 14px;">🏆 Top Performer</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #78350f;">${topPerformer.full_name || topPerformer.email}</p>
        <p style="margin: 5px 0 0; color: #92400e;">${topPerformer.total_processed} applications processed</p>
      </div>
    ` : "";

    const emailHtml = `
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
              .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; border-color: #374151 !important; }
              .stat-box { background-color: #374151 !important; }
              .stat-value { color: #60a5fa !important; }
              .stat-label { color: #9ca3af !important; }
              .pending-box { background-color: #78350f !important; }
              .pending-value { color: #fcd34d !important; }
              .pending-label { color: #fcd34d !important; }
              .top-performer { background: linear-gradient(135deg, #78350f 0%, #92400e 100%) !important; }
              .top-performer-label { color: #fcd34d !important; }
              .top-performer-name { color: #fef3c7 !important; }
              .top-performer-stat { color: #fcd34d !important; }
              .section-title { color: #f3f4f6 !important; }
              .table-header { background-color: #374151 !important; }
              .table-header th { color: #9ca3af !important; }
              .table-row { border-bottom-color: #374151 !important; }
              .table-cell { color: #e5e7eb !important; }
              .cta-button { background-color: #3b82f6 !important; }
              .footer-section { color: #9ca3af !important; }
            }
          </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background-color: #4A4A4A; padding: 30px; text-align: center;">
            <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto; margin-bottom: 15px;" />
            <h2 style="margin: 0; font-size: 20px; color: #ffffff;">${period === "monthly" ? "Monthly" : "Weekly"} Performance Report</h2>
            <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">${periodLabel}</p>
          </div>
          
          <div class="email-content" style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <!-- Summary Stats -->
            <div style="display: flex; justify-content: space-around; margin-bottom: 30px; text-align: center;">
              <div class="stat-box" style="flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px; margin: 0 5px;">
                <p class="stat-value" style="margin: 0; font-size: 28px; font-weight: 700; color: #1e40af;">${totalApplications || 0}</p>
                <p class="stat-label" style="margin: 5px 0 0; font-size: 12px; color: #64748b;">New Applications</p>
              </div>
              <div class="stat-box" style="flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px; margin: 0 5px;">
                <p class="stat-value" style="margin: 0; font-size: 28px; font-weight: 700; color: #16a34a;">${totalApproved}</p>
                <p class="stat-label" style="margin: 5px 0 0; font-size: 12px; color: #64748b;">Approved</p>
              </div>
              <div class="stat-box" style="flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px; margin: 0 5px;">
                <p class="stat-value" style="margin: 0; font-size: 28px; font-weight: 700; color: #dc2626;">${totalRejected}</p>
                <p class="stat-label" style="margin: 5px 0 0; font-size: 12px; color: #64748b;">Rejected</p>
              </div>
              <div class="pending-box" style="flex: 1; padding: 15px; background: #fef3c7; border-radius: 8px; margin: 0 5px;">
                <p class="pending-value" style="margin: 0; font-size: 28px; font-weight: 700; color: #92400e;">${pendingApplications || 0}</p>
                <p class="pending-label" style="margin: 5px 0 0; font-size: 12px; color: #92400e;">Pending</p>
              </div>
            </div>

            ${topPerformerHtml}

            <!-- Reviewer Table -->
            <h2 class="section-title" style="font-size: 18px; margin: 0 0 15px; color: #1e293b;">Reviewer Performance</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr class="table-header" style="background: #f1f5f9;">
                  <th style="padding: 12px; text-align: left;">Reviewer</th>
                  <th style="padding: 12px; text-align: center;">Region</th>
                  <th style="padding: 12px; text-align: center;">Approved</th>
                  <th style="padding: 12px; text-align: center;">Rejected</th>
                  <th style="padding: 12px; text-align: center;">Total</th>
                  <th style="padding: 12px; text-align: center;">Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                ${reviewerRows || "<tr><td colspan='6' style='padding: 20px; text-align: center; color: #64748b;'>No reviewer activity this period</td></tr>"}
              </tbody>
            </table>

            <div style="margin-top: 30px; text-align: center;">
              <a class="cta-button" href="https://edlead.lovable.app/admin/dashboard" style="display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View Full Dashboard
              </a>
            </div>
          </div>
          
          <div class="footer-section" style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">This is an automated ${period} report from edLEAD Admin Portal.</p>
            <p style="margin: 5px 0 0;">Generated on ${new Date().toLocaleString("en-ZA")}</p>
          </div>
        </body>
      </html>
    `;

    // Send to all admins
    const adminEmails = adminUsers.map(a => a.email);
    console.log(`Sending ${period} report to admins:`, adminEmails);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "edLEAD <noreply@edlead.co.za>",
      to: adminEmails,
      subject: `edLEAD ${period === "monthly" ? "Monthly" : "Weekly"} Performance Report - ${periodLabel}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${period} performance report sent successfully to ${adminEmails.length} admin(s)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: emailData,
        stats: {
          period,
          periodLabel,
          totalApplications,
          totalProcessed,
          totalApproved,
          totalRejected,
          pendingApplications,
          reviewerCount: reviewerStats.length,
          adminCount: adminEmails.length,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-performance-report:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
