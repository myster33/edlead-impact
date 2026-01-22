-- Create storage bucket for certificate backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-backgrounds', 'certificate-backgrounds', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to certificate backgrounds
CREATE POLICY "Public can view certificate backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificate-backgrounds');

-- Allow authenticated admin users to upload certificate backgrounds  
CREATE POLICY "Admins can upload certificate backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificate-backgrounds' 
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated admin users to update certificate backgrounds
CREATE POLICY "Admins can update certificate backgrounds"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'certificate-backgrounds'
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow authenticated admin users to delete certificate backgrounds
CREATE POLICY "Admins can delete certificate backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'certificate-backgrounds'
  AND EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);