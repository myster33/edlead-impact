import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callBedrock } from "../bedrock-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateBannerRequest {
  applicantName: string;
  applicantPhotoUrl?: string;
}

const TEMPLATE_PATH = "templates/social-banner-template.jpg";

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    console.log("Fetching image:", url);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Failed to fetch image:", response.status, response.statusText);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}

async function composeBannerWithAI(
  templateBase64: string,
  applicantName: string,
  applicantPhotoBase64?: string | null
): Promise<string | null> {
  try {
    console.log("Composing banner for:", applicantName);
    console.log("Has photo:", !!applicantPhotoBase64);

    // Build content blocks for Bedrock/Anthropic vision
    const contentParts: any[] = [];

    // Template image
    const templateMatch = templateBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (templateMatch) {
      contentParts.push({
        type: "image",
        source: {
          type: "base64",
          media_type: templateMatch[1],
          data: templateMatch[2],
        },
      });
    }

    // Applicant photo if available
    if (applicantPhotoBase64) {
      const photoMatch = applicantPhotoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (photoMatch) {
        contentParts.push({
          type: "image",
          source: {
            type: "base64",
            media_type: photoMatch[1],
            data: photoMatch[2],
          },
        });
      }
    }

    const prompt = applicantPhotoBase64
      ? `You are a graphic design assistant. Based on the social media banner template (first image) and the applicant's photo (second image), generate the text content for a celebratory acceptance banner.

Return the following text elements that should appear on the banner:
- "CONGRATULATIONS"
- "${applicantName.toUpperCase()}"
- "YOU HAVE BEEN ACCEPTED INTO THE edLEAD LEADERSHIP PROGRAM"

Describe the ideal layout: the photo should be in the circular frame area, with the congratulatory text centered below. The design should look professional, elegant, and celebratory.`
      : `You are a graphic design assistant. Based on the social media banner template, generate the text content for a celebratory acceptance banner.

Return the following text elements that should appear on the banner:
- "CONGRATULATIONS"
- "${applicantName.toUpperCase()}"
- "YOU HAVE BEEN ACCEPTED INTO THE edLEAD LEADERSHIP PROGRAM"

Describe the ideal layout with the congratulatory text centered. The design should look professional, elegant, and celebratory.`;

    contentParts.push({ type: "text", text: prompt });

    const bedrockResponse = await callBedrock({
      system: "You are a professional graphic design assistant specializing in social media banners.",
      messages: [{ role: "user", content: contentParts }],
      max_tokens: 1024,
    });

    // Note: Bedrock Claude returns text descriptions, not generated images.
    // The original function used an image-generation model. Since Bedrock Claude
    // doesn't generate images, we return null and let the caller handle fallback.
    console.log("Bedrock returned text response (Claude cannot generate images)");
    return null;
  } catch (error) {
    console.error("Error composing banner:", error);
    return null;
  }
}

async function uploadBannerToStorage(
  supabase: any,
  base64Image: string,
  applicantName: string
): Promise<string | null> {
  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const timestamp = Date.now();
    const sanitizedName = applicantName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `banners/${sanitizedName}_${timestamp}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("applicant-photos")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload banner:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl(uploadData.path);

    console.log("Banner uploaded:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading banner:", error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantName, applicantPhotoUrl }: GenerateBannerRequest = await req.json();

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

    // Get template URL and fetch as base64
    const { data: templateUrlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl(TEMPLATE_PATH);
    
    console.log("Template URL:", templateUrlData.publicUrl);
    
    const templateBase64 = await fetchImageAsBase64(templateUrlData.publicUrl);
    if (!templateBase64) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch template image" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch applicant photo as base64 if provided
    let applicantPhotoBase64: string | null = null;
    if (applicantPhotoUrl && applicantPhotoUrl.trim() !== "") {
      console.log("Fetching applicant photo:", applicantPhotoUrl);
      applicantPhotoBase64 = await fetchImageAsBase64(applicantPhotoUrl);
      if (!applicantPhotoBase64) {
        console.warn("Could not fetch applicant photo, proceeding without it");
      }
    }

    // Compose banner with AI
    const composedBanner = await composeBannerWithAI(templateBase64, applicantName, applicantPhotoBase64);

    if (!composedBanner) {
      return new Response(
        JSON.stringify({ error: "Banner generation not available — Claude on Bedrock does not support image generation. Consider using a different image generation service.", bannerUrl: null }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upload to storage
    const bannerUrl = await uploadBannerToStorage(supabase, composedBanner, applicantName);

    if (!bannerUrl) {
      return new Response(
        JSON.stringify({ success: true, bannerUrl: composedBanner }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
