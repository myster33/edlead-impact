ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS checked_out_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS attendee_type text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS parent_name text,
  ADD COLUMN IF NOT EXISTS parent_phone text,
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS email_sent boolean NOT NULL DEFAULT false;