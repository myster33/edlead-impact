
-- Create misconduct_reports table
CREATE TABLE public.misconduct_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  reporter_user_id uuid,
  reporter_role text NOT NULL DEFAULT 'guest',
  reporter_name text,
  is_anonymous boolean NOT NULL DEFAULT false,
  victim_names text,
  report_type text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  attachment_urls text[] DEFAULT '{}',
  location text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES public.school_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  is_emergency boolean NOT NULL DEFAULT false,
  is_trending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create misconduct_report_audit table
CREATE TABLE public.misconduct_report_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.misconduct_reports(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.misconduct_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misconduct_report_audit ENABLE ROW LEVEL SECURITY;

-- RLS for misconduct_reports
CREATE POLICY "Anyone can submit misconduct reports"
  ON public.misconduct_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "School staff can view school reports"
  ON public.misconduct_reports FOR SELECT
  USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "Reporter can view own reports"
  ON public.misconduct_reports FOR SELECT
  USING (reporter_user_id = auth.uid());

CREATE POLICY "School staff can update school reports"
  ON public.misconduct_reports FOR UPDATE
  USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "Main admins can manage all misconduct reports"
  ON public.misconduct_reports FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view trending reports"
  ON public.misconduct_reports FOR SELECT
  USING (is_trending = true);

-- RLS for misconduct_report_audit
CREATE POLICY "School staff can view report audit"
  ON public.misconduct_report_audit FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.misconduct_reports mr
    WHERE mr.id = report_id AND is_school_staff(auth.uid(), mr.school_id)
  ));

CREATE POLICY "Main admins can manage report audit"
  ON public.misconduct_report_audit FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert audit entries"
  ON public.misconduct_report_audit FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Updated_at trigger
CREATE TRIGGER update_misconduct_reports_updated_at
  BEFORE UPDATE ON public.misconduct_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.misconduct_reports;
