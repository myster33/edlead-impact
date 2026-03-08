-- Table for self-registration requests (student/parent/educator signup)
CREATE TABLE public.portal_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('student', 'parent', 'educator')),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_id_number text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.school_users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a registration request (they're not authenticated yet)
CREATE POLICY "Anyone can submit registration requests"
  ON public.portal_registration_requests FOR INSERT
  WITH CHECK (true);

-- School staff can view their school's requests
CREATE POLICY "School staff can view registration requests"
  ON public.portal_registration_requests FOR SELECT
  USING (is_school_staff(auth.uid(), school_id) OR is_admin(auth.uid()));

-- School staff can update (approve/reject)
CREATE POLICY "School staff can update registration requests"
  ON public.portal_registration_requests FOR UPDATE
  USING (is_school_staff(auth.uid(), school_id) OR is_admin(auth.uid()));

-- Table for parent-learner link requests
CREATE TABLE public.parent_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid REFERENCES public.school_users(id) ON DELETE CASCADE NOT NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL,
  student_id_number text,
  relationship text NOT NULL DEFAULT 'guardian',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  matched_student_id uuid REFERENCES public.school_users(id),
  reviewed_by uuid REFERENCES public.school_users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_link_requests ENABLE ROW LEVEL SECURITY;

-- Parents can create link requests
CREATE POLICY "Parents can create link requests"
  ON public.parent_link_requests FOR INSERT
  WITH CHECK (parent_user_id IN (
    SELECT id FROM school_users WHERE user_id = auth.uid()
  ));

-- Parents can view their own requests
CREATE POLICY "Parents can view own link requests"
  ON public.parent_link_requests FOR SELECT
  USING (parent_user_id IN (
    SELECT id FROM school_users WHERE user_id = auth.uid()
  ));

-- School staff can view their school's requests
CREATE POLICY "School staff can view link requests"
  ON public.parent_link_requests FOR SELECT
  USING (is_school_staff(auth.uid(), school_id) OR is_admin(auth.uid()));

-- School staff can update (approve/reject)
CREATE POLICY "School staff can update link requests"
  ON public.parent_link_requests FOR UPDATE
  USING (is_school_staff(auth.uid(), school_id) OR is_admin(auth.uid()));