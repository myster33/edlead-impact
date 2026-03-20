import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import satori from "https://esm.sh/satori@0.10.11";
import { Resvg, initWasm } from "https://esm.sh/@aspect-dev/resvg-wasm@0.0.2";
import React from "https://esm.sh/react@18.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let wasmInitialized = false;
let fontData: ArrayBuffer | null = null;

async function ensureWasm() {
  if (!wasmInitialized) {
    try {
      const wasmUrl = "https://esm.sh/@aspect-dev/resvg-wasm@0.0.2/resvg.wasm";
      const res = await fetch(wasmUrl);
      if (!res.ok) throw new Error(`WASM fetch: ${res.status}`);
      await initWasm(await res.arrayBuffer());
      wasmInitialized = true;
      console.log("WASM initialized");
    } catch (e) {
      if (String(e).includes("already")) {
        wasmInitialized = true;
      } else {
        throw e;
      }
    }
  }
}

async function loadFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  // Load Inter font from Google Fonts
  const fontUrl = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf";
  const res = await fetch(fontUrl);
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  fontData = await res.arrayBuffer();
  console.log("Font loaded, size:", fontData.byteLength);
  return fontData;
}

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
  } catch {
    return null;
  }
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

    // Load font and init WASM in parallel
    const [font] = await Promise.all([loadFont(), ensureWasm()]);

    // Get template base64
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl("templates/social-banner-template.jpg");

    const templateBase64 = await fetchImageAsBase64(templateUrlData.publicUrl);
    if (!templateBase64) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch template image" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("Template loaded");

    // Get photo base64
    let photoBase64: string | null = null;
    if (applicantPhotoUrl?.trim()) {
      photoBase64 = await fetchImageAsBase64(applicantPhotoUrl);
      if (!photoBase64) console.warn("Could not fetch photo");
      else console.log("Photo loaded");
    }

    // Build React element tree
    const children: any[] = [
      React.createElement("img", {
        key: "bg",
        src: templateBase64,
        width: 1080,
        height: 1080,
        style: { position: "absolute", top: 0, left: 0, width: "1080px", height: "1080px" },
      }),
    ];

    if (photoBase64) {
      children.push(
        React.createElement("img", {
          key: "photo",
          src: photoBase64,
          width: 440,
          height: 440,
          style: {
            position: "absolute",
            top: "140px",
            left: "320px",
            width: "440px",
            height: "440px",
            borderRadius: "220px",
          },
        })
      );
    }

    children.push(
      React.createElement(
        "div",
        {
          key: "text",
          style: {
            position: "absolute",
            bottom: "80px",
            left: "0",
            width: "1080px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        React.createElement("div", {
          style: { display: "flex", fontSize: "42px", fontWeight: 700, color: "#ED7621", letterSpacing: "4px" },
        }, "CONGRATULATIONS"),
        React.createElement("div", {
          style: { display: "flex", fontSize: "44px", fontWeight: 700, color: "#D4A843", letterSpacing: "2px", marginTop: "16px" },
        }, applicantName.toUpperCase()),
        React.createElement("div", {
          style: { display: "flex", fontSize: "28px", color: "#4A4A4A", marginTop: "16px" },
        }, "Accepted into the"),
        React.createElement("div", {
          style: { display: "flex", fontSize: "34px", fontWeight: 700, color: "#4A4A4A", marginTop: "8px" },
        }, "edLEAD Leadership Program")
      )
    );

    const element = React.createElement(
      "div",
      { style: { width: "1080px", height: "1080px", display: "flex", position: "relative" } },
      ...children
    );

    // Use satori with explicit font
    console.log("Running satori...");
    const svg = await satori(element, {
      width: 1080,
      height: 1080,
      fonts: [
        {
          name: "Inter",
          data: font,
          weight: 400,
          style: "normal" as const,
        },
        {
          name: "Inter",
          data: font,
          weight: 700,
          style: "normal" as const,
        },
      ],
    });
    console.log("SVG generated, length:", svg.length);

    // Convert SVG to PNG with resvg
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 1080 },
      font: { loadSystemFonts: false },
    });
    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();
    console.log("PNG rendered, size:", pngBuffer.length);

    // Upload
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
