import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateBannerRequest {
  applicantName: string;
  applicantPhotoUrl: string;
  referenceNumber?: string;
}

async function generateSocialBanner(
  applicantName: string,
  applicantPhotoUrl: string
): Promise<string | null> {
  if (!LOVABLE_API_KEY) {
    console.error("Missing LOVABLE_API_KEY");
    return null;
  }

  try {
    console.log("Generating social banner for:", applicantName);
    
    // Use AI to generate a 1:1 social media banner
    const prompt = `Create a professional, celebratory 1:1 square social media announcement banner for a student leadership program acceptance.

Design requirements:
- Professional and elegant design with orange (#ED7621) as the primary accent color
- Dark charcoal gray (#4A4A4A) as secondary color
- Clean, modern typography
- Include space for a circular photo placeholder in the center-top area
- The text "Accepted into the" in smaller font
- "edLEAD Leadership Programme" as the main headline in bold
- The student name "${applicantName}" prominently displayed
- Include decorative elements like subtle geometric patterns or confetti
- Add "@edlead_za" social media tag at the bottom
- Make it shareable and social media ready
- Professional gradient background

This is a 1:1 aspect ratio image (square format) for social media sharing. Ultra high resolution.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error("No image URL in response");
      return null;
    }

    // Upload the base64 image to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Convert base64 to blob
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Create unique filename
    const timestamp = Date.now();
    const sanitizedName = applicantName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const fileName = `banners/${sanitizedName}_${timestamp}.png`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("applicant-photos")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload banner:", uploadError);
      // Return the base64 data URL as fallback
      return imageUrl;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("applicant-photos")
      .getPublicUrl(uploadData.path);

    console.log("Banner uploaded successfully:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error generating banner:", error);
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

    const bannerUrl = await generateSocialBanner(applicantName, applicantPhotoUrl);

    if (!bannerUrl) {
      return new Response(
        JSON.stringify({ error: "Failed to generate banner", bannerUrl: null }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
