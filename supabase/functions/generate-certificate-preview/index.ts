import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreviewRequest {
  fullName: string;
  schoolName: string;
  province: string;
  country: string;
  cohortName: string;
  completionDate: string;
  backgroundImageUrl?: string;
}

// Sanitize text for PDF - escape special characters
function sanitizeForPDF(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');
}

// Calculate approximate text width
function getTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.5;
}

// Center text X position in content area
function centerTextX(text: string, fontSize: number, areaStart: number, areaWidth: number): number {
  const textWidth = getTextWidth(text, fontSize);
  return areaStart + (areaWidth - textWidth) / 2;
}

// Generate PDF with embedded background image and text overlay
async function generateCertificatePDFWithBackground(
  fullName: string,
  schoolName: string,
  province: string,
  country: string,
  cohortName: string,
  completionDate: string,
  backgroundImageUrl?: string
): Promise<string> {
  // A4 Landscape: 842 x 595 points
  const pageWidth = 842;
  const pageHeight = 595;
  
  // Content area calculations - text goes in the white section (right side)
  // The background has a sidebar on the left (~200 points wide)
  const contentStartX = 220;
  const contentWidth = pageWidth - contentStartX - 50;
  
  // Sanitize all text inputs
  const name = sanitizeForPDF(fullName);
  const school = sanitizeForPDF(schoolName);
  const prov = sanitizeForPDF(province);
  const ctry = sanitizeForPDF(country);
  const cohort = sanitizeForPDF(cohortName);
  const date = sanitizeForPDF(completionDate);

  // Calculate centered positions for text in white section
  const titleX = centerTextX("Certificate", 44, contentStartX, contentWidth);
  const subtitleX = centerTextX("of Completion", 20, contentStartX, contentWidth);
  const awardTextX = centerTextX("This certificate is awarded to:", 13, contentStartX, contentWidth);
  const nameX = centerTextX(name, 30, contentStartX, contentWidth);
  const schoolText = `from ${school}`;
  const schoolX = centerTextX(schoolText, 12, contentStartX, contentWidth);
  const locationText = `${prov}, ${ctry}`;
  const locationX = centerTextX(locationText, 11, contentStartX, contentWidth);
  const cohortX = centerTextX(cohort, 13, contentStartX, contentWidth);
  
  const desc1 = "Has successfully completed the edLEAD Leadership Programme,";
  const desc2 = "demonstrating exceptional leadership qualities, commitment to";
  const desc3 = "academic excellence, and dedication to creating positive";
  const desc4 = "change in their school community.";
  const desc1X = centerTextX(desc1, 11, contentStartX, contentWidth);
  const desc2X = centerTextX(desc2, 11, contentStartX, contentWidth);
  const desc3X = centerTextX(desc3, 11, contentStartX, contentWidth);
  const desc4X = centerTextX(desc4, 11, contentStartX, contentWidth);

  // Try to fetch and embed background image
  let imageObject = "";
  let imageRef = "";
  let hasBackgroundImage = false;
  
  const bgUrl = backgroundImageUrl || "https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/certificate-backgrounds/default-background.jpg";
  
  try {
    console.log("Fetching background image from:", bgUrl);
    const imageResponse = await fetch(bgUrl);
    if (imageResponse.ok) {
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBytes = new Uint8Array(imageBuffer);
      const imageBase64 = btoa(String.fromCharCode(...imageBytes));
      
      // Determine image type
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      const isJpeg = contentType.includes("jpeg") || contentType.includes("jpg");
      
      if (isJpeg) {
        hasBackgroundImage = true;
        imageObject = `9 0 obj
<< /Type /XObject /Subtype /Image /Width ${pageWidth} /Height ${pageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>
stream
`;
        imageRef = "/Im0 9 0 R";
        console.log("Background image loaded successfully, size:", imageBytes.length);
      }
    }
  } catch (e) {
    console.log("Could not load background image, using text-only design:", e);
  }

  // Build content stream - text overlay positioned in white section
  const textStream = `
BT
% Main title - "Certificate" in script style
/F3 44 Tf
0.35 0.35 0.35 rg
${titleX} 485 Td
(Certificate) Tj
ET

BT
% Subtitle - "of Completion"
/F1 20 Tf
0.93 0.46 0.13 rg
${subtitleX} 445 Td
(of Completion) Tj
ET

BT
% Award text
/F1 13 Tf
0.5 0.5 0.5 rg
${awardTextX} 390 Td
(This certificate is awarded to:) Tj
ET

BT
% Recipient name in script font
/F3 30 Tf
0.35 0.35 0.35 rg
${nameX} 345 Td
(${name}) Tj
ET

BT
% School info
/F1 12 Tf
0.5 0.5 0.5 rg
${schoolX} 310 Td
(${schoolText}) Tj
ET

BT
% Location
/F1 11 Tf
0.6 0.6 0.6 rg
${locationX} 290 Td
(${locationText}) Tj
ET

BT
% Cohort
/F2 13 Tf
0.35 0.35 0.35 rg
${cohortX} 250 Td
(${cohort}) Tj
ET

BT
% Description line 1
/F1 11 Tf
0.5 0.5 0.5 rg
${desc1X} 218 Td
(${desc1}) Tj
ET

BT
% Description line 2
/F1 11 Tf
0.5 0.5 0.5 rg
${desc2X} 202 Td
(${desc2}) Tj
ET

BT
% Description line 3
/F1 11 Tf
0.5 0.5 0.5 rg
${desc3X} 186 Td
(${desc3}) Tj
ET

BT
% Description line 4
/F1 11 Tf
0.5 0.5 0.5 rg
${desc4X} 170 Td
(${desc4}) Tj
ET

q
% Date signature line
0.45 0.45 0.45 RG
1 w
320 95 m 440 95 l S
Q

BT
% Date value
/F2 11 Tf
0.93 0.46 0.13 rg
345 108 Td
(${date}) Tj
ET

BT
% Date label
/F1 9 Tf
0.6 0.6 0.6 rg
365 78 Td
(DATE) Tj
ET

q
% Signature line
0.45 0.45 0.45 RG
1 w
580 95 m 720 95 l S
Q

BT
% Signature placeholder (script style)
/F3 13 Tf
0.45 0.45 0.45 rg
615 108 Td
(Director) Tj
ET

BT
% Signature label
/F1 9 Tf
0.6 0.6 0.6 rg
620 78 Td
(SIGNATURE) Tj
ET
`;

  // Calculate stream length
  const streamBytes = new TextEncoder().encode(textStream);
  const streamLength = streamBytes.length;

  // Build PDF structure (without embedded image for now - using simpler approach)
  const pdf = `%PDF-1.4
%\\xE2\\xE3\\xCF\\xD3
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 ${pageWidth} ${pageHeight}]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 5 0 R
      /F2 6 0 R
      /F3 7 0 R
      /F4 8 0 R
    >>
    /ProcSet [/PDF /Text /ImageC]
  >>
>>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${textStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>
endobj
6 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>
endobj
7 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Times-BoldItalic /Encoding /WinAnsiEncoding >>
endobj
8 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>
endobj
xref
0 9
0000000000 65535 f 
0000000017 00000 n 
0000000066 00000 n 
0000000123 00000 n 
0000000360 00000 n 
0000003800 00000 n 
0000003900 00000 n 
0000004010 00000 n 
0000004125 00000 n 
trailer
<< /Size 9 /Root 1 0 R >>
startxref
4240
%%EOF`;

  // Convert to base64
  const encoder = new TextEncoder();
  const pdfBytes = encoder.encode(pdf);
  return btoa(String.fromCharCode(...pdfBytes));
}

const handler = async (req: Request): Promise<Response> => {
  console.log("generate-certificate-preview function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, schoolName, province, country, cohortName, completionDate, backgroundImageUrl }: PreviewRequest = await req.json();

    console.log("Generating preview for:", { fullName, schoolName, cohortName, completionDate, backgroundImageUrl });

    const pdfBase64 = await generateCertificatePDFWithBackground(
      fullName || "John Doe",
      schoolName || "Sample High School",
      province || "Gauteng",
      country || "South Africa",
      cohortName || "Cohort 2026-1",
      completionDate || "January 22, 2026",
      backgroundImageUrl
    );

    return new Response(
      JSON.stringify({ pdf: pdfBase64 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating preview:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
