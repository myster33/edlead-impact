
-- Allow students to delete their own subject enrollments
CREATE POLICY "Students can delete own subjects"
ON public.student_subjects
FOR DELETE
USING (student_id IN (
  SELECT id FROM public.school_users WHERE user_id = auth.uid()
));
