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
    const base64 = btoa(binary);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.error("Failed to fetch image:", e);
    return null;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(
  templateBase64: string,
  applicantName: string,
  photoBase64?: string | null
): string {
  const W = 1080;
  const H = 1080;
  const circleX = 540;
  const circleY = 360;
  const circleR = 220;
  const name = escapeXml(applicantName.toUpperCase());

  const photoClip = photoBase64
    ? `<defs>
        <clipPath id="circleClip">
          <circle cx="${circleX}" cy="${circleY}" r="${circleR}" />
        </clipPath>
      </defs>
      <image xlink:href="${photoBase64}" 
        x="${circleX - circleR}" y="${circleY - circleR}" 
        width="${circleR * 2}" height="${circleR * 2}" 
        clip-path="url(#circleClip)" 
        preserveAspectRatio="xMidYMid slice" />`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <image xlink:href="${templateBase64}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice" />
  ${photoClip}
  <text x="${W / 2}" y="680" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" fill="#ED7621" letter-spacing="4">CONGRATULATIONS</text>
  <text x="${W / 2}" y="750" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="bold" fill="#D4A843" letter-spacing="2">${name}</text>
  <text x="${W / 2}" y="820" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#4A4A4A" letter-spacing="1">Accepted into the</text>
  <text x="${W / 2}" y="865" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="bold" fill="#4A4A4A" letter-spacing="1">edLEAD Leadership Program</text>
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

    // Fetch template from storage
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl("templates/social-banner-template.jpg");

    console.log("Template URL:", templateUrlData.publicUrl);

    const templateBase64 = await fetchImageAsBase64(templateUrlData.publicUrl);
    if (!templateBase64) {
      console.error("Failed to fetch template image from:", templateUrlData.publicUrl);
      return new Response(
        JSON.stringify({ error: "Failed to fetch template image" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("Template loaded, base64 length:", templateBase64.length);

    // Fetch student photo
    let photoBase64: string | null = null;
    if (applicantPhotoUrl && applicantPhotoUrl.trim()) {
      photoBase64 = await fetchImageAsBase64(applicantPhotoUrl);
      if (!photoBase64) console.warn("Could not fetch applicant photo, proceeding without it");
      else console.log("Photo loaded, base64 length:", photoBase64.length);
    }

    // Build SVG
    const svg = buildSvg(templateBase64, applicantName, photoBase64);
    console.log("SVG built, length:", svg.length);

    // Try to render SVG to PNG using resvg-wasm
    let pngBuffer: Uint8Array;
    try {
      const { Resvg, initWasm } = await import("https://esm.sh/@aspect-dev/resvg-wasm@0.0.2");
      
      try {
        const wasmUrl = "https://esm.sh/@aspect-dev/resvg-wasm@0.0.2/resvg.wasm";
        console.log("Fetching WASM from:", wasmUrl);
        const wasmResponse = await fetch(wasmUrl);
        if (!wasmResponse.ok) throw new Error(`WASM fetch failed: ${wasmResponse.status}`);
        const wasmBuf = await wasmResponse.arrayBuffer();
        console.log("WASM loaded, size:", wasmBuf.byteLength);
        await initWasm(wasmBuf);
        console.log("WASM initialized");
      } catch (e) {
        if (!String(e).includes("already")) throw e;
        console.log("WASM already initialized");
      }

      const resvg = new Resvg(svg, {
        fitTo: { mode: "width", value: 1080 },
        font: { loadSystemFonts: false },
      });
      const rendered = resvg.render();
      pngBuffer = rendered.asPng();
      console.log("PNG rendered, size:", pngBuffer.length);
    } catch (resvgError) {
      console.error("resvg rendering failed:", resvgError);
      // Fallback: upload SVG directly as a last resort
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
        console.error("SVG upload failed:", uploadError);
        return new Response(
          JSON.stringify({ error: "Failed to upload banner" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: urlData } = supabase.storage
        .from("applicant-photos")
        .getPublicUrl(uploadData.path);

      const bannerUrl = urlData.publicUrl;
      console.log("SVG banner uploaded (fallback):", bannerUrl);

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
    }

    // Upload PNG to storage
    const timestamp = Date.now();
    const sanitizedName = applicantName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `banners/${sanitizedName}_${timestamp}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("applicant-photos")
      .upload(fileName, pngBuffer, {
        contentType: "image/png",
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

    // Save URL to application record if applicationId provided
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
    console.error("Error in generate-social-banner:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
