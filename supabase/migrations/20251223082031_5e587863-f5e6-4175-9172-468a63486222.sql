-- Add email notification preferences column to admin_users
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS email_digest_enabled BOOLEAN NOT NULL DEFAULT true;