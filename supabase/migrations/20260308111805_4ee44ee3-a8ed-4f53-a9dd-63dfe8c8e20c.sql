
-- Create schools_directory table for autocomplete lookup
CREATE TABLE public.schools_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emis_number text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  province text NOT NULL DEFAULT 'Gauteng',
  district text,
  level text,
  sector text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schools_directory ENABLE ROW LEVEL SECURITY;

-- Anyone can read the directory (public lookup data)
CREATE POLICY "Anyone can view schools directory"
  ON public.schools_directory FOR SELECT
  USING (true);

-- Only admins can manage directory
CREATE POLICY "Admins can manage schools directory"
  ON public.schools_directory FOR ALL
  USING (is_admin(auth.uid()));

-- Add emis_number to the schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS emis_number text;
