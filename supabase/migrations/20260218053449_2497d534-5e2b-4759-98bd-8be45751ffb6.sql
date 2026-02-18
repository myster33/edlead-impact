
-- Create dashboard announcements table
CREATE TABLE public.dashboard_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'info' CHECK (priority IN ('info', 'warning', 'urgent')),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.dashboard_announcements ENABLE ROW LEVEL SECURITY;

-- All admins can view announcements
CREATE POLICY "All admins can view announcements"
  ON public.dashboard_announcements
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Only admin-role users can create announcements
CREATE POLICY "Admin role can create announcements"
  ON public.dashboard_announcements
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin role can update announcements
CREATE POLICY "Admin role can update announcements"
  ON public.dashboard_announcements
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin role can delete announcements
CREATE POLICY "Admin role can delete announcements"
  ON public.dashboard_announcements
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient queries
CREATE INDEX idx_dashboard_announcements_pinned ON public.dashboard_announcements (is_pinned, created_at DESC);
