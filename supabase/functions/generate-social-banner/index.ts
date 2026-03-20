import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status} from ${url}`);
      return null;
    }
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
    console.error("Error fetching image:", e);
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

    // Fetch template as base64
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl("templates/social-banner-template.jpg");
    console.log("Template URL:", templateUrlData.publicUrl);

    const templateBase64 = await fetchImageAsBase64(templateUrlData.publicUrl);
    if (!templateBase64) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch template image" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("Template loaded as base64, length:", templateBase64.length);

    // Fetch student photo as base64
    let photoBase64: string | null = null;
    if (applicantPhotoUrl?.trim()) {
      photoBase64 = await fetchImageAsBase64(applicantPhotoUrl);
      if (!photoBase64) console.warn("Could not fetch photo, proceeding without");
      else console.log("Photo loaded as base64, length:", photoBase64.length);
    }

    // Build image using og_edge (satori + resvg) with base64 embedded images
    const children: any[] = [];

    // Background template (base64 data URI)
    children.push(
      React.createElement("img", {
        key: "bg",
        src: templateBase64,
        width: 1080,
        height: 1080,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "1080px",
          height: "1080px",
        },
      })
    );

    // Student photo (circular) - base64 data URI
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

    // Text container
    children.push(
      React.createElement(
        "div",
        {
          key: "text",
          style: {
            position: "absolute",
            bottom: "100px",
            left: "0",
            width: "1080px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "42px",
              fontWeight: 700,
              color: "#ED7621",
              letterSpacing: "4px",
            },
          },
          "CONGRATULATIONS"
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "44px",
              fontWeight: 700,
              color: "#D4A843",
              letterSpacing: "2px",
              marginTop: "16px",
            },
          },
          applicantName.toUpperCase()
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "28px",
              color: "#4A4A4A",
              marginTop: "16px",
            },
          },
          "Accepted into the"
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              fontSize: "34px",
              fontWeight: 700,
              color: "#4A4A4A",
              marginTop: "8px",
            },
          },
          "edLEAD Leadership Program"
        )
      )
    );

    const element = React.createElement(
      "div",
      {
        style: {
          width: "1080px",
          height: "1080px",
          display: "flex",
          position: "relative",
        },
      },
      ...children
    );

    console.log("Generating ImageResponse...");
    const imageResponse = new ImageResponse(element, {
      width: 1080,
      height: 1080,
    });

    const pngBuffer = new Uint8Array(await imageResponse.arrayBuffer());
    console.log("PNG generated, size:", pngBuffer.length);

    // Upload to storage
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
