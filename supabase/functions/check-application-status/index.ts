import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referenceNumber } = await req.json();

    console.log("Checking status for reference:", referenceNumber);

    if (!referenceNumber || typeof referenceNumber !== 'string') {
      console.log("Invalid reference number provided");
      return new Response(
        JSON.stringify({ error: "Reference number is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean and normalize the reference number
    const cleanRef = referenceNumber.trim().toUpperCase();

    if (cleanRef.length < 6 || cleanRef.length > 12) {
      console.log("Reference number has invalid length:", cleanRef.length);
      return new Response(
        JSON.stringify({ error: "Invalid reference number format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch only necessary fields - no PII exposed
    const { data, error } = await supabase
      .from('applications')
      .select('reference_number, status, created_at, full_name')
      .eq('reference_number', cleanRef)
      .maybeSingle();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to check application status" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      console.log("No application found for reference:", cleanRef);
      return new Response(
        JSON.stringify({ error: "No application found with this reference number" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Application found, status:", data.status);

    // Return limited info - only first name for privacy
    const firstName = data.full_name.split(' ')[0];

    return new Response(
      JSON.stringify({
        success: true,
        application: {
          referenceNumber: data.reference_number,
          status: data.status,
          submittedAt: data.created_at,
          applicantFirstName: firstName
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
