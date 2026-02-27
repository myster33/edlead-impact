
-- Drop the existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;

-- Re-create as PERMISSIVE policies (default)
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log
FOR SELECT
USING (is_admin(auth.uid()));
