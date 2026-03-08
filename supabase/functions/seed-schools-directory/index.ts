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

    const { schools } = await req.json();

    if (!Array.isArray(schools) || schools.length === 0) {
      return new Response(JSON.stringify({ error: "No schools data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch insert in chunks of 500
    const chunkSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < schools.length; i += chunkSize) {
      const chunk = schools.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("schools_directory")
        .upsert(chunk, { onConflict: "emis_number", ignoreDuplicates: true });
      
      if (error) {
        console.error(`Error inserting chunk at ${i}:`, error);
      } else {
        inserted += chunk.length;
      }
    }

    return new Response(JSON.stringify({ success: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
