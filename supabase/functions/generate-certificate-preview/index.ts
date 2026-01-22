import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to encode large Uint8Array to base64 without stack overflow
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32KB chunks
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

// Generate QR code image bytes using QR code API
async function generateQRCode(url: string): Promise<Uint8Array | null> {
  try {
    // Use QR Server API to generate QR code as PNG
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&format=png`;
    const response = await fetch(qrApiUrl);
    
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
    console.log("Failed to generate QR code:", response.status);
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
  // Create a new PDF document - A4 Landscape
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 Landscape in points
  
  const { width, height } = page.getSize();
  
  // Try to embed background image
  const bgUrl = backgroundImageUrl || "https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/certificate-backgrounds/default-background.jpg";
  
  try {
    console.log("Fetching background image from:", bgUrl);
    const imageResponse = await fetch(bgUrl);
    
    if (imageResponse.ok) {
      const imageBytes = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      
      let image;
      if (contentType.includes("png")) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }
      
      // Draw the background image to fill the entire page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: height,
      });
      console.log("Background image embedded successfully");
    } else {
      console.log("Failed to fetch background image:", imageResponse.status);
    }
  } catch (e) {
    console.log("Could not embed background image:", e);
  }
  
  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
  
  // Content area - text goes in the white section (right side)
  // The background has a sidebar on the left (~200 points wide)
  const contentStartX = 240;
  const contentWidth = width - contentStartX - 50;
  
  // Helper to center text
  const centerX = (text: string, font: any, fontSize: number) => {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    return contentStartX + (contentWidth - textWidth) / 2;
  };
  
  // Colors
  const darkGray = rgb(0.35, 0.35, 0.35);
  const mediumGray = rgb(0.5, 0.5, 0.5);
  const lightGray = rgb(0.6, 0.6, 0.6);
  const orange = rgb(0.93, 0.46, 0.13);
  
  // Draw "Certificate" title
  const titleText = "Certificate";
  page.drawText(titleText, {
    x: centerX(titleText, timesItalic, 44),
    y: 485,
    size: 44,
    font: timesItalic,
    color: darkGray,
  });
  
  // Draw "of Completion" subtitle
  const subtitleText = "of Completion";
  page.drawText(subtitleText, {
    x: centerX(subtitleText, helvetica, 20),
    y: 445,
    size: 20,
    font: helvetica,
    color: orange,
  });
  
  // Draw "This certificate is awarded to:"
  const awardText = "This certificate is awarded to:";
  page.drawText(awardText, {
    x: centerX(awardText, helvetica, 13),
    y: 390,
    size: 13,
    font: helvetica,
    color: mediumGray,
  });
  
  // Draw recipient name
  page.drawText(fullName, {
    x: centerX(fullName, timesItalic, 30),
    y: 345,
    size: 30,
    font: timesItalic,
    color: darkGray,
  });
  
  // Draw school info
  const schoolText = `from ${schoolName}`;
  page.drawText(schoolText, {
    x: centerX(schoolText, helvetica, 12),
    y: 310,
    size: 12,
    font: helvetica,
    color: mediumGray,
  });
  
  // Draw location
  const locationText = `${province}, ${country}`;
  page.drawText(locationText, {
    x: centerX(locationText, helvetica, 11),
    y: 290,
    size: 11,
    font: helvetica,
    color: lightGray,
  });
  
  // Draw cohort
  page.drawText(cohortName, {
    x: centerX(cohortName, helveticaBold, 13),
    y: 250,
    size: 13,
    font: helveticaBold,
    color: darkGray,
  });
  
  // Draw description lines
  const descLines = [
    "Has successfully completed the edLEAD Leadership Programme,",
    "demonstrating exceptional leadership qualities, commitment to",
    "academic excellence, and dedication to creating positive",
    "change in their school community."
  ];
  
  let descY = 218;
  for (const line of descLines) {
    page.drawText(line, {
      x: centerX(line, helvetica, 11),
      y: descY,
      size: 11,
      font: helvetica,
      color: mediumGray,
    });
    descY -= 16;
  }
  
  // Draw date line
  page.drawLine({
    start: { x: 320, y: 95 },
    end: { x: 440, y: 95 },
    thickness: 1,
    color: rgb(0.45, 0.45, 0.45),
  });
  
  // Draw date value
  const dateX = 320 + (120 - helveticaBold.widthOfTextAtSize(completionDate, 11)) / 2;
  page.drawText(completionDate, {
    x: dateX,
    y: 108,
    size: 11,
    font: helveticaBold,
    color: orange,
  });
  
  // Draw "DATE" label
  page.drawText("DATE", {
    x: 365,
    y: 78,
    size: 9,
    font: helvetica,
    color: lightGray,
  });
  
  // Draw signature line
  page.drawLine({
    start: { x: 580, y: 95 },
    end: { x: 720, y: 95 },
    thickness: 1,
    color: rgb(0.45, 0.45, 0.45),
  });
  
  // Draw "Director" signature
  page.drawText("Director", {
    x: 615,
    y: 108,
    size: 13,
    font: timesItalic,
    color: rgb(0.45, 0.45, 0.45),
  });
  
  // Draw "SIGNATURE" label
  page.drawText("SIGNATURE", {
    x: 620,
    y: 78,
    size: 9,
    font: helvetica,
    color: lightGray,
  });
  
  // Add QR code to the bottom left of the content area
  try {
    const qrBytes = await generateQRCode("https://www.edlead.co.za");
    if (qrBytes) {
      const qrImage = await pdfDoc.embedPng(qrBytes);
      const qrSize = 60;
      page.drawImage(qrImage, {
        x: contentStartX + 10,
        y: 30,
        width: qrSize,
        height: qrSize,
      });
      
      // Add small text below QR code
      page.drawText("www.edlead.co.za", {
        x: contentStartX + 5,
        y: 18,
        size: 7,
        font: helvetica,
        color: lightGray,
      });
      console.log("QR code embedded successfully");
    }
  } catch (e) {
    console.log("Could not embed QR code:", e);
  }
  
  // Add reference number if provided (bottom right of content area)
  if (referenceNumber) {
    const refText = `Ref: ${referenceNumber}`;
    page.drawText(refText, {
      x: width - 100,
      y: 25,
      size: 8,
      font: helvetica,
      color: lightGray,
    });
  }
  
  // Serialize the PDF
  return await pdfDoc.save();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("generate-certificate-preview function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, schoolName, province, country, cohortName, completionDate, backgroundImageUrl, referenceNumber }: PreviewRequest = await req.json();

    console.log("Generating preview for:", { fullName, schoolName, cohortName, completionDate, backgroundImageUrl, referenceNumber });

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

    // Convert to base64 using chunked encoding for large arrays
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
