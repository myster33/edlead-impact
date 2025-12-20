import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationData {
  // Section 1: Learner Information
  full_name: string;
  date_of_birth: string;
  gender?: string;
  grade: string;
  school_name: string;
  school_address: string;
  province: string;
  student_email: string;
  student_phone: string;
  
  // Section 2: Parent/Guardian Information
  parent_name: string;
  parent_relationship: string;
  parent_email: string;
  parent_phone: string;
  parent_consent: boolean;
  
  // Section 3: School Nomination Details
  nominating_teacher: string;
  teacher_position: string;
  school_email: string;
  school_contact: string;
  formally_nominated: boolean;
  
  // Section 4: Leadership Experience
  is_learner_leader: boolean;
  leader_roles?: string;
  school_activities: string;
  
  // Section 5: Motivation & Values
  why_edlead: string;
  leadership_meaning: string;
  school_challenge: string;
  
  // Section 6: School Impact Project
  project_idea: string;
  project_problem: string;
  project_benefit: string;
  project_team: string;
  
  // Section 7: Academic Commitment
  manage_schoolwork: string;
  academic_importance: string;
  
  // Section 8: Programme Commitment
  willing_to_commit: boolean;
  has_device_access: boolean;
  
  // Section 9: Declaration
  learner_signature: string;
  learner_signature_date: string;
  
  // Section 10: Parent/Guardian Consent
  parent_signature_name: string;
  parent_signature: string;
  parent_signature_date: string;
  
  // Optional
  video_link?: string;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "edLEAD <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Email send error:", error);
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const applicationData: ApplicationData = await req.json();
    console.log("Received application from:", applicationData.full_name);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert application into database
    const { data: application, error: dbError } = await supabase
      .from("applications")
      .insert([applicationData])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to save application: ${dbError.message}`);
    }

    console.log("Application saved with ID:", application.id);

    // Send confirmation email to student
    const studentEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          h1 { margin: 0; }
          .highlight { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>edLEAD for Student Leaders</h1>
          </div>
          <div class="content">
            <h2>Dear ${applicationData.full_name},</h2>
            <p>Thank you for applying to the edLEAD for Student Leaders programme!</p>
            
            <div class="highlight">
              <strong>Application Reference:</strong> ${application.id.slice(0, 8).toUpperCase()}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleDateString('en-ZA', { dateStyle: 'full' })}
            </div>
            
            <p>We have received your application and it is now under review. Here's what happens next:</p>
            
            <ol>
              <li><strong>Review Process:</strong> Our team will carefully review your application, including your leadership experience and proposed school impact project.</li>
              <li><strong>School Verification:</strong> We will verify your school nomination with ${applicationData.nominating_teacher}.</li>
              <li><strong>Selection:</strong> Successful candidates will be notified via email and phone.</li>
            </ol>
            
            <p>If you have any questions, please don't hesitate to reach out to us.</p>
            
            <p>Best regards,<br>
            <strong>The edLEAD Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p>© ${new Date().getFullYear()} edLEAD for Student Leaders. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      applicationData.student_email,
      "Your edLEAD Application Has Been Received!",
      studentEmailHtml
    );
    console.log("Student email sent to:", applicationData.student_email);

    // Send notification email to parent/guardian
    const parentEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1e3a5f; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          h1 { margin: 0; }
          .highlight { background: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>edLEAD for Student Leaders</h1>
          </div>
          <div class="content">
            <h2>Dear ${applicationData.parent_name},</h2>
            <p>We are writing to confirm that we have received an application for the edLEAD for Student Leaders programme from your child, <strong>${applicationData.full_name}</strong>.</p>
            
            <div class="highlight">
              <strong>Application Reference:</strong> ${application.id.slice(0, 8).toUpperCase()}<br>
              <strong>Applicant:</strong> ${applicationData.full_name}<br>
              <strong>School:</strong> ${applicationData.school_name}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleDateString('en-ZA', { dateStyle: 'full' })}
            </div>
            
            <p>Thank you for providing your consent for ${applicationData.full_name} to participate in the edLEAD programme if selected.</p>
            
            <p>We will be in touch regarding the outcome of the application. If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            <strong>The edLEAD Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply directly to this email.</p>
            <p>© ${new Date().getFullYear()} edLEAD for Student Leaders. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      applicationData.parent_email,
      `edLEAD Application Received for ${applicationData.full_name}`,
      parentEmailHtml
    );
    console.log("Parent email sent to:", applicationData.parent_email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        applicationId: application.id,
        message: "Application submitted successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in submit-application function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
