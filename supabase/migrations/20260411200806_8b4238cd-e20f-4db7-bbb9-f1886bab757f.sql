ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS school_name text;