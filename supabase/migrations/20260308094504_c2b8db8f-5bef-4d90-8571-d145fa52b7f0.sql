
-- Create school_user_role enum
CREATE TYPE public.school_user_role AS ENUM (
  'school_admin', 'hr', 'educator', 'class_teacher', 'subject_teacher', 'parent', 'student'
);

-- Schools table (mother class)
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  province text,
  country text NOT NULL DEFAULT 'South Africa',
  school_code text UNIQUE NOT NULL,
  email text,
  phone text,
  logo_url text,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- School users table
CREATE TABLE public.school_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role school_user_role NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  student_id_number text,
  profile_picture_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, school_id, role)
);

-- Student-parent links
CREATE TABLE public.student_parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  student_user_id uuid NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'guardian',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, student_user_id)
);

-- Classes
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  grade text NOT NULL,
  class_teacher_id uuid REFERENCES public.school_users(id) ON DELETE SET NULL,
  academic_year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Class students
CREATE TABLE public.class_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, student_id)
);

-- Attendance events
CREATE TABLE public.attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role school_user_role NOT NULL,
  event_type text NOT NULL DEFAULT 'check_in',
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  timestamp timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'present',
  marked_by uuid REFERENCES public.school_users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Absence requests
CREATE TABLE public.absence_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.school_users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  reason text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  attachment_url text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.school_users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function: check if user belongs to a school
CREATE OR REPLACE FUNCTION public.is_school_member(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_users
    WHERE user_id = _user_id AND school_id = _school_id AND is_active = true
  )
$$;

-- Helper function: check if user has a school role
CREATE OR REPLACE FUNCTION public.has_school_role(_user_id uuid, _school_id uuid, _role school_user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_users
    WHERE user_id = _user_id AND school_id = _school_id AND role = _role AND is_active = true
  )
$$;

-- Helper function: check if user is school admin or HR
CREATE OR REPLACE FUNCTION public.is_school_staff(_user_id uuid, _school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.school_users
    WHERE user_id = _user_id AND school_id = _school_id 
    AND role IN ('school_admin', 'hr') AND is_active = true
  )
$$;

-- Enable RLS on all tables
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parent_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_requests ENABLE ROW LEVEL SECURITY;

-- RLS: schools
CREATE POLICY "Main admins can manage all schools" ON public.schools
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School members can view their school" ON public.schools
  FOR SELECT USING (is_school_member(auth.uid(), id));

CREATE POLICY "Anyone can register a school" ON public.schools
  FOR INSERT WITH CHECK (true);

-- RLS: school_users
CREATE POLICY "Main admins can manage all school users" ON public.school_users
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School staff can view school users" ON public.school_users
  FOR SELECT USING (is_school_member(auth.uid(), school_id));

CREATE POLICY "School admins can manage school users" ON public.school_users
  FOR INSERT WITH CHECK (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School admins can update school users" ON public.school_users
  FOR UPDATE USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "Users can view their own records" ON public.school_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own records" ON public.school_users
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS: student_parent_links
CREATE POLICY "Main admins can manage all links" ON public.student_parent_links
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School users can view links in their school" ON public.student_parent_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.school_users su
      WHERE su.id = student_parent_links.parent_user_id AND is_school_member(auth.uid(), su.school_id)
    )
  );

CREATE POLICY "School admins can manage links" ON public.student_parent_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.school_users su
      WHERE su.id = student_parent_links.parent_user_id AND is_school_staff(auth.uid(), su.school_id)
    )
  );

-- RLS: classes
CREATE POLICY "Main admins can manage all classes" ON public.classes
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School members can view classes" ON public.classes
  FOR SELECT USING (is_school_member(auth.uid(), school_id));

CREATE POLICY "School staff can manage classes" ON public.classes
  FOR INSERT WITH CHECK (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School staff can update classes" ON public.classes
  FOR UPDATE USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School staff can delete classes" ON public.classes
  FOR DELETE USING (is_school_staff(auth.uid(), school_id));

-- RLS: class_students
CREATE POLICY "Main admins can manage all class students" ON public.class_students
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School members can view class students" ON public.class_students
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND is_school_member(auth.uid(), c.school_id))
  );

CREATE POLICY "School staff can manage class students" ON public.class_students
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND is_school_staff(auth.uid(), c.school_id))
  );

CREATE POLICY "School staff can delete class students" ON public.class_students
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.classes c WHERE c.id = class_students.class_id AND is_school_staff(auth.uid(), c.school_id))
  );

-- RLS: attendance_events
CREATE POLICY "Main admins can manage all attendance" ON public.attendance_events
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School members can view attendance" ON public.attendance_events
  FOR SELECT USING (is_school_member(auth.uid(), school_id));

CREATE POLICY "School staff can insert attendance" ON public.attendance_events
  FOR INSERT WITH CHECK (is_school_member(auth.uid(), school_id));

CREATE POLICY "Users can view own attendance" ON public.attendance_events
  FOR SELECT USING (user_id IN (SELECT su.id FROM public.school_users su WHERE su.user_id = auth.uid()));

-- RLS: absence_requests
CREATE POLICY "Main admins can manage all absence requests" ON public.absence_requests
  FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "School staff can view absence requests" ON public.absence_requests
  FOR SELECT USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "School staff can update absence requests" ON public.absence_requests
  FOR UPDATE USING (is_school_staff(auth.uid(), school_id));

CREATE POLICY "Parents can submit absence requests" ON public.absence_requests
  FOR INSERT WITH CHECK (
    parent_id IN (SELECT su.id FROM public.school_users su WHERE su.user_id = auth.uid() AND su.role = 'parent')
  );

CREATE POLICY "Parents can view own absence requests" ON public.absence_requests
  FOR SELECT USING (
    parent_id IN (SELECT su.id FROM public.school_users su WHERE su.user_id = auth.uid())
  );

-- Triggers for updated_at
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_school_users_updated_at BEFORE UPDATE ON public.school_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime on attendance_events for live dashboards
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_events;
