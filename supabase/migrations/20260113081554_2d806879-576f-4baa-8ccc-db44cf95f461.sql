-- Create email_templates table for persisting email template edits
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can view templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can insert templates
CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update templates
CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete templates
CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_updated_at();

-- Create email_template_history table for version history
CREATE TABLE public.email_template_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  subject text NOT NULL,
  html_content text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  change_reason text
);

-- Enable RLS
ALTER TABLE public.email_template_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view history
CREATE POLICY "Admins can view template history"
ON public.email_template_history
FOR SELECT
USING (is_admin(auth.uid()));

-- System can insert history
CREATE POLICY "System can insert template history"
ON public.email_template_history
FOR INSERT
WITH CHECK (is_admin(auth.uid()));