import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicantApprovedRequest {
  applicantEmail: string;
  applicantName: string;
  referenceNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantEmail, applicantName, referenceNumber }: ApplicantApprovedRequest = await req.json();

    console.log(`Sending approval notification to applicant: ${applicantEmail}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [applicantEmail],
        subject: "🎉 Congratulations! Your edLEAD Application Has Been Approved",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .highlight { background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎉 Congratulations, ${applicantName}!</h1>
              </div>
              <div class="content">
                <p>We are thrilled to inform you that your application to the <strong>edLEAD Leadership Programme</strong> has been <strong>approved</strong>!</p>
                
                <div class="highlight">
                  <p><strong>Reference Number:</strong> ${referenceNumber}</p>
                </div>
                
                <p>This is an exciting first step on your leadership journey. Our team will be in touch shortly with more details about the programme, including:</p>
                
                <ul>
                  <li>Programme orientation dates</li>
                  <li>Required materials and resources</li>
                  <li>Next steps for enrollment</li>
                </ul>
                
                <p>In the meantime, please ensure you have access to a device with internet connectivity, as many of our programme activities will be conducted online.</p>
                
                <p>We look forward to seeing you grow as a leader!</p>
                
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
    console.log("Approval notification sent successfully:", data);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
