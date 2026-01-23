-- Add theme preference column to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN theme_preference text DEFAULT 'system';