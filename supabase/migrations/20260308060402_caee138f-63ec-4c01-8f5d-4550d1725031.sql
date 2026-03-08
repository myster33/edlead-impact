
-- 1. Rate limits table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- No RLS needed - accessed only via security definer function
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _ip text,
  _endpoint text,
  _max_requests integer,
  _window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
BEGIN
  -- Clean up expired windows
  DELETE FROM public.rate_limits
  WHERE endpoint = _endpoint
    AND window_start < now() - (_window_minutes || ' minutes')::interval;

  -- Check existing record
  SELECT request_count INTO _current_count
  FROM public.rate_limits
  WHERE ip_address = _ip
    AND endpoint = _endpoint
    AND window_start > now() - (_window_minutes || ' minutes')::interval;

  IF _current_count IS NULL THEN
    -- New window
    INSERT INTO public.rate_limits (ip_address, endpoint, request_count, window_start)
    VALUES (_ip, _endpoint, 1, now());
    RETURN true;
  ELSIF _current_count >= _max_requests THEN
    -- Rate limited
    RETURN false;
  ELSE
    -- Increment
    UPDATE public.rate_limits
    SET request_count = request_count + 1
    WHERE ip_address = _ip
      AND endpoint = _endpoint
      AND window_start > now() - (_window_minutes || ' minutes')::interval;
    RETURN true;
  END IF;
END;
$$;

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_applications_status_created ON public.applications(status, created_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_created ON public.blog_posts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin_created ON public.admin_audit_log(admin_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON public.blog_likes(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON public.blog_comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_read ON public.admin_notifications(admin_user_id, is_read);

-- 3. Soft delete columns
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Update RLS: public SELECT on applications now excludes soft-deleted
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view approved blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can view approved blog posts" ON public.blog_posts FOR SELECT
  USING (
    (status = 'approved' AND deleted_at IS NULL)
    OR is_admin(auth.uid())
  );

-- 4. Application status history table
CREATE TABLE public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  old_status text NOT NULL,
  new_status text NOT NULL,
  changed_by uuid,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view status history" ON public.application_status_history
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert status history" ON public.application_status_history
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Trigger to auto-track status changes
CREATE OR REPLACE FUNCTION public.track_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.application_status_history (application_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_status_change
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.track_application_status_change();

-- 5. Email logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template_key text,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  resend_id text,
  error_message text,
  related_record_id uuid,
  related_table text
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs" ON public.email_logs
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- 6. Webhooks table
CREATE TABLE public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_triggered_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhooks" ON public.webhooks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for status history lookups
CREATE INDEX IF NOT EXISTS idx_status_history_app ON public.application_status_history(application_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent ON public.email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON public.email_logs(template_key);
