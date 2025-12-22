-- Add is_featured column to blog_posts
ALTER TABLE public.blog_posts 
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create index for faster featured post queries
CREATE INDEX idx_blog_posts_featured ON public.blog_posts (is_featured, approved_at DESC) WHERE status = 'approved';