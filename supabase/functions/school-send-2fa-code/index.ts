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

    // Validate JWT
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
    const { action, code } = body;
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (action === "send") {
      // Generate 6-digit code
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      // Hash the code
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(otp));
      const codeHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      // Delete old codes for this user
      await adminClient.from("school_2fa_codes").delete().eq("user_id", user.id);

      // Store hashed code with 10 min expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await adminClient.from("school_2fa_codes").insert({
        user_id: user.id,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

      // Send email via Resend
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) throw new Error("Email service not configured");

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "edLEAD <noreply@edlead.co.za>",
          to: [user.email],
          subject: "Your edLEAD School Portal Verification Code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #333;">Your Verification Code</h2>
              <p style="color: #555;">Use this code to enable two-factor authentication on your School Portal account:</p>
              <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ED7621;">${otp}</span>
              </div>
              <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
          `,
        }),
      });

      const emailResBody = await emailRes.text();
      console.log("Resend status:", emailRes.status, "body:", emailResBody);
      if (!emailRes.ok) {
        console.error("Resend error:", emailResBody);
        throw new Error("Failed to send verification email: " + emailResBody);
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
        .from("school_2fa_codes")
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

      await adminClient.from("school_2fa_codes").update({ used: true }).eq("id", codeRecord.id);
      await adminClient.from("school_users").update({ two_fa_enabled: true }).eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "disable") {
      await adminClient.from("school_users").update({ two_fa_enabled: false }).eq("user_id", user.id);
      await adminClient.from("school_2fa_codes").delete().eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (err) {
    console.error("school-send-2fa-code error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
