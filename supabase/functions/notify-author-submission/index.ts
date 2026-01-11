import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = "https://edlead.co.za";
const LOGO_URL = `${SITE_URL}/images/edlead-logo-full.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmissionNotificationRequest {
  author_email: string;
  author_name: string;
  title: string;
  reference_number: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-author-submission function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      throw new Error("Email service not configured");
    }

    const submission: SubmissionNotificationRequest = await req.json();
    console.log("Sending submission confirmation to:", submission.author_email);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [submission.author_email],
        subject: `Story Received: "${submission.title}"`,
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
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
              .header img { max-width: 280px; height: auto; }
              .content { padding: 30px; background: #f9f9f9; }
              .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
              h1 { margin: 0; font-size: 24px; }
              .highlight { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
              @media (prefers-color-scheme: dark) {
                body { background-color: #1a1a2e !important; }
                .content { background-color: #1f2937 !important; color: #e5e7eb !important; }
                .content h2, .content p, .content li { color: #e5e7eb !important; }
                .highlight { background-color: #1e3a5f !important; }
                .highlight strong { color: #93c5fd !important; }
                .footer { color: #9ca3af !important; }
                .footer p { color: #9ca3af !important; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="edLEAD - Transforming Student Leaders" />
                <h1 style="margin-top: 15px;">Captain Stories</h1>
              </div>
              <div class="content">
                <h2>Dear ${submission.author_name},</h2>
                <p>Thank you for sharing your leadership story with us!</p>
                
                <div class="highlight">
                  <strong>Story Title:</strong> ${submission.title}<br>
                  <strong>Reference Number:</strong> ${submission.reference_number}<br>
                  <strong>Submitted:</strong> ${new Date().toLocaleDateString('en-ZA', { dateStyle: 'full' })}
                </div>
                
                <p>Your story has been received and is now pending review by our team. Here's what happens next:</p>
                
                <ol>
                  <li><strong>Review:</strong> Our editorial team will review your story for content and quality.</li>
                  <li><strong>Notification:</strong> You will receive an email when your story is approved or if we need any changes.</li>
                  <li><strong>Publication:</strong> Once approved, your story will be published on our blog for others to read and be inspired by.</li>
                </ol>
                
                <p>You can check the status of your story anytime using the "Check My Stories" feature on our blog page with your Captain Reference Number.</p>
                
                <p>Thank you for being part of the edLEAD community!</p>
                
                <p>Best regards,<br>
                <strong>The edLEAD Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated message. Please do not reply directly to this email.</p>
                <p>© ${new Date().getFullYear()} edLEAD. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, message: "Confirmation email sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-author-submission function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
