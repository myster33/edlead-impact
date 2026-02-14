
-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.admin_notifications
FOR SELECT
USING (admin_user_id IN (
  SELECT id FROM admin_users WHERE user_id = auth.uid()
));

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.admin_notifications
FOR UPDATE
USING (admin_user_id IN (
  SELECT id FROM admin_users WHERE user_id = auth.uid()
));

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.admin_notifications
FOR DELETE
USING (admin_user_id IN (
  SELECT id FROM admin_users WHERE user_id = auth.uid()
));

-- System can insert notifications (any admin context)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Trigger function: notify all admins on new application
CREATE OR REPLACE FUNCTION public.notify_admins_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (admin_user_id, type, title, message, link)
  SELECT id, 'new_application', 'New Application',
    'New application from ' || NEW.full_name || ' (' || NEW.school_name || ')',
    '/admin/applications'
  FROM public.admin_users;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_application_notify
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_application();

-- Trigger function: notify all admins on new blog submission
CREATE OR REPLACE FUNCTION public.notify_admins_new_blog()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.admin_notifications (admin_user_id, type, title, message, link)
    SELECT id, 'blog_submission', 'New Story Submission',
      'New story "' || NEW.title || '" submitted by ' || NEW.author_name,
      '/admin/blog'
    FROM public.admin_users;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_blog_notify
AFTER INSERT ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_blog();
