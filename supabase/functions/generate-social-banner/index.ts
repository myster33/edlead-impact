import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  } catch {
    return null;
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildSvg(templateB64: string, applicantName: string, photoB64?: string | null): string {
  const W = 1080, H = 1080;
  const name = escapeXml(applicantName.toUpperCase());

  // Photo circle clip
  const photoSection = photoB64
    ? `<defs><clipPath id="cp"><circle cx="540" cy="360" r="220"/></clipPath></defs>
       <image xlink:href="data:image/jpeg;base64,${photoB64}" x="320" y="140" width="440" height="440" clip-path="url(#cp)" preserveAspectRatio="xMidYMid slice"/>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <image xlink:href="data:image/jpeg;base64,${templateB64}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice"/>
  ${photoSection}
  <text x="${W/2}" y="680" text-anchor="middle" font-size="42" font-weight="bold" fill="#ED7621" letter-spacing="4">CONGRATULATIONS</text>
  <text x="${W/2}" y="750" text-anchor="middle" font-size="48" font-weight="bold" fill="#D4A843" letter-spacing="2">${name}</text>
  <text x="${W/2}" y="820" text-anchor="middle" font-size="28" fill="#4A4A4A" letter-spacing="1">Accepted into the</text>
  <text x="${W/2}" y="865" text-anchor="middle" font-size="34" font-weight="bold" fill="#4A4A4A" letter-spacing="1">edLEAD Leadership Program</text>
</svg>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantName, applicantPhotoUrl, applicationId } = await req.json();

    if (!applicantName) {
      return new Response(
        JSON.stringify({ error: "Applicant name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Generating social banner for ${applicantName}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get template
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl("templates/social-banner-template.jpg");

    const templateB64 = await fetchImageAsBase64(templateUrlData.publicUrl);
    if (!templateB64) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch template" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get photo
    let photoB64: string | null = null;
    if (applicantPhotoUrl?.trim()) {
      photoB64 = await fetchImageAsBase64(applicantPhotoUrl);
    }

    // Build SVG and upload as SVG (browsers render SVG perfectly including text)
    const svg = buildSvg(templateB64, applicantName, photoB64);
    const svgBuffer = new TextEncoder().encode(svg);

    const timestamp = Date.now();
    const sanitizedName = applicantName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `banners/${sanitizedName}_${timestamp}.svg`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("applicant-photos")
      .upload(fileName, svgBuffer, {
        contentType: "image/svg+xml",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload failed:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload banner" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl(uploadData.path);

    const bannerUrl = urlData.publicUrl;
    console.log("Banner uploaded:", bannerUrl);

    if (applicationId) {
      await supabase
        .from("applications")
        .update({ social_banner_url: bannerUrl })
        .eq("id", applicationId);
    }

    return new Response(
      JSON.stringify({ success: true, bannerUrl }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
