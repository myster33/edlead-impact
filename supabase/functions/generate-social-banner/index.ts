import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
    
    // Convert to base64
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    // Detect content type
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
  if (!LOVABLE_API_KEY) {
    console.error("Missing LOVABLE_API_KEY");
    return null;
  }

  try {
    console.log("Composing banner for:", applicantName);
    console.log("Has photo:", !!applicantPhotoBase64);

    const content: any[] = [];

    if (applicantPhotoBase64) {
      content.push({
        type: "text",
        text: `Edit this social media banner template by:
1. Take the person's photo (second image) and place it in the circular frame area near the top of the banner
2. Crop the photo to a perfect circle and fit it within the existing circular frame
3. Add elegant text below the photo area, centered, with the following format:
   - "CONGRATULATIONS" in white text (clean, no shadow)
   - "${applicantName.toUpperCase()}" in gold/golden color (prominent, slightly larger)
   - "YOU HAVE BEEN ACCEPTED INTO THE edLEAD LEADERSHIP PROGRAM" in white text (clean, no shadow)
4. Use Montserrat or similar modern sans-serif font, medium weight
5. Keep all other elements of the template exactly as they are
6. The final result should look professional, elegant and celebratory

Output a single composited image.`,
      });
      content.push({ type: "image_url", image_url: { url: templateBase64 } });
      content.push({ type: "image_url", image_url: { url: applicantPhotoBase64 } });
    } else {
      content.push({
        type: "text",
        text: `Edit this social media banner template by:
1. Keep the circular frame area as-is (it can remain empty or with existing placeholder)
2. Add elegant text below the photo area, centered, with the following format:
   - "CONGRATULATIONS" in white text (clean, no shadow)
   - "${applicantName.toUpperCase()}" in gold/golden color (prominent, slightly larger)
   - "YOU HAVE BEEN ACCEPTED INTO THE edLEAD LEADERSHIP PROGRAM" in white text (clean, no shadow)
3. Use Montserrat or similar modern sans-serif font, medium weight
4. Keep all other elements of the template exactly as they are
5. The final result should look professional, elegant and celebratory

Output a single edited image.`,
      });
      content.push({ type: "image_url", image_url: { url: templateBase64 } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image URL in response");
      return null;
    }

    return imageUrl;
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
        JSON.stringify({ error: "Failed to generate banner", bannerUrl: null }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Upload to storage
    const bannerUrl = await uploadBannerToStorage(supabase, composedBanner, applicantName);

    if (!bannerUrl) {
      // Return base64 as fallback
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
