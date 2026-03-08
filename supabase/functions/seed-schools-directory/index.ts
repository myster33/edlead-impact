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

    const { raw_data } = await req.json();

    if (!raw_data || typeof raw_data !== "string") {
      return new Response(JSON.stringify({ error: "raw_data string required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines = raw_data.split("\n").filter((l: string) => l.trim().startsWith("|") && !l.includes("District Name") && !l.includes("|-"));
    
    const schools = lines.map((line: string) => {
      const cols = line.split("|").map((c: string) => c.trim()).filter((_: string, i: number) => i > 0);
      // cols: 0=District, 1=DistCode, 2=GautengRef, 3=EmisNumber, 4=InstitutionName, 5=Level, ...
      // 13=StreetNo, 14=StreetName, 15=Township, 16=Suburb, 17=Town
      const streetNo = cols[13] || "";
      const streetName = cols[14] || "";
      const township = cols[15] || "";
      const suburb = cols[16] || "";
      const town = cols[17] || "";
      const address = [streetNo, streetName, township, suburb, town].filter(Boolean).join(", ");

      return {
        emis_number: cols[3] || "",
        name: cols[4] || "",
        address: address || null,
        province: "Gauteng",
        district: cols[0] || null,
        level: cols[5] || null,
        sector: cols[8] || null,
      };
    }).filter((s: any) => s.emis_number && s.name);

    // Batch insert
    const chunkSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < schools.length; i += chunkSize) {
      const chunk = schools.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("schools_directory")
        .upsert(chunk, { onConflict: "emis_number", ignoreDuplicates: true });
      
      if (error) {
        console.error(`Error inserting chunk at ${i}:`, error.message);
      } else {
        inserted += chunk.length;
      }
    }

    return new Response(JSON.stringify({ success: true, parsed: schools.length, inserted }), {
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
