import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RejectionNotificationRequest {
  author_email: string;
  author_name: string;
  title: string;
  feedback: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-author-rejection function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: RejectionNotificationRequest = await req.json();
    console.log("Sending rejection notification to:", data.author_email);

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
        subject: `Update on Your Story Submission: "${data.title}"`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Hello ${data.author_name},</h1>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Thank you for submitting your story <strong>"${data.title}"</strong> to the edLEAD blog. We truly appreciate you taking the time to share your leadership journey with us.
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              After careful review, we've decided that the submission needs some adjustments before it can be published. Please see the feedback from our team below:
            </p>
            
            <div style="background-color: #f5f5f5; border-left: 4px solid #2563eb; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
              <p style="color: #1a1a1a; font-size: 15px; line-height: 1.6; margin: 0; font-style: italic;">
                "${data.feedback}"
              </p>
            </div>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              We encourage you to revise your story based on this feedback and resubmit it. Your voice and experiences are valuable, and we'd love to feature your story once it's ready.
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              If you have any questions or need clarification on the feedback, please don't hesitate to reach out to us.
            </p>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-top: 30px;">
              Keep leading,<br>
              <strong>The edLEAD Team</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent because you submitted a story to the edLEAD blog.
            </p>
          </div>
        `,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Rejection notification sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-author-rejection function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
