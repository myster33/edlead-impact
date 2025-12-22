import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicantRejectedRequest {
  applicantEmail: string;
  applicantName: string;
  referenceNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantEmail, applicantName, referenceNumber }: ApplicantRejectedRequest = await req.json();

    console.log(`Sending rejection notification to applicant: ${applicantEmail}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <onboarding@resend.dev>",
        to: [applicantEmail],
        subject: "Update on Your edLEAD Application",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1e40af; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Application Update</h1>
              </div>
              <div class="content">
                <p>Dear ${applicantName},</p>
                
                <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong> and for taking the time to submit your application.</p>
                
                <div class="highlight">
                  <p><strong>Reference Number:</strong> ${referenceNumber}</p>
                </div>
                
                <p>After careful consideration, we regret to inform you that we are unable to offer you a place in the programme at this time.</p>
                
                <p>This decision was not easy, as we received many strong applications. We encourage you to:</p>
                
                <ul>
                  <li>Continue developing your leadership skills in your school and community</li>
                  <li>Seek out other leadership opportunities and programmes</li>
                  <li>Consider applying again in future intake periods</li>
                </ul>
                
                <p>We truly appreciate your enthusiasm for leadership and wish you the very best in your future endeavours.</p>
                
                <p>Warm regards,<br><strong>The edLEAD Team</strong></p>
              </div>
              <div class="footer">
                <p>This email was sent regarding your edLEAD application.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await emailResponse.json();
    console.log("Rejection notification sent successfully:", data);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending rejection notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
