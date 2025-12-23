-- Allow users to update their own admin_users record (profile)
DROP POLICY IF EXISTS "Only admins can update admin users" ON public.admin_users;

-- Create separate policies: one for admins to update anyone, one for users to update themselves
CREATE POLICY "Admins can update any admin user" 
ON public.admin_users 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update their own profile" 
ON public.admin_users 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());