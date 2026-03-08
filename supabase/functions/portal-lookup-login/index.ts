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
    const { identifier } = await req.json();

    if (!identifier || identifier.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Invalid identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const trimmed = identifier.trim();

    // Determine identifier type
    const isEmail = trimmed.includes("@");
    const isUserCode = /^ED\d{6}$/i.test(trimmed);
    const isPhone = /^\+?\d{7,15}$/.test(trimmed.replace(/\s/g, ""));

    let query = supabase
      .from("school_users")
      .select("email")
      .eq("is_active", true);

    if (isEmail) {
      query = query.eq("email", trimmed);
    } else if (isUserCode) {
      query = query.eq("user_code", trimmed.toUpperCase());
    } else if (isPhone) {
      query = query.eq("phone", trimmed.replace(/\s/g, ""));
    } else {
      // Try user_code as fallback
      query = query.eq("user_code", trimmed.toUpperCase());
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "No account found with that identifier" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ email: data.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
