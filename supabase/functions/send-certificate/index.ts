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

// Generate a professionally styled PDF certificate
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

  // Calculate center positions
  const nameX = Math.max(100, (pageWidth - name.length * 12) / 2);
  const schoolX = Math.max(100, (pageWidth - ("from " + school).length * 7) / 2);
  const locationX = Math.max(100, (pageWidth - (prov + ", " + ctry).length * 6) / 2);
  const cohortX = Math.max(100, (pageWidth - cohort.length * 6) / 2);
  const dateX = Math.max(100, (pageWidth - ("Issued on " + date).length * 5) / 2);
  const underlineStart = Math.max(100, nameX - 20);
  const underlineEnd = Math.min(742, nameX + name.length * 12 + 20);

  // Content stream with proper certificate layout
  const stream = `
q
% Background border - outer orange frame
0.93 0.46 0.13 RG
4 w
30 30 782 535 re S

% Inner border - dark gray
0.29 0.29 0.29 RG
2 w
45 45 752 505 re S

% Decorative corner elements
0.93 0.46 0.13 rg
30 30 20 20 re f
792 30 20 20 re f
30 545 20 20 re f
792 545 20 20 re f

% Horizontal decorative line top
0.93 0.46 0.13 RG
2 w
100 480 m 742 480 l S

% Horizontal decorative line bottom
1 w
150 100 m 692 100 l S
Q

BT
% Header text
/F2 12 Tf
0.5 0.5 0.5 rg
321 520 Td
(EDLEAD LEADERSHIP PROGRAMME) Tj
ET

BT
% Main title
/F3 36 Tf
0.2 0.2 0.2 rg
185 430 Td
(Certificate of Accomplishment) Tj
ET

BT
% Subtitle
/F1 14 Tf
0.5 0.5 0.5 rg
350 385 Td
(This is to certify that) Tj
ET

BT
% Recipient name - centered
/F3 28 Tf
0.93 0.46 0.13 rg
${nameX} 340 Td
(${name}) Tj
ET

q
% Underline for name
0.93 0.46 0.13 RG
1 w
${underlineStart} 335 m
${underlineEnd} 335 l S
Q

BT
% School info
/F1 13 Tf
0.3 0.3 0.3 rg
${schoolX} 295 Td
(from ${school}) Tj
ET

BT
% Location
/F1 11 Tf
0.5 0.5 0.5 rg
${locationX} 275 Td
(${prov}, ${ctry}) Tj
ET

BT
% Description line 1
/F1 12 Tf
0.3 0.3 0.3 rg
175 235 Td
(has successfully completed the edLEAD Leadership Programme,) Tj
ET

BT
% Description line 2
/F1 12 Tf
0.3 0.3 0.3 rg
180 215 Td
(demonstrating exceptional leadership qualities and commitment) Tj
ET

BT
% Description line 3
/F1 12 Tf
0.3 0.3 0.3 rg
205 195 Td
(to creating positive change in their school community.) Tj
ET

BT
% Cohort
/F2 11 Tf
0.93 0.46 0.13 rg
${cohortX} 155 Td
(${cohort}) Tj
ET

BT
% Date
/F1 10 Tf
0.5 0.5 0.5 rg
${dateX} 135 Td
(Issued on ${date}) Tj
ET

q
% Signature lines
0.4 0.4 0.4 RG
0.5 w
170 70 m 310 70 l S
532 70 m 672 70 l S
Q

BT
% Signature titles
/F1 9 Tf
0.5 0.5 0.5 rg
195 55 Td
(Programme Director) Tj
ET

BT
/F1 9 Tf
0.5 0.5 0.5 rg
550 55 Td
(Academic Coordinator) Tj
ET

q
% Certificate seal - circles
0.93 0.46 0.13 RG
2 w
421 75 m
456 75 456 110 421 110 c
386 110 386 75 421 75 c
h S
1 w
421 75 m
449 75 449 103 421 103 c
393 103 393 75 421 75 c
h S
Q

BT
% Seal text
/F2 7 Tf
0.93 0.46 0.13 rg
400 87 Td
(CERTIFIED) Tj
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
xref
0 8
0000000000 65535 f 
0000000017 00000 n 
0000000066 00000 n 
0000000123 00000 n 
0000000340 00000 n 
0000002800 00000 n 
0000002900 00000 n 
0000003010 00000 n 
trailer
<< /Size 8 /Root 1 0 R >>
startxref
3120
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

        // Generate polished PDF certificate
        const pdfBase64 = generatePolishedPDF(
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
