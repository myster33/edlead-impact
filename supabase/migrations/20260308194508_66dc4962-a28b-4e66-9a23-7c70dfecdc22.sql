
CREATE TABLE public.school_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  term_number integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  academic_year integer NOT NULL DEFAULT EXTRACT(year FROM now()),
  created_by uuid REFERENCES public.school_users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(school_id, term_number, academic_year)
);

ALTER TABLE public.school_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view terms" ON public.school_terms FOR SELECT USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "School staff can insert terms" ON public.school_terms FOR INSERT WITH CHECK (is_school_staff(auth.uid(), school_id));
CREATE POLICY "School staff can update terms" ON public.school_terms FOR UPDATE USING (is_school_staff(auth.uid(), school_id));
CREATE POLICY "School staff can delete terms" ON public.school_terms FOR DELETE USING (is_school_staff(auth.uid(), school_id));
CREATE POLICY "Main admins can manage all terms" ON public.school_terms FOR ALL USING (is_admin(auth.uid()));
