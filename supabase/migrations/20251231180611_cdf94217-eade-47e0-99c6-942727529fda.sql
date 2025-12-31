-- Add country column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN author_country text DEFAULT 'South Africa';

-- Update existing posts to have the default country
UPDATE public.blog_posts 
SET author_country = 'South Africa' 
WHERE author_country IS NULL;