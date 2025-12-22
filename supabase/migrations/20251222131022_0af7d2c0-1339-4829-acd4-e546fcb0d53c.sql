-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true);

-- Allow anyone to upload blog images
CREATE POLICY "Anyone can upload blog images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'blog-images');

-- Allow anyone to view blog images (public bucket)
CREATE POLICY "Anyone can view blog images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');

-- Allow admins to delete blog images
CREATE POLICY "Admins can delete blog images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'blog-images' AND public.is_admin(auth.uid()));

-- Allow admins to update blog images
CREATE POLICY "Admins can update blog images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'blog-images' AND public.is_admin(auth.uid()));