
-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(school_id, name)
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view subjects" ON public.subjects FOR SELECT USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "School staff can manage subjects" ON public.subjects FOR INSERT WITH CHECK (is_school_staff(auth.uid(), school_id));
CREATE POLICY "School staff can update subjects" ON public.subjects FOR UPDATE USING (is_school_staff(auth.uid(), school_id));
CREATE POLICY "School staff can delete subjects" ON public.subjects FOR DELETE USING (is_school_staff(auth.uid(), school_id));
CREATE POLICY "Main admins can manage all subjects" ON public.subjects FOR ALL USING (is_admin(auth.uid()));

-- Student subjects (students select their subjects)
CREATE TABLE public.student_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id)
);
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view student subjects" ON public.student_subjects FOR SELECT USING (
  EXISTS (SELECT 1 FROM school_users su WHERE su.id = student_subjects.student_id AND is_school_member(auth.uid(), su.school_id))
);
CREATE POLICY "Students can manage own subjects" ON public.student_subjects FOR INSERT WITH CHECK (
  student_id IN (SELECT id FROM school_users WHERE user_id = auth.uid())
);
CREATE POLICY "School staff can manage student subjects" ON public.student_subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM school_users su WHERE su.id = student_subjects.student_id AND is_school_staff(auth.uid(), su.school_id))
);
CREATE POLICY "Main admins can manage all student subjects" ON public.student_subjects FOR ALL USING (is_admin(auth.uid()));

-- Timetable entries (teacher's schedule)
CREATE TABLE public.timetable_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  period_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view timetable" ON public.timetable_entries FOR SELECT USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Teachers can manage own timetable" ON public.timetable_entries FOR INSERT WITH CHECK (
  teacher_id IN (SELECT id FROM school_users WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can update own timetable" ON public.timetable_entries FOR UPDATE USING (
  teacher_id IN (SELECT id FROM school_users WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can delete own timetable" ON public.timetable_entries FOR DELETE USING (
  teacher_id IN (SELECT id FROM school_users WHERE user_id = auth.uid())
);
CREATE POLICY "School staff can manage all timetables" ON public.timetable_entries FOR ALL USING (is_school_staff(auth.uid(), school_id));
CREATE POLICY "Main admins can manage all timetables" ON public.timetable_entries FOR ALL USING (is_admin(auth.uid()));

-- Period attendance (present by default, only mark absents)
CREATE TABLE public.period_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  timetable_entry_id UUID NOT NULL REFERENCES public.timetable_entries(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES public.school_users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(timetable_entry_id, student_id, event_date)
);
ALTER TABLE public.period_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "School members can view period attendance" ON public.period_attendance FOR SELECT USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "Teachers can insert period attendance" ON public.period_attendance FOR INSERT WITH CHECK (is_school_member(auth.uid(), school_id));
CREATE POLICY "Teachers can update period attendance" ON public.period_attendance FOR UPDATE USING (is_school_member(auth.uid(), school_id));
CREATE POLICY "School staff can manage all period attendance" ON public.period_attendance FOR ALL USING (is_school_staff(auth.uid(), school_id));
CREATE POLICY "Main admins can manage all period attendance" ON public.period_attendance FOR ALL USING (is_admin(auth.uid()));
