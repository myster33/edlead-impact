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
  backgroundImageBase64?: string;
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

// Generate PDF matching the edLEAD certificate design
function generateCertificatePDF(
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
  const sidebarWidth = 200;
  
  // Sanitize all text inputs
  const name = sanitizeForPDF(fullName);
  const school = sanitizeForPDF(schoolName);
  const prov = sanitizeForPDF(province);
  const ctry = sanitizeForPDF(country);
  const cohort = sanitizeForPDF(cohortName);
  const date = sanitizeForPDF(completionDate);

  // Content area calculations (right side after sidebar)
  const contentStartX = sidebarWidth + 20;
  const contentWidth = pageWidth - contentStartX - 40;
  const contentCenterX = contentStartX + contentWidth / 2;

  // Calculate centered positions
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

  // Build content stream with design matching the uploaded PDF
  const stream = `
q
% White background
1 1 1 rg
0 0 ${pageWidth} ${pageHeight} re f
Q

q
% Left sidebar - dark gray background (matching design)
0.35 0.35 0.35 rg
0 0 ${sidebarWidth} ${pageHeight} re f
Q

q
% Diagonal stripe pattern on main area (subtle gray lines)
0.93 0.93 0.93 RG
0.5 w
${sidebarWidth} 595 m 842 0 l S
${sidebarWidth + 40} 595 m 842 40 l S
${sidebarWidth + 80} 595 m 842 80 l S
${sidebarWidth + 120} 595 m 842 120 l S
${sidebarWidth + 160} 595 m 842 160 l S
${sidebarWidth + 200} 595 m 842 200 l S
${sidebarWidth + 240} 595 m 842 240 l S
${sidebarWidth + 280} 595 m 842 280 l S
${sidebarWidth + 320} 595 m 842 320 l S
${sidebarWidth + 360} 595 m 842 360 l S
${sidebarWidth + 400} 595 m 842 400 l S
${sidebarWidth + 440} 595 m 842 440 l S
${sidebarWidth + 480} 595 m 842 480 l S
${sidebarWidth + 520} 595 m 842 520 l S
${sidebarWidth + 560} 595 m 842 560 l S
Q

q
% Bottom left geometric design - outermost white chevron outline
1 1 1 RG
4 w
10 200 m 90 120 l 10 40 l S
Q

q
% Orange filled chevron (larger)
0.93 0.46 0.13 rg
35 230 m 140 120 l 35 10 l 75 120 l 35 230 l f
Q

q
% Gray chevron (medium)
0.55 0.55 0.55 rg
70 260 m 175 145 l 70 30 l 110 145 l 70 260 l f
Q

q
% Small white chevron on top
1 1 1 rg
95 235 m 170 160 l 95 85 l 125 160 l 95 235 l f
Q

BT
% edLEAD icon area (simplified E icon)
/F2 48 Tf
0.93 0.46 0.13 rg
65 520 Td
(E) Tj
ET

BT
% edLEAD logo text on sidebar
/F2 28 Tf
1 1 1 rg
40 470 Td
(edLEAD) Tj
ET

BT
% Tagline on sidebar
/F4 10 Tf
0.93 0.46 0.13 rg
25 445 Td
(Transforming Student Leaders) Tj
ET

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
  const streamBytes = new TextEncoder().encode(stream);
  const streamLength = streamBytes.length;

  // Build PDF structure
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

    const pdfBase64 = generateCertificatePDF(
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
