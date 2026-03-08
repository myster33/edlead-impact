import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, code, channel } = body;
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (action === "send") {
      // Generate 6-digit code
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      // Hash the code
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otp));
      const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      // Delete old codes for this user
      await adminClient.from("admin_2fa_codes").delete().eq("user_id", user.id);

      // Store hashed code with 10 min expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await adminClient.from("admin_2fa_codes").insert({
        user_id: user.id,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      if (channel === "sms") {
        // Send SMS via Twilio
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioMsgSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
        if (!twilioSid || !twilioAuth || !twilioMsgSid) throw new Error("SMS service not configured");

        // Get admin's phone from admin_users
        const { data: adminUser } = await adminClient
          .from("admin_users")
          .select("phone")
          .eq("user_id", user.id)
          .maybeSingle();

        const recipientPhone = adminUser?.phone;
        if (!recipientPhone) throw new Error("No phone number on your profile. Please add one first.");

        console.log("Sending admin 2FA SMS to:", recipientPhone);

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const smsBody = new URLSearchParams({
          To: recipientPhone,
          MessagingServiceSid: twilioMsgSid,
          Body: `Your edLEAD Admin Portal verification code is: ${otp}. This code expires in 10 minutes.`,
        });

        const smsRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${twilioSid}:${twilioAuth}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: smsBody.toString(),
        });

        if (!smsRes.ok) {
          const smsResBody = await smsRes.text();
          console.error("Twilio error:", smsResBody);
          throw new Error("Failed to send SMS");
        }
      } else {
        // Send email via Resend (default)
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (!resendKey) throw new Error("Email service not configured");

        const recipientEmail = user.email;
        console.log("Sending admin 2FA code to:", recipientEmail);

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "edLEAD <noreply@edlead.co.za>",
            to: [recipientEmail],
            subject: "Your edLEAD Admin Portal Verification Code",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #333;">Your Verification Code</h2>
                <p style="color: #555;">Use this code to verify your identity on the Admin Portal:</p>
                <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ED7621;">${otp}</span>
                </div>
                <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
              </div>
            `,
          }),
        });

        if (!emailRes.ok) {
          const emailResBody = await emailRes.text();
          console.error("Resend error:", emailResBody);
          throw new Error("Failed to send verification email");
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      if (!code) throw new Error("Code required");

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(code));
      const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: codeRecord } = await adminClient
        .from("admin_2fa_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code_hash", codeHash)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!codeRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("admin_2fa_codes").update({ used: true }).eq("id", codeRecord.id);
      await adminClient.from("admin_users").update({ two_fa_enabled: true }).eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_login") {
      // Verify code at login (doesn't change two_fa_enabled)
      if (!code) throw new Error("Code required");

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(code));
      const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: codeRecord } = await adminClient
        .from("admin_2fa_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code_hash", codeHash)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!codeRecord) {
        return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("admin_2fa_codes").update({ used: true }).eq("id", codeRecord.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disable") {
      await adminClient.from("admin_users").update({ two_fa_enabled: false, two_fa_channel: "email" }).eq("user_id", user.id);
      await adminClient.from("admin_2fa_codes").delete().eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_channel") {
      const { channel: newChannel } = body;
      if (!["email", "sms"].includes(newChannel)) throw new Error("Invalid channel");
      await adminClient.from("admin_users").update({ two_fa_channel: newChannel }).eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err) {
    console.error("admin-send-2fa-code error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
