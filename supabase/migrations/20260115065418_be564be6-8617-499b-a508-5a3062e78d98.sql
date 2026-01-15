-- First create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create module_permissions table to store which roles can access each admin module
CREATE TABLE public.module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key text NOT NULL UNIQUE,
  module_name text NOT NULL,
  allowed_roles app_role[] NOT NULL DEFAULT ARRAY['admin'::app_role],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can view permissions
CREATE POLICY "Admins can view module permissions"
ON public.module_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update permissions
CREATE POLICY "Admins can update module permissions"
ON public.module_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert permissions
CREATE POLICY "Admins can insert module permissions"
ON public.module_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete permissions
CREATE POLICY "Admins can delete module permissions"
ON public.module_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_module_permissions_updated_at
BEFORE UPDATE ON public.module_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions for all admin modules
INSERT INTO public.module_permissions (module_key, module_name, allowed_roles) VALUES
  ('dashboard', 'Dashboard', ARRAY['viewer', 'reviewer', 'admin']::app_role[]),
  ('applications', 'Applications', ARRAY['reviewer', 'admin']::app_role[]),
  ('users', 'User Management', ARRAY['admin']::app_role[]),
  ('analytics', 'Analytics', ARRAY['reviewer', 'admin']::app_role[]),
  ('blog', 'Blog Management', ARRAY['reviewer', 'admin']::app_role[]),
  ('email-templates', 'Email Templates', ARRAY['reviewer', 'admin']::app_role[]),
  ('settings', 'Settings', ARRAY['admin']::app_role[]),
  ('audit-log', 'Audit Log', ARRAY['admin']::app_role[]),
  ('permissions', 'Permissions', ARRAY['admin']::app_role[]);