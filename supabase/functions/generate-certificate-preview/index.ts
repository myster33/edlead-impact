import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/fontkit@2.0.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

interface PreviewRequest {
  fullName: string;
  schoolName: string;
  province: string;
  country: string;
  cohortName: string;
  completionDate: string;
  backgroundImageUrl?: string;
  referenceNumber?: string;
}

// Font URLs from Google Fonts static CDN
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://klxrjohcpaxviltzpxam.supabase.co";
const FONT_URLS = {
  regular: `${SUPABASE_URL}/storage/v1/object/public/certificate-backgrounds/fonts/cormorant-garamond-regular.ttf`,
  bold: `${SUPABASE_URL}/storage/v1/object/public/certificate-backgrounds/fonts/cormorant-garamond-bold.ttf`,
  boldItalic: `${SUPABASE_URL}/storage/v1/object/public/certificate-backgrounds/fonts/cormorant-garamond-bold-italic.ttf`,
};

async function fetchFont(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch font from ${url}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function generateQRCode(url: string): Promise<Uint8Array | null> {
  try {
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&format=png`;
    const response = await fetch(qrApiUrl);
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
    return null;
  } catch (e) {
    console.log("Error generating QR code:", e);
    return null;
  }
}

async function generateCertificatePDF(
  fullName: string,
  schoolName: string,
  province: string,
  country: string,
  cohortName: string,
  completionDate: string,
  backgroundImageUrl?: string,
  referenceNumber?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  // Fetch all font variants in parallel
  const [regularBytes, boldBytes, boldItalicBytes] = await Promise.all([
    fetchFont(FONT_URLS.regular),
    fetchFont(FONT_URLS.bold),
    fetchFont(FONT_URLS.boldItalic),
  ]);

  const fontRegular = await pdfDoc.embedFont(regularBytes);
  const fontBold = await pdfDoc.embedFont(boldBytes);
  const fontBoldItalic = await pdfDoc.embedFont(boldItalicBytes);

  const page = pdfDoc.addPage([842, 595]); // A4 Landscape
  const { width, height } = page.getSize();

  // Background image
  const bgUrl = backgroundImageUrl || "https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/certificate-backgrounds/default-background.jpg";
  try {
    const imageResponse = await fetch(bgUrl);
    if (imageResponse.ok) {
      const imageBytes = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      const image = contentType.includes("png")
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }
  } catch (e) {
    console.log("Could not embed background image:", e);
  }

  // Content area
  const contentStartX = 240;
  const contentWidth = width - contentStartX - 50;

  const centerX = (text: string, font: any, fontSize: number) => {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    return contentStartX + (contentWidth - textWidth) / 2;
  };

  const darkGray = rgb(0.35, 0.35, 0.35);
  const mediumGray = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const orange = rgb(0.93, 0.46, 0.13);

  // "Certificate" title
  const titleText = "Certificate";
  page.drawText(titleText, {
    x: centerX(titleText, fontBoldItalic, 46),
    y: 485,
    size: 46,
    font: fontBoldItalic,
    color: darkGray,
  });

  // "of Completion" subtitle
  const subtitleText = "of Completion";
  page.drawText(subtitleText, {
    x: centerX(subtitleText, fontRegular, 20),
    y: 445,
    size: 20,
    font: fontRegular,
    color: orange,
  });

  // "This certificate is awarded to:"
  const awardText = "This certificate is awarded to:";
  page.drawText(awardText, {
    x: centerX(awardText, fontRegular, 13),
    y: 390,
    size: 13,
    font: fontRegular,
    color: mediumGray,
  });

  // Recipient name
  page.drawText(fullName, {
    x: centerX(fullName, fontBoldItalic, 32),
    y: 345,
    size: 32,
    font: fontBoldItalic,
    color: darkGray,
  });

  // School info
  const schoolText = `from ${schoolName}`;
  page.drawText(schoolText, {
    x: centerX(schoolText, fontRegular, 12),
    y: 310,
    size: 12,
    font: fontRegular,
    color: mediumGray,
  });

  // Location
  const locationText = `${province}, ${country}`;
  page.drawText(locationText, {
    x: centerX(locationText, fontRegular, 11),
    y: 290,
    size: 11,
    font: fontRegular,
    color: lightGray,
  });

  // Cohort
  page.drawText(cohortName, {
    x: centerX(cohortName, fontBold, 13),
    y: 250,
    size: 13,
    font: fontBold,
    color: darkGray,
  });

  // Description
  const descLines = [
    "Has successfully completed the edLEAD Leadership Programme,",
    "demonstrating exceptional leadership qualities, commitment to",
    "academic excellence, and dedication to creating positive",
    "change in their school community."
  ];
  let descY = 218;
  for (const line of descLines) {
    page.drawText(line, {
      x: centerX(line, fontRegular, 11),
      y: descY,
      size: 11,
      font: fontRegular,
      color: mediumGray,
    });
    descY -= 16;
  }

  // Date line
  page.drawLine({
    start: { x: 320, y: 95 },
    end: { x: 440, y: 95 },
    thickness: 1,
    color: rgb(0.45, 0.45, 0.45),
  });

  const dateX = 320 + (120 - fontBold.widthOfTextAtSize(completionDate, 11)) / 2;
  page.drawText(completionDate, {
    x: dateX,
    y: 108,
    size: 11,
    font: fontBold,
    color: orange,
  });

  page.drawText("DATE", {
    x: 365,
    y: 78,
    size: 9,
    font: fontRegular,
    color: lightGray,
  });

  // Signature line
  page.drawLine({
    start: { x: 580, y: 95 },
    end: { x: 720, y: 95 },
    thickness: 1,
    color: rgb(0.45, 0.45, 0.45),
  });

  page.drawText("Director", {
    x: 615,
    y: 108,
    size: 14,
    font: fontBoldItalic,
    color: rgb(0.45, 0.45, 0.45),
  });

  page.drawText("SIGNATURE", {
    x: 620,
    y: 78,
    size: 9,
    font: fontRegular,
    color: lightGray,
  });

  // Reference number
  if (referenceNumber) {
    const refText = `Ref: ${referenceNumber}`;
    const refWidth = fontRegular.widthOfTextAtSize(refText, 8);
    page.drawText(refText, {
      x: width - refWidth - 25,
      y: height - 25,
      size: 8,
      font: fontRegular,
      color: lightGray,
    });
  }

  // QR code
  try {
    const qrBytes = await generateQRCode("https://edlead.co");
    if (qrBytes) {
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, { x: width - 80, y: 25, width: 55, height: 55 });
    }
  } catch (e) {
    console.log("Could not embed QR code:", e);
  }

  return await pdfDoc.save();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, schoolName, province, country, cohortName, completionDate, backgroundImageUrl, referenceNumber }: PreviewRequest = await req.json();

    const pdfBytes = await generateCertificatePDF(
      fullName || "John Doe",
      schoolName || "Sample High School",
      province || "Gauteng",
      country || "South Africa",
      cohortName || "Cohort 2026-1",
      completionDate || "January 22, 2026",
      backgroundImageUrl,
      referenceNumber || "ABC12345"
    );

    const pdfBase64 = uint8ArrayToBase64(pdfBytes);

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
