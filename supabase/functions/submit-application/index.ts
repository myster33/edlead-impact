import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "edLEAD <info@edlead.co.za>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation helpers
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 7 && phone.length <= 25;
};

const isValidDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === "") return true; // Optional field
  try {
    const parsed = new URL(url);
    // Only allow YouTube and Google Drive links for video
    const allowedHosts = ["youtube.com", "www.youtube.com", "youtu.be", "drive.google.com", "docs.google.com"];
    return allowedHosts.some(host => parsed.hostname.includes(host));
  } catch {
    return false;
  }
};

const sanitizeString = (str: string, maxLength: number = 1000): string => {
  if (!str) return "";
  return str.trim().substring(0, maxLength);
};

const sanitizeName = (name: string): string => {
  return sanitizeString(name, 100);
};

// Valid options for select fields
const validGrades = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

interface ApplicationData {
  full_name: string;
  date_of_birth: string;
  gender?: string;
  grade: string;
  school_name: string;
  school_address: string;
  province: string;
  student_email: string;
  student_phone: string;
  parent_name: string;
  parent_relationship: string;
  parent_email: string;
  parent_phone: string;
  parent_consent: boolean;
  nominating_teacher: string;
  teacher_position: string;
  school_email: string;
  school_contact: string;
  formally_nominated: boolean;
  is_learner_leader: boolean;
  leader_roles?: string;
  school_activities: string;
  why_edlead: string;
  leadership_meaning: string;
  school_challenge: string;
  project_idea: string;
  project_problem: string;
  project_benefit: string;
  project_team: string;
  manage_schoolwork: string;
  academic_importance: string;
  willing_to_commit: boolean;
  has_device_access: boolean;
  learner_signature: string;
  learner_signature_date: string;
  parent_signature_name: string;
  parent_signature: string;
  parent_signature_date: string;
  video_link?: string;
  country?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

function validateApplication(data: ApplicationData): ValidationResult {
  const errors: string[] = [];

  // Required text fields with length limits
  if (!data.full_name || data.full_name.trim().length < 2) {
    errors.push("Full name is required and must be at least 2 characters");
  }
  if (data.full_name && data.full_name.length > 100) {
    errors.push("Full name must be less than 100 characters");
  }

  // Email validations
  if (!data.student_email || !isValidEmail(data.student_email)) {
    errors.push("A valid student email is required");
  }
  if (!data.parent_email || !isValidEmail(data.parent_email)) {
    errors.push("A valid parent/guardian email is required");
  }
  if (!data.school_email || !isValidEmail(data.school_email)) {
    errors.push("A valid school email is required");
  }

  // Phone validations
  if (!data.student_phone || !isValidPhone(data.student_phone)) {
    errors.push("A valid student phone number is required");
  }
  if (!data.parent_phone || !isValidPhone(data.parent_phone)) {
    errors.push("A valid parent/guardian phone number is required");
  }
  if (!data.school_contact || !isValidPhone(data.school_contact)) {
    errors.push("A valid school contact number is required");
  }

  // Date validations
  if (!data.date_of_birth || !isValidDate(data.date_of_birth)) {
    errors.push("A valid date of birth is required");
  } else {
    const dob = new Date(data.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 10 || age > 25) {
      errors.push("Date of birth must indicate an age between 10 and 25 years");
    }
  }

  // Signature dates are auto-generated, so just validate format if provided
  if (data.learner_signature_date && !isValidDate(data.learner_signature_date)) {
    errors.push("A valid learner signature date is required");
  }
  if (data.parent_signature_date && !isValidDate(data.parent_signature_date)) {
    errors.push("A valid parent signature date is required");
  }

  // Select field validations
  if (!data.grade || !validGrades.includes(data.grade)) {
    errors.push("A valid grade selection is required");
  }
  // Province is optional for countries other than South Africa or when country is "Other"
  // Only validate that province is provided for countries that have regions defined
  if (!data.country || data.country === "Other") {
    // No province validation for "Other" countries
  } else if (data.province === undefined || data.province === null) {
    // Province should be provided but can be empty string for "Other" countries
  }
  if (!data.parent_relationship || data.parent_relationship.trim().length < 2) {
    errors.push("Relationship to learner is required");
  } else if (data.parent_relationship.length > 100) {
    errors.push("Relationship to learner must be less than 100 characters");
  }

  // Required text fields
  const requiredTextFields = [
    { field: "school_name", label: "School name" },
    { field: "school_address", label: "School address" },
    { field: "parent_name", label: "Parent/guardian name" },
    { field: "nominating_teacher", label: "Nominating teacher name" },
    { field: "teacher_position", label: "Teacher position" },
    { field: "school_activities", label: "School activities" },
    { field: "why_edlead", label: "Why edLEAD motivation" },
    { field: "leadership_meaning", label: "Leadership meaning" },
    { field: "school_challenge", label: "School challenge" },
    { field: "project_idea", label: "Project idea" },
    { field: "project_problem", label: "Project problem" },
    { field: "project_benefit", label: "Project benefit" },
    { field: "project_team", label: "Project team" },
    { field: "manage_schoolwork", label: "Manage schoolwork" },
    { field: "academic_importance", label: "Academic importance" },
  ];

  for (const { field, label } of requiredTextFields) {
    const value = data[field as keyof ApplicationData];
    if (!value || (typeof value === "string" && value.trim().length === 0)) {
      errors.push(`${label} is required`);
    }
  }

  // Boolean consent validations
  if (data.parent_consent !== true) {
    errors.push("Parent/guardian consent is required");
  }
  if (data.willing_to_commit !== true) {
    errors.push("Commitment to the programme is required");
  }

  // Optional URL validation
  if (data.video_link && !isValidUrl(data.video_link)) {
    errors.push("Video link must be a valid YouTube or Google Drive URL");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function sanitizeApplication(data: ApplicationData): ApplicationData {
  return {
    full_name: sanitizeName(data.full_name),
    date_of_birth: data.date_of_birth,
    gender: data.gender ? sanitizeString(data.gender, 50) : undefined,
    grade: data.grade,
    school_name: sanitizeName(data.school_name),
    school_address: sanitizeString(data.school_address, 500),
    province: data.province,
    student_email: data.student_email?.toLowerCase().trim(),
    student_phone: sanitizeString(data.student_phone, 25),
    parent_name: sanitizeName(data.parent_name),
    parent_relationship: sanitizeString(data.parent_relationship, 100),
    parent_email: data.parent_email?.toLowerCase().trim(),
    parent_phone: sanitizeString(data.parent_phone, 25),
    parent_consent: Boolean(data.parent_consent),
    nominating_teacher: sanitizeName(data.nominating_teacher),
    teacher_position: sanitizeString(data.teacher_position, 100),
    school_email: data.school_email?.toLowerCase().trim(),
    school_contact: sanitizeString(data.school_contact, 25),
    formally_nominated: Boolean(data.formally_nominated),
    is_learner_leader: Boolean(data.is_learner_leader),
    leader_roles: data.leader_roles ? sanitizeString(data.leader_roles, 500) : undefined,
    school_activities: sanitizeString(data.school_activities),
    why_edlead: sanitizeString(data.why_edlead),
    leadership_meaning: sanitizeString(data.leadership_meaning),
    school_challenge: sanitizeString(data.school_challenge),
    project_idea: sanitizeString(data.project_idea),
    project_problem: sanitizeString(data.project_problem),
    project_benefit: sanitizeString(data.project_benefit),
    project_team: sanitizeString(data.project_team),
    manage_schoolwork: sanitizeString(data.manage_schoolwork),
    academic_importance: sanitizeString(data.academic_importance),
    willing_to_commit: Boolean(data.willing_to_commit),
    has_device_access: Boolean(data.has_device_access),
    learner_signature: sanitizeName(data.learner_signature),
    learner_signature_date: data.learner_signature_date,
    parent_signature_name: sanitizeName(data.parent_signature_name),
    parent_signature: sanitizeName(data.parent_signature),
    parent_signature_date: data.parent_signature_date,
    video_link: data.video_link ? sanitizeString(data.video_link, 500) : undefined,
    country: data.country ? sanitizeString(data.country, 100) : "South Africa",
  };
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY secret");
    throw new Error("missing_resend_api_key");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Email send error:", error);
    throw new Error("email_send_failed");
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check request size (max 100KB)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 100000) {
      console.error("Request too large:", contentLength);
      return new Response(
        JSON.stringify({ error: "Request is too large. Please reduce the size of your submission." }),
        { status: 413, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const rawData = await req.json();
    console.log("Received application submission");

    // Validate the application data
    const validation = validateApplication(rawData);
    if (!validation.isValid) {
      console.error("Validation failed:", validation.errors);
      return new Response(
        JSON.stringify({ 
          error: "Please check your application and correct the following issues.",
          details: validation.errors 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize the application data
    const applicationData = sanitizeApplication(rawData);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check for duplicate submission by email
    const { data: existingApplication, error: checkError } = await supabase
      .from("applications")
      .select("id, created_at")
      .eq("student_email", applicationData.student_email)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking for duplicate:", checkError);
      // Continue with submission - don't block on check error
    }

    if (existingApplication) {
      console.log("Duplicate application detected for:", applicationData.student_email);
      return new Response(
        JSON.stringify({ 
          error: "An application with this email address has already been submitted. If you need to make changes, please contact us."
        }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate reference number (8 character alphanumeric)
    const generateReference = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters like 0/O, 1/I
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const referenceNumber = generateReference();

    // Insert application into database with reference number
    const { data: application, error: dbError } = await supabase
      .from("applications")
      .insert([{ ...applicationData, reference_number: referenceNumber }])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("database_error");
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
              <strong>Application Reference:</strong> ${referenceNumber}<br>
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

    try {
      await sendEmail(
        applicationData.student_email,
        "Your edLEAD Application Has Been Received!",
        studentEmailHtml
      );
      console.log("Student email sent successfully");
    } catch (emailError) {
      console.error("Failed to send student email:", emailError);
      // Continue - don't fail the whole submission for email failure
    }

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
              <strong>Application Reference:</strong> ${referenceNumber}<br>
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

    try {
      await sendEmail(
        applicationData.parent_email,
        `edLEAD Application Received for ${applicationData.full_name}`,
        parentEmailHtml
      );
      console.log("Parent email sent successfully");
    } catch (emailError) {
      console.error("Failed to send parent email:", emailError);
      // Continue - don't fail the whole submission for email failure
    }

    // Send notification email to admin
    const adminNotificationHtml = `
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
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          td:first-child { font-weight: bold; width: 40%; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Application Received</h1>
          </div>
          <div class="content">
            <div class="highlight">
              <strong>Reference Number:</strong> ${referenceNumber}<br>
              <strong>Submitted:</strong> ${new Date().toLocaleDateString('en-ZA', { dateStyle: 'full', timeStyle: 'short' })}
            </div>
            
            <table>
              <tr><td>Applicant Name</td><td>${applicationData.full_name}</td></tr>
              <tr><td>Student Email</td><td>${applicationData.student_email}</td></tr>
              <tr><td>School</td><td>${applicationData.school_name}</td></tr>
              <tr><td>Grade</td><td>${applicationData.grade}</td></tr>
              <tr><td>Country</td><td>${applicationData.country || 'South Africa'}</td></tr>
              <tr><td>Province/Region</td><td>${applicationData.province}</td></tr>
              <tr><td>Nominating Teacher</td><td>${applicationData.nominating_teacher}</td></tr>
              <tr><td>Parent/Guardian</td><td>${applicationData.parent_name} (${applicationData.parent_relationship})</td></tr>
            </table>
            
            <p style="margin-top: 20px;">
              View and manage this application in the admin dashboard.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} edLEAD for Student Leaders. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail(
        "info@edlead.co.za",
        `[New Application] ${applicationData.full_name} - ${referenceNumber}`,
        adminNotificationHtml
      );
      console.log("Admin notification email sent");
    } catch (emailError) {
      console.error("Failed to send admin notification email:", emailError);
      // Continue - don't fail the submission
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        applicationId: application.id,
        referenceNumber: referenceNumber,
        message: "Application submitted successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in submit-application function:", error);
    
    // Return generic error messages - never expose internal details
    let userMessage = "We couldn't process your application at this time. Please try again later.";
    let statusCode = 500;
    
    if (error.message === "database_error") {
      userMessage = "We couldn't save your application. Please try again.";
    } else if (error.message === "email_send_failed") {
      // Application was saved but email failed - this shouldn't reach here normally
      userMessage = "Application saved but we couldn't send confirmation emails. We'll be in touch.";
      statusCode = 207; // Partial success
    }
    
    return new Response(
      JSON.stringify({ error: userMessage }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
