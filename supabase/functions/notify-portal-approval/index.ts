import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { school_user_id } = await req.json();

    if (!school_user_id) {
      return new Response(JSON.stringify({ error: "school_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the school_user with their user_code
    const { data: schoolUser, error: suError } = await supabase
      .from("school_users")
      .select("user_code, full_name, email, phone, role")
      .eq("id", school_user_id)
      .single();

    if (suError || !schoolUser) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { sms?: string; email?: string } = {};

    // Send SMS with user_code if phone exists
    if (schoolUser.phone) {
      // WhatsApp/SMS via Twilio — WhatsApp is frozen, only SMS path remains if needed
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
        const messagingSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

        if (twilioSid && twilioAuth && messagingSid) {
          const phone = schoolUser.phone.replace(/\s/g, "");
          const body = `Welcome to edLEAD Portal, ${schoolUser.full_name}! Your edLEAD ID is: ${schoolUser.user_code}. You can use this ID, your email, or phone number to log in.`;

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
          const twilioResp = await fetch(twilioUrl, {
            method: "POST",
            headers: {
              "Authorization": "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              MessagingServiceSid: messagingSid,
              To: phone,
              Body: body,
            }),
          });

          results.sms = twilioResp.ok ? "sent" : "failed";
        }
      } catch {
        results.sms = "failed";
      }
    }

    // Send email with user_code
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "edLEAD <noreply@edlead.co.za>",
            to: [schoolUser.email],
            subject: "Welcome to edLEAD Portal — Your edLEAD ID",
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <div style="text-align:center;margin-bottom:20px;">
                  <img src="https://edlead.co.za/images/edlead-logo-email-header.png" alt="edLEAD" style="height:50px;" />
                </div>
                <h2 style="color:#ED7621;">Welcome to edLEAD Portal!</h2>
                <p>Dear ${schoolUser.full_name},</p>
                <p>Your registration has been approved. Here are your login details:</p>
                <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
                  <p style="margin:0 0 8px 0;color:#666;font-size:14px;">Your edLEAD ID</p>
                  <p style="margin:0;font-size:28px;font-weight:bold;color:#ED7621;letter-spacing:2px;">${schoolUser.user_code}</p>
                </div>
                <p>You can log in using any of the following:</p>
                <ul>
                  <li><strong>Email:</strong> ${schoolUser.email}</li>
                  ${schoolUser.phone ? `<li><strong>Phone:</strong> ${schoolUser.phone}</li>` : ""}
                  <li><strong>edLEAD ID:</strong> ${schoolUser.user_code}</li>
                </ul>
                <p>Visit <a href="https://edlead.co.za/portal/login" style="color:#ED7621;">edlead.co.za/portal/login</a> to sign in.</p>
                <hr style="margin:20px 0;border:none;border-top:1px solid #eee;" />
                <p style="color:#999;font-size:12px;">This is an automated message from edLEAD. Please do not reply.</p>
              </div>
            `,
          }),
        });

        results.email = emailResp.ok ? "sent" : "failed";
      }
    } catch {
      results.email = "failed";
    }

    return new Response(
      JSON.stringify({ success: true, user_code: schoolUser.user_code, notifications: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
