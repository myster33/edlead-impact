
-- Add co-organiser fields to events table
ALTER TABLE public.events ADD COLUMN organiser2_name text;
ALTER TABLE public.events ADD COLUMN organiser2_logo_url text;
ALTER TABLE public.events ADD COLUMN organiser2_website text;

-- Add student grade to event_bookings table
ALTER TABLE public.event_bookings ADD COLUMN student_grade text;
