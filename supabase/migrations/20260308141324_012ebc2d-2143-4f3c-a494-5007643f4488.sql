
-- Add region_scope column to admin_users
ALTER TABLE public.admin_users ADD COLUMN IF NOT EXISTS region_scope text NOT NULL DEFAULT 'all';

-- Update has_role to include super_admin (super_admin passes all role checks)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND (role = _role OR role = 'super_admin')
  )
$$;
