-- Add reference_number column to blog_posts table
ALTER TABLE public.blog_posts ADD COLUMN reference_number text;

-- Create blog_likes table for tracking likes
CREATE TABLE public.blog_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_post_id, session_id)
);

-- Create blog_comments table for comments
CREATE TABLE public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_approved BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on new tables
ALTER TABLE public.blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_likes - anyone can like
CREATE POLICY "Anyone can insert likes" ON public.blog_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view likes" ON public.blog_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can delete their own likes" ON public.blog_likes FOR DELETE USING (true);

-- RLS policies for blog_comments
CREATE POLICY "Anyone can submit comments" ON public.blog_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view approved comments or admins view all" ON public.blog_comments FOR SELECT USING ((is_approved = true) OR is_admin(auth.uid()));
CREATE POLICY "Admins can update comments" ON public.blog_comments FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete comments" ON public.blog_comments FOR DELETE USING (is_admin(auth.uid()));