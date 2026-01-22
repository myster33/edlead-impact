-- Create cohorts table for managing cohort periods
CREATE TABLE public.cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  cohort_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(year, cohort_number)
);

-- Add cohort_id to applications table
ALTER TABLE public.applications 
ADD COLUMN cohort_id UUID REFERENCES public.cohorts(id);

-- Create certificate templates table
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  html_template TEXT NOT NULL,
  available_fields JSONB NOT NULL DEFAULT '["full_name", "school_name", "province", "country", "grade", "project_idea", "cohort_name", "completion_date"]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create certificate recipients table for tracking issued certificates
CREATE TABLE public.certificate_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  cohort_id UUID NOT NULL REFERENCES public.cohorts(id),
  template_id UUID NOT NULL REFERENCES public.certificate_templates(id),
  issued_at TIMESTAMP WITH TIME ZONE,
  issued_by UUID REFERENCES auth.users(id),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(application_id, cohort_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_recipients ENABLE ROW LEVEL SECURITY;

-- RLS policies for cohorts
CREATE POLICY "Admins can view cohorts" 
ON public.cohorts FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage cohorts" 
ON public.cohorts FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for certificate_templates
CREATE POLICY "Admins can view certificate templates" 
ON public.certificate_templates FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage certificate templates" 
ON public.certificate_templates FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for certificate_recipients
CREATE POLICY "Admins can view certificate recipients" 
ON public.certificate_recipients FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage certificate recipients" 
ON public.certificate_recipients FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on cohorts
CREATE TRIGGER update_cohorts_updated_at
BEFORE UPDATE ON public.cohorts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on certificate_templates
CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-assign cohort based on application date
CREATE OR REPLACE FUNCTION public.assign_application_cohort()
RETURNS TRIGGER AS $$
BEGIN
  -- Find the active cohort that matches the application date
  SELECT id INTO NEW.cohort_id
  FROM public.cohorts
  WHERE NEW.created_at::date >= start_date 
    AND NEW.created_at::date <= end_date
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to auto-assign cohort on new applications
CREATE TRIGGER assign_cohort_on_insert
BEFORE INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.assign_application_cohort();

-- Insert default cohorts for 2026
INSERT INTO public.cohorts (name, year, cohort_number, start_date, end_date, is_active)
VALUES 
  ('Cohort 2026-1', 2026, 1, '2026-01-01', '2026-03-31', true),
  ('Cohort 2026-2', 2026, 2, '2026-04-01', '2026-07-31', false);

-- Insert a default certificate template
INSERT INTO public.certificate_templates (name, html_template, is_default)
VALUES (
  'Standard Certificate',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Georgia, serif; text-align: center; padding: 60px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
    .certificate { background: white; border: 3px solid #4A4A4A; padding: 60px; max-width: 800px; margin: 0 auto; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header { color: #4A4A4A; font-size: 14px; letter-spacing: 3px; margin-bottom: 20px; }
    .title { font-size: 48px; color: #2d3748; margin: 20px 0; font-weight: bold; }
    .subtitle { font-size: 18px; color: #718096; margin-bottom: 30px; }
    .recipient { font-size: 36px; color: #4A4A4A; font-style: italic; margin: 30px 0; border-bottom: 2px solid #4A4A4A; display: inline-block; padding-bottom: 10px; }
    .description { font-size: 16px; color: #4a5568; line-height: 1.8; margin: 30px 0; }
    .cohort { font-size: 14px; color: #718096; margin-top: 40px; }
    .date { font-size: 14px; color: #718096; margin-top: 10px; }
    .footer { margin-top: 50px; display: flex; justify-content: space-around; }
    .signature { text-align: center; }
    .signature-line { width: 200px; border-top: 1px solid #4A4A4A; margin: 0 auto 10px; }
    .signature-title { font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">EDLEAD LEADERSHIP PROGRAMME</div>
    <div class="title">Certificate of Accomplishment</div>
    <div class="subtitle">This is to certify that</div>
    <div class="recipient">{{full_name}}</div>
    <div class="description">
      from {{school_name}}, {{province}}, {{country}}<br><br>
      has successfully completed the edLEAD Leadership Programme,<br>
      demonstrating exceptional leadership qualities and commitment to<br>
      creating positive change in their school community.
    </div>
    <div class="cohort">{{cohort_name}}</div>
    <div class="date">Issued on {{completion_date}}</div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-title">Programme Director</div>
      </div>
      <div class="signature">
        <div class="signature-line"></div>
        <div class="signature-title">Academic Coordinator</div>
      </div>
    </div>
  </div>
</body>
</html>',
  true
);