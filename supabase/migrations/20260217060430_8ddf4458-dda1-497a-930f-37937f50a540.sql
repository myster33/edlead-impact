
-- Create admin_login_history table
CREATE TABLE public.admin_login_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  logged_in_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  device_label text
);

-- Enable RLS
ALTER TABLE public.admin_login_history ENABLE ROW LEVEL SECURITY;

-- Admins can view their own login history
CREATE POLICY "Users can view their own login history"
ON public.admin_login_history
FOR SELECT
USING (admin_user_id IN (
  SELECT id FROM public.admin_users WHERE user_id = auth.uid()
));

-- Admins can insert their own login history
CREATE POLICY "Users can insert their own login history"
ON public.admin_login_history
FOR INSERT
WITH CHECK (admin_user_id IN (
  SELECT id FROM public.admin_users WHERE user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_admin_login_history_admin_user_id ON public.admin_login_history(admin_user_id);
CREATE INDEX idx_admin_login_history_logged_in_at ON public.admin_login_history(logged_in_at DESC);
