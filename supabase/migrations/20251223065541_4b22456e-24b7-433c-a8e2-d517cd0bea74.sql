-- Add video_url column to blog_posts table for optional story video links
ALTER TABLE public.blog_posts 
ADD COLUMN video_url TEXT;