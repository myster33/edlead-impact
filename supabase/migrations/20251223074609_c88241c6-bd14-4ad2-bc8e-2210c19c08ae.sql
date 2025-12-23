-- Add profile fields to admin_users table
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS position text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS province text;