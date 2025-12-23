-- Add notification category preferences
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS notify_applications boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_blogs boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_admin_changes boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_critical_alerts boolean NOT NULL DEFAULT true;