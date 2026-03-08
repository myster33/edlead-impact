
-- Create curricula table
CREATE TABLE public.curricula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  country text NOT NULL DEFAULT 'South Africa',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active curricula" ON public.curricula
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage curricula" ON public.curricula
  FOR ALL USING (is_admin(auth.uid()));

-- Add curriculum_id and grade to subjects
ALTER TABLE public.subjects 
  ADD COLUMN curriculum_id uuid REFERENCES public.curricula(id),
  ADD COLUMN grade text;

-- Seed CAPS curriculum
INSERT INTO public.curricula (name, code, country) VALUES
  ('CAPS (Curriculum and Assessment Policy Statement)', 'CAPS', 'South Africa'),
  ('IEB (Independent Examinations Board)', 'IEB', 'South Africa'),
  ('Cambridge (IGCSE)', 'CAMBRIDGE', 'International');
