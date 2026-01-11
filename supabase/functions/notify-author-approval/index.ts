import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = "https://edlead.co.za";
const LOGO_URL = `${SITE_URL}/images/edlead-logo-full.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalNotificationRequest {
  author_email: string;
  author_name: string;
  title: string;
  slug: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-author-approval function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data: ApprovalNotificationRequest = await req.json();
    console.log("Sending approval notification to:", data.author_email);
    console.log("Request data:", JSON.stringify(data));

    const blogUrl = `https://edlead.lovable.app/blog/${data.slug}`;

    // Send notification email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [data.author_email],
        subject: `🎉 Your Story Has Been Published: "${data.title}"`,
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
                .email-content { background-color: #1f2937 !important; }
                .email-content h1, .email-content p { color: #e5e7eb !important; }
                .footer-text { color: #9ca3af !important; }
              }
            </style>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1e3a5f; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <img src="${LOGO_URL}" alt="edLEAD - Transforming Student Leaders" style="max-width: 280px; height: auto;" />
            </div>
            
            <div class="email-content" style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Congratulations, ${data.author_name}! 🎉</h1>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Great news! Your story <strong>"${data.title}"</strong> has been reviewed and approved by our team.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Your leadership journey is now live on the edLEAD blog, inspiring other young leaders across South Africa!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${blogUrl}" 
                   style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  View Your Published Story
                </a>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Feel free to share your story with friends, family, and on social media. Your voice matters, and your experience can make a real difference!
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Thank you for being part of the edLEAD community and for sharing your inspiring journey with us.
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-top: 30px;">
                Keep leading,<br>
                <strong>The edLEAD Team</strong>
              </p>
            </div>
            
            <div class="footer-text" style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>This email was sent because you submitted a story to the edLEAD blog.</p>
            </div>
          </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    
    // Check if Resend API returned an error
    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      console.error("Response status:", emailResponse.status);
      return new Response(
        JSON.stringify({ error: emailResult.message || `Resend API returned ${emailResponse.status}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Approval notification sent", id: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-author-approval function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
