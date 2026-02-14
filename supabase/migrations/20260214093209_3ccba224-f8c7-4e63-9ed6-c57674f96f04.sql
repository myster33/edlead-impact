
-- Add new columns to blog_posts for Phase 3
ALTER TABLE public.blog_posts
ADD COLUMN tags text[] DEFAULT NULL,
ADD COLUMN meta_description text DEFAULT NULL,
ADD COLUMN reading_time_minutes integer DEFAULT NULL;
