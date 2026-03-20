import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Get template URL
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl("templates/social-banner-template.jpg");
    const templateUrl = templateUrlData.publicUrl;
    console.log("Template URL:", templateUrl);

    // Build the photo URL (use provided or empty)
    const photoUrl = applicantPhotoUrl?.trim() || null;

    // Generate banner image using og_edge (satori + resvg-wasm)
    const element = React.createElement(
      "div",
      {
        style: {
          width: "1080px",
          height: "1080px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          position: "relative",
          fontFamily: "Arial, Helvetica, sans-serif",
        },
      },
      // Background template image
      React.createElement("img", {
        src: templateUrl,
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "1080px",
          height: "1080px",
          objectFit: "cover",
        },
      }),
      // Student photo in circle
      photoUrl
        ? React.createElement("img", {
            src: photoUrl,
            style: {
              position: "absolute",
              top: "140px",
              left: "320px",
              width: "440px",
              height: "440px",
              borderRadius: "50%",
              objectFit: "cover",
            },
          })
        : null,
      // Text area below photo
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: "640px",
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: "42px",
              fontWeight: "bold",
              color: "#ED7621",
              letterSpacing: "4px",
            },
          },
          "CONGRATULATIONS"
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: "48px",
              fontWeight: "bold",
              color: "#D4A843",
              letterSpacing: "2px",
            },
          },
          applicantName.toUpperCase()
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: "28px",
              color: "#4A4A4A",
              letterSpacing: "1px",
            },
          },
          "Accepted into the"
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: "34px",
              fontWeight: "bold",
              color: "#4A4A4A",
              letterSpacing: "1px",
            },
          },
          "edLEAD Leadership Program"
        )
      )
    );

    const imageResponse = new ImageResponse(element, {
      width: 1080,
      height: 1080,
    });

    // Get PNG buffer from ImageResponse
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

    // Save URL to application record
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
