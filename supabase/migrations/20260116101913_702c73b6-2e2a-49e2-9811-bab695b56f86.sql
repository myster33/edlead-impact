-- Drop the admin-only SELECT policy
DROP POLICY IF EXISTS "Admins can view module permissions" ON public.module_permissions;

-- Create a new policy that allows all admin users (viewer, reviewer, admin) to view module permissions
CREATE POLICY "Admin users can view module permissions" 
ON public.module_permissions 
FOR SELECT 
USING (is_admin(auth.uid()));