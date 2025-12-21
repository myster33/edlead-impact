import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's token to verify they're authenticated
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to check admin status and add user
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if current user is an admin
    const { data: adminCheck } = await adminClient
      .from("admin_users")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (!adminCheck || adminCheck.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins can add new admin users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ success: false, error: "Email and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["viewer", "reviewer", "admin"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    const { data: userData, error: userError } = await adminClient.auth.admin.listUsers();
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to search users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) {
      return new Response(
        JSON.stringify({ success: false, error: "User not found. They must sign up at /admin/login first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already admin
    const { data: existingAdmin } = await adminClient
      .from("admin_users")
      .select("id")
      .eq("user_id", targetUser.id)
      .single();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: "User is already an admin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add admin user
    const { data: newAdmin, error: insertError } = await adminClient
      .from("admin_users")
      .insert({
        user_id: targetUser.id,
        email: email.toLowerCase(),
        role: role,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting admin:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to add admin user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin user added:", email, "with role:", role);

    return new Response(
      JSON.stringify({ success: true, admin: newAdmin }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in add-admin-user:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
