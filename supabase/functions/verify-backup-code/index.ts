import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for backup codes
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

interface VerifyBackupCodeRequest {
  code: string;
  adminUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { code, adminUserId }: VerifyBackupCodeRequest = await req.json();

    if (!code || !adminUserId) {
      return new Response(
        JSON.stringify({ error: "Missing code or adminUserId" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Hash the provided code
    const codeHash = await hashCode(code.toUpperCase().replace(/-/g, ""));

    // Find matching unused backup code
    const { data: backupCodes, error: fetchError } = await supabase
      .from("admin_backup_codes")
      .select("id, code_hash")
      .eq("admin_user_id", adminUserId)
      .is("used_at", null);

    if (fetchError) {
      console.error("Error fetching backup codes:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if any code matches
    const matchingCode = backupCodes?.find(bc => bc.code_hash === codeHash);

    if (!matchingCode) {
      console.log("No matching backup code found");
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid backup code" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark the code as used
    const { error: updateError } = await supabase
      .from("admin_backup_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", matchingCode.id);

    if (updateError) {
      console.error("Error marking code as used:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update code status" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Count remaining codes
    const remainingCodes = (backupCodes?.length || 1) - 1;

    console.log(`Backup code verified successfully. ${remainingCodes} codes remaining.`);
    return new Response(
      JSON.stringify({ valid: true, remainingCodes }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-backup-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
