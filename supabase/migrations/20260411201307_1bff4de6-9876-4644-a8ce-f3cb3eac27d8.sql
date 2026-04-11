ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organiser_name text,
  ADD COLUMN IF NOT EXISTS organiser_logo_url text,
  ADD COLUMN IF NOT EXISTS organiser_website text;