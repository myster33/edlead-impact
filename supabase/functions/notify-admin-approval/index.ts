import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminApprovalRequest {
  email: string;
  role: string;
  country?: string;
  province?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, role, country, province }: AdminApprovalRequest = await req.json();

    console.log(`Sending admin approval notification to: ${email}`);

    const regionText = country && province 
      ? `${province}, ${country}` 
      : country || province || "All regions";

    const roleDisplayName = role === "admin" ? "Administrator" : role === "reviewer" ? "Reviewer" : "Viewer";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [email],
        subject: "✅ Your edLEAD Admin Access Has Been Approved",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
              .info-label { font-weight: bold; color: #4b5563; }
              .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Access Approved!</h1>
              </div>
              <div class="content">
                <p>Great news! Your request to access the <strong>edLEAD Admin Dashboard</strong> has been approved.</p>
                
                <div class="highlight">
                  <p><strong>Your Access Details:</strong></p>
                  <p><span class="info-label">Role:</span> ${roleDisplayName}</p>
                  <p><span class="info-label">Assigned Region:</span> ${regionText}</p>
                </div>
                
                <p>You can now log in to the admin dashboard to:</p>
                
                <ul>
                  ${role === "admin" ? `
                    <li>Manage all applications and blog posts</li>
                    <li>Add and manage other admin users</li>
                    <li>View analytics and audit logs</li>
                  ` : role === "reviewer" ? `
                    <li>Review and process applications in your region</li>
                    <li>Review and approve blog post submissions</li>
                    <li>View regional analytics</li>
                  ` : `
                    <li>View applications in your region</li>
                    <li>View approved blog posts</li>
                  `}
                </ul>
                
                <p style="text-align: center;">
                  <a href="${Deno.env.get("SITE_URL") || "https://edlead.lovable.app"}/admin" class="button" style="color: white;">
                    Access Dashboard
                  </a>
                </p>
                
                <p>If you have any questions, please reach out to your administrator.</p>
                
                <p>Welcome to the team!</p>
                
                <p>Best regards,<br><strong>The edLEAD Team</strong></p>
              </div>
              <div class="footer">
                <p>This email was sent because your admin access was approved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await emailResponse.json();
    console.log("Admin approval notification sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
