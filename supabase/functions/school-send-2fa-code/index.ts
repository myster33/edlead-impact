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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get requesting user
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { action } = await req.json();
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (action === "send") {
      // Generate 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000));
      
      // Hash the code
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const codeHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

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
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ED7621;">${code}</span>
              </div>
              <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        throw new Error(`Failed to send email: ${errBody}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const { code } = await req.json();
      if (!code) throw new Error("Code required");

      // Hash the provided code
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const codeHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // Check for valid code
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

      // Mark used
      await adminClient.from("school_2fa_codes").update({ used: true }).eq("id", codeRecord.id);

      // Enable 2FA on school_users
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
