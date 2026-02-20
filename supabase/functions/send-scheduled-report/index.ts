import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if scheduled reports are enabled
    const { data: setting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "scheduled_report_frequency")
      .maybeSingle();

    const frequency = setting?.setting_value;
    if (!frequency || frequency === "disabled") {
      return new Response(JSON.stringify({ message: "Scheduled reports disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all admin emails who have email digest enabled
    const { data: admins } = await supabase
      .from("admin_users")
      .select("email, full_name")
      .eq("email_digest_enabled", true);

    if (!admins || admins.length === 0) {
      return new Response(JSON.stringify({ message: "No admins opted in" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine date range
    const now = new Date();
    const startDate = new Date(now);
    if (frequency === "weekly") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    // Fetch applications in the period
    const { data: apps, error: appsErr } = await supabase
      .from("applications")
      .select("reference_number, full_name, student_email, school_name, grade, province, country, status, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (appsErr) throw appsErr;

    // Build CSV
    const headers = ["Reference", "Name", "Email", "School", "Grade", "Province", "Country", "Status", "Date"];
    const escapeCSV = (v: string | null) => {
      if (!v) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = (apps || []).map((a: any) => [
      escapeCSV(a.reference_number || "N/A"),
      escapeCSV(a.full_name),
      escapeCSV(a.student_email),
      escapeCSV(a.school_name),
      escapeCSV(a.grade),
      escapeCSV(a.province),
      escapeCSV(a.country),
      escapeCSV(a.status),
      escapeCSV(new Date(a.created_at).toLocaleDateString("en-ZA")),
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const csvBase64 = btoa(unescape(encodeURIComponent(csv)));

    // Summary stats
    const total = apps?.length || 0;
    const pending = apps?.filter((a: any) => a.status === "pending").length || 0;
    const approved = apps?.filter((a: any) => a.status === "approved").length || 0;
    const rejected = apps?.filter((a: any) => a.status === "rejected").length || 0;

    const periodLabel = frequency === "weekly" ? "Weekly" : "Monthly";
    const dateRange = `${startDate.toLocaleDateString("en-ZA")} – ${now.toLocaleDateString("en-ZA")}`;

    // Send email to each admin
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailPromises = admins.map((admin) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "edLEAD <noreply@edlead.co.za>",
          to: [admin.email],
          subject: `edLEAD ${periodLabel} Applications Report — ${dateRange}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ED7621;">edLEAD ${periodLabel} Report</h2>
              <p>Hi ${admin.full_name || "Admin"},</p>
              <p>Here is your ${frequency} applications report for <strong>${dateRange}</strong>.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Total Applications</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${total}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Pending</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${pending}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd; background: #f9f9f9;"><strong>Approved</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${approved}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>Rejected</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${rejected}</td>
                </tr>
              </table>
              <p>The full CSV report is attached.</p>
              <p style="color: #999; font-size: 12px;">This is an automated report from edLEAD. You can disable it in Admin Settings.</p>
            </div>
          `,
          attachments: [
            {
              filename: `edlead-${frequency}-report-${now.toISOString().split("T")[0]}.csv`,
              content: csvBase64,
              type: "text/csv",
            },
          ],
        }),
      })
    );

    await Promise.all(emailPromises);

    return new Response(
      JSON.stringify({ success: true, sent_to: admins.length, applications: total }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Scheduled report error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
