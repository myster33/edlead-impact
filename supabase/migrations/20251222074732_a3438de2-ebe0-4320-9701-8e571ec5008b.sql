-- Ensure the vulnerable email-based policy is removed
DROP POLICY IF EXISTS "Applicants can view their own submissions" ON public.applications;