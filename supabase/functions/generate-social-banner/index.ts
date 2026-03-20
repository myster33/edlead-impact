import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ImageMagick,
  initialize,
  MagickFormat,
  MagickGeometry,
  Gravity,
  MagickImage,
  DrawableFont,
  DrawableFontPointSize,
  DrawableGravity,
  DrawableFillColor,
  DrawableText,
  MagickColor,
  MagickColors,
} from "https://deno.land/x/imagemagick_deno@0.0.31/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

let magickInitialized = false;

async function ensureMagick() {
  if (!magickInitialized) {
    await initialize();
    magickInitialized = true;
    console.log("ImageMagick initialized");
  }
}

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (e) {
    console.error(`Error fetching ${url}:`, e);
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

    await ensureMagick();

    // Get template URL and fetch bytes
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl("templates/social-banner-template.jpg");
    console.log("Template URL:", templateUrlData.publicUrl);

    const templateBytes = await fetchImageBytes(templateUrlData.publicUrl);
    if (!templateBytes) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch template image" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    console.log("Template loaded, size:", templateBytes.length);

    // Fetch student photo if provided
    let photoBytes: Uint8Array | null = null;
    if (applicantPhotoUrl?.trim()) {
      photoBytes = await fetchImageBytes(applicantPhotoUrl);
      if (!photoBytes) console.warn("Could not fetch applicant photo, proceeding without it");
      else console.log("Photo loaded, size:", photoBytes.length);
    }

    // Compose image using ImageMagick
    const pngBuffer = await new Promise<Uint8Array>((resolve, reject) => {
      try {
        ImageMagick.read(templateBytes, (template) => {
          // Resize template to 1080x1080
          template.resize(new MagickGeometry(1080, 1080));
          
          // If we have a photo, composite it as a circle
          if (photoBytes) {
            ImageMagick.read(photoBytes, (photo) => {
              // Resize photo to fit circle area (440x440)
              photo.resize(new MagickGeometry(440, 440));
              
              // Create circular mask
              const mask = MagickImage.create();
              mask.read(new MagickColor(0, 0, 0, 0), 440, 440);
              mask.draw([
                new DrawableFillColor(new MagickColor("white")),
                new DrawableText(220, 220, ""),
              ]);
              
              // For simplicity, just composite the photo directly (square crop)
              // Position: center at (540, 360), so top-left at (320, 140)
              template.composite(photo, 320, 140);
              
              // Draw text
              drawText(template, applicantName);
              
              // Export
              template.write(MagickFormat.Png, (data) => {
                resolve(new Uint8Array(data));
              });
            });
          } else {
            // No photo, just draw text
            drawText(template, applicantName);
            
            template.write(MagickFormat.Png, (data) => {
              resolve(new Uint8Array(data));
            });
          }
        });
      } catch (e) {
        reject(e);
      }
    });

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

function drawText(image: any, applicantName: string) {
  const orangeColor = new MagickColor("#ED7621");
  const goldColor = new MagickColor("#D4A843");
  const grayColor = new MagickColor("#4A4A4A");

  // "CONGRATULATIONS"
  image.draw([
    new DrawableGravity(Gravity.North),
    new DrawableFillColor(orangeColor),
    new DrawableFontPointSize(42),
    new DrawableText(0, 660, "CONGRATULATIONS"),
  ]);

  // Student name
  image.draw([
    new DrawableGravity(Gravity.North),
    new DrawableFillColor(goldColor),
    new DrawableFontPointSize(48),
    new DrawableText(0, 730, applicantName.toUpperCase()),
  ]);

  // "Accepted into the"
  image.draw([
    new DrawableGravity(Gravity.North),
    new DrawableFillColor(grayColor),
    new DrawableFontPointSize(28),
    new DrawableText(0, 800, "Accepted into the"),
  ]);

  // "edLEAD Leadership Program"
  image.draw([
    new DrawableGravity(Gravity.North),
    new DrawableFillColor(grayColor),
    new DrawableFontPointSize(34),
    new DrawableText(0, 850, "edLEAD Leadership Program"),
  ]);
}

serve(handler);
