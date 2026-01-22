import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

interface CertificateRequest {
  recipientIds: string[];
  templateId: string;
  cohortId: string;
  completionDate: string;
}

// Send email using Resend API directly
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  pdfContent: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "edLEAD <noreply@edlead.co.za>",
        to: [to],
        subject,
        html,
        attachments: [
          {
            filename: `edLEAD_Certificate_${recipientName.replace(/\s+/g, '_')}.pdf`,
            content: pdfContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
      return { success: false, error: errorData.message || "Failed to send email" };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
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

// Generate PDF with embedded background image, text overlay, and QR code
async function generateCertificatePDF(
  fullName: string,
  schoolName: string,
  province: string,
  country: string,
  cohortName: string,
  completionDate: string,
  backgroundImageUrl?: string,
  referenceNumber?: string
): Promise<string> {
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
  
  // Serialize the PDF and convert to base64 using chunked encoding
  const pdfBytes = await pdfDoc.save();
  return uint8ArrayToBase64(pdfBytes);
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-certificate function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipientIds, templateId, cohortId, completionDate }: CertificateRequest = await req.json();

    console.log("Processing certificate request:", { recipientIds, templateId, cohortId, completionDate });

    if (!recipientIds || recipientIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the template
    const { data: template, error: templateError } = await supabase
      .from("certificate_templates")
      .select("*")
      .eq("id", templateId)
      .maybeSingle();

    if (templateError || !template) {
      console.error("Template error:", templateError);
      return new Response(
        JSON.stringify({ error: "Template not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the cohort
    const { data: cohort, error: cohortError } = await supabase
      .from("cohorts")
      .select("*")
      .eq("id", cohortId)
      .maybeSingle();

    if (cohortError || !cohort) {
      console.error("Cohort error:", cohortError);
      return new Response(
        JSON.stringify({ error: "Cohort not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the recipients (certificate_recipients with application data)
    const { data: recipients, error: recipientsError } = await supabase
      .from("certificate_recipients")
      .select(`
        id,
        application_id,
        tracking_id,
        applications:application_id (
          id,
          full_name,
          student_email,
          school_name,
          province,
          country,
          grade,
          project_idea,
          reference_number
        )
      `)
      .in("id", recipientIds);

    if (recipientsError || !recipients || recipients.length === 0) {
      console.error("Recipients error:", recipientsError);
      return new Response(
        JSON.stringify({ error: "No recipients found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${recipients.length} certificates`);

    // Get background image URL from template design settings if available
    const designSettings = template.design_settings as any;
    const backgroundImageUrl = designSettings?.backgroundImageUrl;

    // Format the cohort end date for display
    const cohortEndDate = formatDate(cohort.end_date);

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const recipient of recipients) {
      try {
        const app = recipient.applications as any;
        if (!app || !app.student_email) {
          console.log(`Skipping recipient ${recipient.id} - no application data`);
          results.failed.push(recipient.id);
          continue;
        }

        // Generate PDF certificate with background image and QR code
        const pdfBase64 = await generateCertificatePDF(
          app.full_name,
          app.school_name,
          app.province,
          app.country,
          cohort.name,
          completionDate,
          backgroundImageUrl,
          app.reference_number
        );

        // Build email HTML with fixed logo and additional details
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background-color: #4A4A4A; padding: 30px 40px; text-align: center;">
        <img src="https://edlead.lovable.app/images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto;">
      </td>
    </tr>
    <tr>
      <td style="padding: 40px;">
        <h1 style="color: #2d3748; font-size: 24px; margin: 0 0 20px 0; font-weight: 600;">
          Congratulations, ${app.full_name}!
        </h1>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          We are thrilled to inform you that you have successfully completed the <strong>edLEAD Leadership Programme</strong>!
        </p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Your dedication, leadership, and commitment to making a positive impact in your school community have not gone unnoticed. We are proud of your achievements and the growth you've demonstrated throughout this programme.
        </p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Please find your <strong>Certificate of Accomplishment</strong> attached to this email. This certificate recognizes your outstanding participation in <strong>${cohort.name}</strong>.
        </p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 15px 0;">Programme Details:</h3>
          <table style="width: 100%; font-size: 14px; color: #4a5568;">
            <tr>
              <td style="padding: 5px 0;"><strong>Name:</strong></td>
              <td style="padding: 5px 0;">${app.full_name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>School:</strong></td>
              <td style="padding: 5px 0;">${app.school_name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Cohort:</strong></td>
              <td style="padding: 5px 0;">${cohort.name}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Completion Date:</strong></td>
              <td style="padding: 5px 0;">${cohortEndDate}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Application Reference:</strong></td>
              <td style="padding: 5px 0;">${app.reference_number || 'N/A'}</td>
            </tr>
          </table>
        </div>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          We encourage you to continue your leadership journey and apply the skills you've learned to create lasting change in your community.
        </p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0;">
          Congratulations once again!
        </p>
        <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
          Warm regards,<br>
          <strong>The edLEAD Team</strong>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #4A4A4A; padding: 25px 40px; text-align: center;">
        <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0;">
          Transforming Student Leaders
        </p>
        <p style="color: #a0a0a0; font-size: 12px; margin: 0;">
          &copy; ${new Date().getFullYear()} edLEAD. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

        // Send email
        const emailResult = await sendEmail(
          app.student_email,
          `Congratulations! Your edLEAD Certificate of Accomplishment`,
          emailHtml,
          pdfBase64,
          app.full_name
        );

        if (emailResult.success) {
          // Update recipient record
          await supabase
            .from("certificate_recipients")
            .update({
              issued_at: new Date().toISOString(),
              email_sent: true,
              email_sent_at: new Date().toISOString(),
            })
            .eq("id", recipient.id);

          results.success.push(recipient.id);
          console.log(`Certificate sent successfully to ${app.student_email}`);
        } else {
          results.failed.push(recipient.id);
          console.error(`Failed to send certificate to ${app.student_email}:`, emailResult.error);
        }
      } catch (recipientError: any) {
        console.error(`Error processing recipient ${recipient.id}:`, recipientError);
        results.failed.push(recipient.id);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${recipients.length} certificates`,
        success: results.success,
        failed: results.failed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-certificate:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
