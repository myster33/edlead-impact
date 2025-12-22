-- Drop existing SELECT policies on applications table that are causing issues
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view their own submissions" ON public.applications;

-- Create a PERMISSIVE policy for admin SELECT access (admins can see all)
CREATE POLICY "Admins can view all applications"
ON public.applications
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Note: We're removing the "Applicants can view their own submissions" policy
-- because it used email-based matching which is insecure.
-- Applicants should use the check-application-status edge function with their reference number instead.
-- This is more secure as it doesn't require authentication and uses a secret reference number.