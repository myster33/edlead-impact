-- Add column for performance report email preferences
ALTER TABLE public.admin_users 
ADD COLUMN notify_performance_reports boolean NOT NULL DEFAULT true;