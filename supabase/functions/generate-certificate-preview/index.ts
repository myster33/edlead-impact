import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
}

// Sanitize text for PDF - escape special characters
function sanitizeForPDF(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '');
}

// Generate a professionally styled PDF certificate matching edLEAD design
function generatePolishedPDF(
  fullName: string,
  schoolName: string,
  province: string,
  country: string,
  cohortName: string,
  completionDate: string
): string {
  // A4 Landscape: 842 x 595 points
  const pageWidth = 842;
  const pageHeight = 595;
  
  // Sanitize all text inputs
  const name = sanitizeForPDF(fullName);
  const school = sanitizeForPDF(schoolName);
  const prov = sanitizeForPDF(province);
  const ctry = sanitizeForPDF(country);
  const cohort = sanitizeForPDF(cohortName);
  const date = sanitizeForPDF(completionDate);

  // Calculate center positions for main content area (right side, after sidebar)
  const contentStartX = 220;
  const contentWidth = pageWidth - contentStartX - 40;
  const contentCenterX = contentStartX + contentWidth / 2;
  
  // Center name within content area
  const nameWidth = name.length * 14;
  const nameX = Math.max(contentStartX + 50, contentCenterX - nameWidth / 2);
  const underlineStart = nameX - 30;
  const underlineEnd = nameX + nameWidth + 30;

  // Content stream with edLEAD certificate design
  const stream = `
q
% White background
1 1 1 rg
0 0 ${pageWidth} ${pageHeight} re f
Q

q
% Left sidebar - dark gray background
0.35 0.35 0.35 rg
0 0 180 ${pageHeight} re f
Q

q
% Diagonal stripe pattern on main area (subtle gray lines)
0.92 0.92 0.92 RG
0.5 w
200 595 m 842 0 l S
240 595 m 842 40 l S
280 595 m 842 80 l S
320 595 m 842 120 l S
360 595 m 842 160 l S
400 595 m 842 200 l S
440 595 m 842 240 l S
480 595 m 842 280 l S
520 595 m 842 320 l S
560 595 m 842 360 l S
600 595 m 842 400 l S
640 595 m 842 440 l S
680 595 m 842 480 l S
720 595 m 842 520 l S
760 595 m 842 560 l S
Q

q
% Orange starburst seal (top right) - simplified as filled circle with spikes
0.93 0.46 0.13 rg
760 530 m
780 545 l 775 520 l 800 530 l 785 510 l 805 500 l 780 495 l 790 475 l 765 485 l 760 460 l 755 485 l 730 475 l 740 495 l 715 500 l 735 510 l 720 530 l 745 520 l 740 545 l 760 530 l
f
Q

q
% Bottom left geometric design - white chevron outline
1 1 1 RG
3 w
20 180 m 80 120 l 20 60 l S
Q

q
% Bottom left geometric design - orange filled chevron
0.93 0.46 0.13 rg
50 200 m 130 120 l 50 40 l 80 120 l 50 200 l f
Q

q
% Bottom left geometric design - gray chevron
0.55 0.55 0.55 rg
85 220 m 165 140 l 85 60 l 115 140 l 85 220 l f
Q

BT
% edLEAD logo text on sidebar
/F2 24 Tf
1 1 1 rg
25 520 Td
(edLEAD) Tj
ET

BT
% Tagline on sidebar
/F4 9 Tf
0.93 0.46 0.13 rg
25 495 Td
(Transforming Student Leaders) Tj
ET

BT
% Main title - "Certificate" in script style
/F3 48 Tf
0.45 0.45 0.45 rg
380 500 Td
(Certificate) Tj
ET

BT
% Subtitle - "of Completion"
/F1 20 Tf
0.93 0.46 0.13 rg
420 460 Td
(of Completion) Tj
ET

BT
% Award text
/F1 14 Tf
0.5 0.5 0.5 rg
400 395 Td
(this certificate is awarded to:) Tj
ET

BT
% Recipient name in script font
/F3 32 Tf
0.45 0.45 0.45 rg
${nameX} 340 Td
(${name}) Tj
ET

q
% Underline for name
0.5 0.5 0.5 RG
1 w
${underlineStart} 330 m
${underlineEnd} 330 l S
Q

BT
% School and location info
/F1 12 Tf
0.5 0.5 0.5 rg
${contentCenterX - 80} 305 Td
(from ${school}) Tj
ET

BT
% Location
/F1 11 Tf
0.6 0.6 0.6 rg
${contentCenterX - 50} 285 Td
(${prov}, ${ctry}) Tj
ET

BT
% Cohort section header
/F2 13 Tf
0.35 0.35 0.35 rg
420 235 Td
(${cohort}) Tj
ET

BT
% Description line 1
/F1 11 Tf
0.5 0.5 0.5 rg
300 205 Td
(Has successfully completed the edLEAD Leadership Programme, demonstrating) Tj
ET

BT
% Description line 2
/F1 11 Tf
0.5 0.5 0.5 rg
300 188 Td
(exceptional leadership qualities, commitment to academic excellence, and) Tj
ET

BT
% Description line 3
/F1 11 Tf
0.5 0.5 0.5 rg
320 171 Td
(dedication to creating positive change in their school community.) Tj
ET

q
% Date signature line
0.45 0.45 0.45 RG
1 w
280 85 m 400 85 l S
Q

BT
% Date value
/F2 11 Tf
0.93 0.46 0.13 rg
305 95 Td
(${date}) Tj
ET

BT
% Date label
/F1 9 Tf
0.6 0.6 0.6 rg
325 70 Td
(DATE) Tj
ET

q
% Signature line
0.45 0.45 0.45 RG
1 w
580 85 m 720 85 l S
Q

BT
% Signature placeholder
/F3 14 Tf
0.45 0.45 0.45 rg
610 95 Td
(Director) Tj
ET

BT
% Signature label
/F1 9 Tf
0.6 0.6 0.6 rg
620 70 Td
(SIGNATURE) Tj
ET
`;

  // Calculate stream length
  const streamBytes = new TextEncoder().encode(stream);
  const streamLength = streamBytes.length;

  // Build PDF structure with 4 fonts
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
    /ProcSet [/PDF /Text]
  >>
>>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${stream}
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
    const { fullName, schoolName, province, country, cohortName, completionDate }: PreviewRequest = await req.json();

    console.log("Generating preview for:", { fullName, schoolName, cohortName, completionDate });

    const pdfBase64 = generatePolishedPDF(
      fullName || "John Doe",
      schoolName || "Sample High School",
      province || "Gauteng",
      country || "South Africa",
      cohortName || "Cohort 2026-1",
      completionDate || "January 22, 2026"
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
