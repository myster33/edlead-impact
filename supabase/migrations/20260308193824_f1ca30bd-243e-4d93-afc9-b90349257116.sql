
-- Create school calendar events table
CREATE TABLE public.school_calendar_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'event',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_all_day boolean NOT NULL DEFAULT true,
  start_time time,
  end_time time,
  color text DEFAULT '#3b82f6',
  created_by uuid REFERENCES public.school_users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "School members can view calendar events"
  ON public.school_calendar_events FOR SELECT
  USING (is_school_member(auth.uid(), school_id));

CREATE POLICY "School staff can insert calendar events"
  ON public.school_calendar_events FOR INSERT
  WITH CHECK (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School staff can update calendar events"
  ON public.school_calendar_events FOR UPDATE
  USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School staff can delete calendar events"
  ON public.school_calendar_events FOR DELETE
  USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "Main admins can manage all calendar events"
  ON public.school_calendar_events FOR ALL
  USING (is_admin(auth.uid()));
