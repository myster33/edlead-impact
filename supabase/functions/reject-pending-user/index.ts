import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectUserRequest {
  userId: string;
  email: string;
  reason?: string;
  sendEmail: boolean;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's token to verify they're authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to check admin status
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if current user is an admin
    const { data: adminCheck } = await adminClient
      .from("admin_users")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (!adminCheck || adminCheck.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins can reject users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, email, reason, sendEmail }: RejectUserRequest = await req.json();

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the user from auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to delete user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${email} has been rejected and deleted`);

    // Send rejection email if requested
    if (sendEmail && RESEND_API_KEY) {
      try {
        const reasonText = reason 
          ? `<p><strong>Reason:</strong> ${reason}</p>` 
          : "";

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "edLEAD <onboarding@resend.dev>",
            to: [email],
            subject: "Update on Your edLEAD Admin Access Request",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: #4A4A4A; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .header img { max-width: 200px; height: auto; margin-bottom: 15px; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
                  .reason-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
                  .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD - Transforming Student Leaders" />
                    <h1>Admin Access Request Update</h1>
                  </div>
                  <div class="content">
                    <p>Thank you for your interest in joining the <strong>edLEAD Admin Dashboard</strong>.</p>
                    
                    <p>After reviewing your request, we regret to inform you that your admin access request has not been approved at this time.</p>
                    
                    ${reason ? `
                    <div class="reason-box">
                      <p><strong>Reason provided:</strong></p>
                      <p>${reason}</p>
                    </div>
                    ` : ""}
                    
                    <p>If you believe this decision was made in error, or if you have questions, please reach out to your organization's administrator for more information.</p>
                    
                    <p>Thank you for your understanding.</p>
                    
                    <p>Best regards,<br><strong>The edLEAD Team</strong></p>
                  </div>
                  <div class="footer">
                    <p>This email was sent regarding your edLEAD admin access request.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          }),
        });
        console.log("Rejection email sent to:", email);
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in reject-pending-user:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
