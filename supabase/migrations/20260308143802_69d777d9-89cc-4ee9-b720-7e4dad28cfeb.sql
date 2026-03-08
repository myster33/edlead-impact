-- Fix FK: admin_audit_log.admin_user_id should reference admin_users, not auth.users
ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_admin_user_id_fkey;
ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id);