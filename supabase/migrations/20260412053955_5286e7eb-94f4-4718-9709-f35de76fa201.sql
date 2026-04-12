ALTER TABLE public.event_attendance ALTER COLUMN checked_in_at DROP NOT NULL;
ALTER TABLE public.event_attendance ALTER COLUMN checked_in_at DROP DEFAULT;