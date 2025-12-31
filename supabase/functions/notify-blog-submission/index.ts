import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BlogSubmissionRequest {
  title: string;
  author_name: string;
  author_school: string;
  author_province: string;
  author_email: string;
  category: string;
  summary: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-blog-submission function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const submission: BlogSubmissionRequest = await req.json();
    console.log("Received blog submission notification request:", submission.title);

    // Create Supabase client to fetch admin emails
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all admin user emails
    const { data: adminUsers, error: adminError } = await supabase
      .from("admin_users")
      .select("email");

    if (adminError) {
      console.error("Error fetching admin users:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const adminEmails = adminUsers.map(admin => admin.email);
    console.log(`Sending notification to ${adminEmails.length} admin(s)`);

    // Send notification email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: adminEmails,
        subject: `New Blog Post Submitted: "${submission.title}"`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">📝 New Blog Post Submitted</h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5;">
              A new story has been submitted for review on the edLEAD blog.
            </p>
            
            <div style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 0;">${submission.title}</h2>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Author:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${submission.author_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>School:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${submission.author_school}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Province:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${submission.author_province}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Category:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${submission.category}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; color: #1a1a1a;">${submission.author_email}</td>
                </tr>
              </table>
              
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
                <strong style="color: #666;">Summary:</strong>
                <p style="color: #1a1a1a; margin: 8px 0 0 0; font-style: italic;">"${submission.summary}"</p>
              </div>
            </div>
            
            <p style="color: #4a4a4a; font-size: 14px; line-height: 1.5;">
              Please log in to the admin panel to review and approve this submission.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This is an automated notification from the edLEAD platform.
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-blog-submission function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
