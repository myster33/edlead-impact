-- Enable realtime for admin_audit_log table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;