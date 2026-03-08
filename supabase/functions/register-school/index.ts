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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, school_name, school_code, emis_number, address, province, role, full_name, email, phone } = await req.json();

    if (!user_id || !school_name || !school_code || !role || !full_name || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the school
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert({
        name: school_name,
        school_code,
        emis_number: emis_number || null,
        address,
        province,
        is_verified: false,
      })
      .select("id")
      .single();

    if (schoolError) {
      console.error("School insert error:", schoolError);
      return new Response(JSON.stringify({ error: "Failed to register school: " + schoolError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create school_user record
    const { error: userError } = await supabase
      .from("school_users")
      .insert({
        user_id,
        school_id: school.id,
        role,
        full_name,
        email,
        phone: phone || null,
        is_active: true,
      });

    if (userError) {
      console.error("School user insert error:", userError);
      // Clean up the school we just created
      await supabase.from("schools").delete().eq("id", school.id);
      return new Response(JSON.stringify({ error: "Failed to create user profile: " + userError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, school_id: school.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
