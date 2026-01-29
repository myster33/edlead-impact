-- Create message_templates table for SMS and WhatsApp templates
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  message_content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Create message_template_history table for tracking changes
CREATE TABLE public.message_template_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  change_reason TEXT
);

-- Create message_logs table for tracking sent messages
CREATE TABLE public.message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
  recipient_phone TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('learner', 'parent')),
  template_key TEXT,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  twilio_sid TEXT,
  error_message TEXT,
  application_id UUID REFERENCES applications(id),
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_template_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_templates
CREATE POLICY "Admin users can view message templates"
ON public.message_templates FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert message templates"
ON public.message_templates FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update message templates"
ON public.message_templates FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete message templates"
ON public.message_templates FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for message_template_history
CREATE POLICY "Admin users can view message template history"
ON public.message_template_history FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert message template history"
ON public.message_template_history FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- RLS policies for message_logs
CREATE POLICY "Admin users can view message logs"
ON public.message_logs FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admin users can insert message logs"
ON public.message_logs FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Create update trigger for message_templates updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SMS templates
INSERT INTO public.message_templates (template_key, name, category, channel, message_content, variables) VALUES
('sms_application_approved_learner', 'Application Approved (Learner)', 'Application', 'sms', 
 'Hi {{applicant_name}}, congratulations! Your edLEAD application ({{reference_number}}) has been approved. Check your email for details. -edLEAD Team',
 '["applicant_name", "reference_number"]'::jsonb),
('sms_application_approved_parent', 'Application Approved (Parent)', 'Application', 'sms',
 'Dear {{parent_name}}, great news! {{applicant_name}}''s edLEAD application has been approved. Reference: {{reference_number}}. -edLEAD Team',
 '["parent_name", "applicant_name", "reference_number"]'::jsonb),
('sms_application_rejected_learner', 'Application Rejected (Learner)', 'Application', 'sms',
 'Hi {{applicant_name}}, thank you for applying to edLEAD. Unfortunately, your application was not successful this time. Keep developing your leadership skills!',
 '["applicant_name"]'::jsonb),
('sms_application_rejected_parent', 'Application Rejected (Parent)', 'Application', 'sms',
 'Dear {{parent_name}}, we regret to inform you that {{applicant_name}}''s edLEAD application was not successful. Reference: {{reference_number}}. -edLEAD Team',
 '["parent_name", "applicant_name", "reference_number"]'::jsonb),
('sms_status_change_learner', 'Status Change (Learner)', 'Application', 'sms',
 'Hi {{applicant_name}}, your edLEAD application status has changed to {{new_status}}. Reference: {{reference_number}}. Check your email for details.',
 '["applicant_name", "new_status", "reference_number"]'::jsonb),
('sms_certificate_issued', 'Certificate Issued', 'Certificate', 'sms',
 'Hi {{applicant_name}}, your edLEAD certificate is ready! Check your email to download it. Congratulations! -edLEAD Team',
 '["applicant_name"]'::jsonb);

-- Insert default WhatsApp templates
INSERT INTO public.message_templates (template_key, name, category, channel, message_content, variables) VALUES
('whatsapp_application_approved_learner', 'Application Approved (Learner)', 'Application', 'whatsapp',
 '🎉 *Congratulations {{applicant_name}}!*

Your edLEAD application has been *approved*!

📋 *Reference Number:* {{reference_number}}

We are excited to have you join our leadership development programme. Please check your email for detailed next steps and important information.

Welcome to the edLEAD family! 🌟

_- The edLEAD Team_',
 '["applicant_name", "reference_number"]'::jsonb),
('whatsapp_application_approved_parent', 'Application Approved (Parent)', 'Application', 'whatsapp',
 '🎉 *Great News, {{parent_name}}!*

We are pleased to inform you that *{{applicant_name}}*''s application to edLEAD has been *approved*!

📋 *Reference Number:* {{reference_number}}

Your child has been selected to join our leadership development programme. Please check your email for detailed information about the next steps.

Thank you for supporting their leadership journey! 🌟

_- The edLEAD Team_',
 '["parent_name", "applicant_name", "reference_number"]'::jsonb),
('whatsapp_application_rejected_learner', 'Application Rejected (Learner)', 'Application', 'whatsapp',
 'Dear {{applicant_name}},

Thank you for applying to the edLEAD Leadership Programme. After careful consideration, we regret to inform you that your application was not successful this time.

This does not define your potential. Keep developing your leadership skills and consider applying again in the future.

We wish you all the best in your journey! 💪

_- The edLEAD Team_',
 '["applicant_name"]'::jsonb),
('whatsapp_application_rejected_parent', 'Application Rejected (Parent)', 'Application', 'whatsapp',
 'Dear {{parent_name}},

Thank you for supporting {{applicant_name}}''s application to the edLEAD Leadership Programme.

📋 *Reference Number:* {{reference_number}}

After careful consideration, we regret to inform you that the application was not successful this time.

We encourage continued development of leadership skills and future applications.

_- The edLEAD Team_',
 '["parent_name", "applicant_name", "reference_number"]'::jsonb),
('whatsapp_status_change_learner', 'Status Change (Learner)', 'Application', 'whatsapp',
 '📢 *Application Status Update*

Hi {{applicant_name}},

Your edLEAD application status has been updated.

📋 *Reference Number:* {{reference_number}}
📊 *New Status:* {{new_status}}

Please check your email for more details.

_- The edLEAD Team_',
 '["applicant_name", "reference_number", "new_status"]'::jsonb),
('whatsapp_certificate_issued', 'Certificate Issued', 'Certificate', 'whatsapp',
 '🏆 *Certificate Ready!*

Congratulations {{applicant_name}}! 🎉

Your edLEAD Programme completion certificate is now available!

Please check your email to download your certificate.

We are proud of your achievement and wish you continued success on your leadership journey! 🌟

_- The edLEAD Team_',
 '["applicant_name"]'::jsonb);

-- Insert system settings for SMS and WhatsApp notifications
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('sms_notifications_enabled', 'false'::jsonb, 'Enable SMS notifications for applicants and parents'),
('whatsapp_notifications_enabled', 'false'::jsonb, 'Enable WhatsApp notifications for applicants and parents')
ON CONFLICT (setting_key) DO NOTHING;

-- Add module permissions for message-templates and message-center
INSERT INTO public.module_permissions (module_key, module_name, allowed_roles) VALUES
('message-templates', 'Message Templates', ARRAY['admin']::app_role[]),
('message-center', 'Message Center', ARRAY['admin']::app_role[])
ON CONFLICT (module_key) DO NOTHING;