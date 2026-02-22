-- Drop the restrictive INSERT policy
DROP POLICY "System can insert audit logs" ON public.admin_audit_log;

-- Create a permissive INSERT policy instead
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));
