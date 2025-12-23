import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PendingUser {
  id: string;
  email: string;
  created_at: string;
}

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

    // Use service role client to check admin status
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if current user is an admin
    const { data: adminCheck } = await adminClient
      .from("admin_users")
      .select("role")
      .eq("user_id", currentUser.id)
      .single();

    if (!adminCheck || adminCheck.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Only admins can view pending users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all auth users
    const { data: authData, error: authListError } = await adminClient.auth.admin.listUsers();
    if (authListError) {
      console.error("Error listing auth users:", authListError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to list users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all admin users
    const { data: adminUsers, error: adminError } = await adminClient
      .from("admin_users")
      .select("user_id");

    if (adminError) {
      console.error("Error listing admin users:", adminError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to list admin users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const approvedUserIds = new Set(adminUsers?.map(u => u.user_id) || []);

    // Filter to get pending users (in auth but not in admin_users)
    const pendingUsers: PendingUser[] = authData.users
      .filter(user => !approvedUserIds.has(user.id) && user.email)
      .map(user => ({
        id: user.id,
        email: user.email!,
        created_at: user.created_at,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log(`Found ${pendingUsers.length} pending users`);

    return new Response(
      JSON.stringify({ success: true, pendingUsers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in list-pending-users:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
