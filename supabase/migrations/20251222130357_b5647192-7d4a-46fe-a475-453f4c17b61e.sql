-- Create blog_posts table for leader stories
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_school TEXT NOT NULL,
  author_province TEXT NOT NULL,
  author_email TEXT NOT NULL,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  slug TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a blog post
CREATE POLICY "Anyone can submit blog posts"
ON public.blog_posts
FOR INSERT
WITH CHECK (true);

-- Anyone can view approved blog posts
CREATE POLICY "Anyone can view approved blog posts"
ON public.blog_posts
FOR SELECT
USING (status = 'approved' OR is_admin(auth.uid()));

-- Only admins/reviewers can update blog posts
CREATE POLICY "Admins and reviewers can update blog posts"
ON public.blog_posts
FOR UPDATE
USING (has_role(auth.uid(), 'reviewer') OR has_role(auth.uid(), 'admin'));

-- Only admins can delete blog posts
CREATE POLICY "Only admins can delete blog posts"
ON public.blog_posts
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_blog_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  new_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title
  base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  new_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM public.blog_posts WHERE slug = new_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    new_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := new_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate slug
CREATE TRIGGER generate_blog_slug_trigger
BEFORE INSERT OR UPDATE OF title ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.generate_blog_slug();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_blog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_blog_updated_at();