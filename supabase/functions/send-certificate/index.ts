import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Generate PDF with text positioned in the white section (right side of background)
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
          project_idea
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

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const recipient of recipients) {
      try {
        const app = recipient.applications as any;
        if (!app || !app.student_email) {
          console.log(`Skipping recipient ${recipient.id} - no application data`);
          results.failed.push(recipient.id);
          continue;
        }

        // Generate PDF certificate with text positioned in white section
        const pdfBase64 = generateCertificatePDF(
          app.full_name,
          app.school_name,
          app.province,
          app.country,
          cohort.name,
          completionDate
        );

        // Build email HTML
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
        <img src="https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/blog-images/edlead-logo-email-header.png" alt="edLEAD" style="max-width: 196px; height: auto;">
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
              <td style="padding: 5px 0;">${completionDate}</td>
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
      <td style="background-color: #f8f9fa; padding: 25px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="color: #718096; font-size: 12px; margin: 0;">
          © 2026 edLEAD Programme. All rights reserved.
        </p>
        <img src="${supabaseUrl}/functions/v1/track-certificate?tid=${recipient.tracking_id}&action=open" width="1" height="1" style="display:none;" alt="" />
      </td>
    </tr>
  </table>
</body>
</html>`;

        // Send email
        const emailResult = await sendEmail(
          app.student_email,
          `Your edLEAD Certificate of Accomplishment - ${cohort.name}`,
          emailHtml,
          pdfBase64,
          app.full_name
        );

        if (!emailResult.success) {
          console.error(`Failed to send email to ${app.student_email}:`, emailResult.error);
          results.failed.push(recipient.id);
          continue;
        }

        console.log(`Email sent successfully to ${app.student_email}`);

        // Update recipient record
        const { error: updateError } = await supabase
          .from("certificate_recipients")
          .update({
            issued_at: new Date().toISOString(),
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq("id", recipient.id);

        if (updateError) {
          console.error(`Error updating recipient ${recipient.id}:`, updateError);
        }

        results.success.push(recipient.id);
      } catch (error) {
        console.error(`Error processing recipient ${recipient.id}:`, error);
        results.failed.push(recipient.id);
      }
    }

    console.log("Certificate processing complete:", results);

    return new Response(
      JSON.stringify({
        message: `Successfully sent ${results.success.length} certificates`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-certificate function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
