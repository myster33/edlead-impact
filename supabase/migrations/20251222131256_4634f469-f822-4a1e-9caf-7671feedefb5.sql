-- Add category column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN category TEXT NOT NULL DEFAULT 'Leadership' 
CHECK (category IN ('Leadership', 'Impact Stories', 'Personal Growth', 'Academic Excellence', 'Community Projects', 'Tips & Advice'));