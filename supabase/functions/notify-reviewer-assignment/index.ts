import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssignmentRequest {
  reviewer_email: string;
  reviewer_name: string | null;
  country: string | null;
  province: string | null;
  role: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewer_email, reviewer_name, country, province, role }: AssignmentRequest = await req.json();

    if (!reviewer_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Reviewer email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pending applications count for the assigned region
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let query = supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    if (province) {
      query = query.eq("province", province);
    }

    const { count: pendingCount, error: countError } = await query;

    if (countError) {
      console.error("Error fetching pending count:", countError);
    }

    const regionText = province 
      ? `${province}${country ? `, ${country}` : ""}`
      : country || "All regions";

    const displayName = reviewer_name || reviewer_email.split("@")[0];
    const roleText = role === "reviewer" ? "Reviewer" : "Viewer";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Region Assignment</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">edLEAD Admin Portal</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello ${displayName},</p>
            
            <p style="margin-bottom: 20px;">You have been assigned as a <strong>${roleText}</strong> for the following region:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e40af;">${regionText}</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e;">
                <strong>📋 Pending Applications:</strong> ${pendingCount || 0} application${(pendingCount || 0) !== 1 ? "s" : ""} awaiting review
              </p>
            </div>
            
            <p style="margin-bottom: 20px;">
              ${role === "reviewer" 
                ? "As a Reviewer, you can view and approve/reject applications from your assigned region."
                : "As a Viewer, you can view applications from your assigned region."}
            </p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://edlead.lovable.app/admin/dashboard" style="display: inline-block; background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                Go to Dashboard
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
            <p style="margin: 0;">This is an automated message from edLEAD Admin Portal.</p>
            <p style="margin: 5px 0 0;">Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "edLEAD <noreply@edlead.co.za>",
      to: [reviewer_email],
      subject: `Region Assignment: ${regionText}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ success: false, error: emailError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Region assignment notification sent to:", reviewer_email);

    return new Response(
      JSON.stringify({ success: true, data: emailData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in notify-reviewer-assignment:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
