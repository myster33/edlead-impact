import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = "https://edlead.co.za";
const LOGO_URL = `${SITE_URL}/images/edlead-logo-full.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusChangeRequest {
  applicantEmail: string;
  applicantName: string;
  referenceNumber: string;
  newStatus: string;
  oldStatus: string;
}

const getStatusEmailContent = (name: string, referenceNumber: string, newStatus: string, oldStatus: string) => {
  switch (newStatus) {
    case "pending":
      return {
        subject: "Your edLEAD Application Status Has Been Updated",
        headerBg: "#f59e0b",
        headerTitle: "Application Under Review",
        mainMessage: `Your application has been moved back to pending review status.`,
        details: `
          <p>Our team is reviewing your application again. This may happen when:</p>
          <ul>
            <li>Additional information needs to be verified</li>
            <li>Your application is being reconsidered</li>
            <li>There are updates to the review process</li>
          </ul>
          <p>We will notify you once a decision has been made.</p>
        `,
      };
    case "cancelled":
      return {
        subject: "Your edLEAD Application Has Been Cancelled",
        headerBg: "#6b7280",
        headerTitle: "Application Cancelled",
        mainMessage: `Your application has been cancelled.`,
        details: `
          <p>If you believe this was done in error or would like more information, please contact our support team.</p>
          <p>You are welcome to submit a new application if you wish to be considered for future intakes.</p>
        `,
      };
    case "approved":
      return {
        subject: "🎉 Great News! Your edLEAD Application Has Been Approved",
        headerBg: "#10b981",
        headerTitle: "🎉 Congratulations!",
        mainMessage: `Your application to the edLEAD Leadership Programme has been approved!`,
        details: `
          <p>This is an exciting first step on your leadership journey. Our team will be in touch shortly with more details about the programme, including:</p>
          <ul>
            <li>Programme orientation dates</li>
            <li>Required materials and resources</li>
            <li>Next steps for enrollment</li>
          </ul>
          <p>In the meantime, please ensure you have access to a device with internet connectivity, as many of our programme activities will be conducted online.</p>
        `,
      };
    case "rejected":
      return {
        subject: "Update on Your edLEAD Application",
        headerBg: "#ef4444",
        headerTitle: "Application Update",
        mainMessage: `After careful consideration, we regret to inform you that we are unable to offer you a place in the programme at this time.`,
        details: `
          <p>This decision was not easy, as we received many strong applications. We encourage you to:</p>
          <ul>
            <li>Continue developing your leadership skills in your school and community</li>
            <li>Seek out other leadership opportunities and programmes</li>
            <li>Consider applying again in future intake periods</li>
          </ul>
          <p>We truly appreciate your enthusiasm for leadership and wish you the very best in your future endeavours.</p>
        `,
      };
    default:
      return {
        subject: "Your edLEAD Application Status Has Changed",
        headerBg: "#1e40af",
        headerTitle: "Application Status Update",
        mainMessage: `Your application status has been updated to: ${newStatus}`,
        details: `<p>If you have any questions about this change, please contact our support team.</p>`,
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantEmail, applicantName, referenceNumber, newStatus, oldStatus }: StatusChangeRequest = await req.json();

    console.log(`Sending status change notification to ${applicantEmail}: ${oldStatus} -> ${newStatus}`);

    const content = getStatusEmailContent(applicantName, referenceNumber, newStatus, oldStatus);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [applicantEmail],
        subject: content.subject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${content.headerBg}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .header img { max-width: 280px; height: auto; margin-bottom: 15px; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
              .highlight { background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="${LOGO_URL}" alt="edLEAD - Transforming Student Leaders" />
                <h1>${content.headerTitle}</h1>
              </div>
              <div class="content">
                <p>Dear ${applicantName},</p>
                
                <p>Thank you for your interest in the <strong>edLEAD Leadership Programme</strong>.</p>
                
                <div class="highlight">
                  <p><strong>Reference Number:</strong> ${referenceNumber}</p>
                  <p><strong>New Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
                </div>
                
                <p>${content.mainMessage}</p>
                
                ${content.details}
                
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
    console.log("Status change notification sent successfully:", data);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending status change notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
