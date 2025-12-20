-- Create applications table for edLEAD form submissions
CREATE TABLE public.applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Section 1: Learner Information
    full_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT,
    grade TEXT NOT NULL,
    school_name TEXT NOT NULL,
    school_address TEXT NOT NULL,
    province TEXT NOT NULL,
    student_email TEXT NOT NULL,
    student_phone TEXT NOT NULL,
    
    -- Section 2: Parent/Guardian Information
    parent_name TEXT NOT NULL,
    parent_relationship TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_consent BOOLEAN NOT NULL DEFAULT false,
    
    -- Section 3: School Nomination Details
    nominating_teacher TEXT NOT NULL,
    teacher_position TEXT NOT NULL,
    school_email TEXT NOT NULL,
    school_contact TEXT NOT NULL,
    formally_nominated BOOLEAN NOT NULL DEFAULT false,
    
    -- Section 4: Leadership Experience
    is_learner_leader BOOLEAN NOT NULL DEFAULT false,
    leader_roles TEXT,
    school_activities TEXT NOT NULL,
    
    -- Section 5: Motivation & Values
    why_edlead TEXT NOT NULL,
    leadership_meaning TEXT NOT NULL,
    school_challenge TEXT NOT NULL,
    
    -- Section 6: School Impact Project
    project_idea TEXT NOT NULL,
    project_problem TEXT NOT NULL,
    project_benefit TEXT NOT NULL,
    project_team TEXT NOT NULL,
    
    -- Section 7: Academic Commitment
    manage_schoolwork TEXT NOT NULL,
    academic_importance TEXT NOT NULL,
    
    -- Section 8: Programme Commitment
    willing_to_commit BOOLEAN NOT NULL DEFAULT false,
    has_device_access BOOLEAN NOT NULL DEFAULT false,
    
    -- Section 9: Declaration
    learner_signature TEXT NOT NULL,
    learner_signature_date DATE NOT NULL,
    
    -- Section 10: Parent/Guardian Consent
    parent_signature_name TEXT NOT NULL,
    parent_signature TEXT NOT NULL,
    parent_signature_date DATE NOT NULL,
    
    -- Optional uploads
    learner_photo_url TEXT,
    supporting_doc_url TEXT,
    video_link TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert applications (public form)
CREATE POLICY "Anyone can submit applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view applications (for now, we'll add admin role later)
-- For initial setup, we'll allow reading own submissions by email
CREATE POLICY "Applicants can view their own submissions" 
ON public.applications 
FOR SELECT 
USING (student_email = current_setting('request.jwt.claims', true)::json->>'email');