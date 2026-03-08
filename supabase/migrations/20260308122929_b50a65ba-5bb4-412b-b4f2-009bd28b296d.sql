-- Create school-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true);

-- Allow school users to upload to school-assets bucket
CREATE POLICY "School users can upload assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'school-assets'
  AND auth.uid() IS NOT NULL
);

-- Allow school users to update their uploads
CREATE POLICY "School users can update assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'school-assets'
  AND auth.uid() IS NOT NULL
);

-- Allow school users to delete their uploads
CREATE POLICY "School users can delete assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'school-assets'
  AND auth.uid() IS NOT NULL
);

-- Anyone can view school assets (public bucket)
CREATE POLICY "Anyone can view school assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

-- Allow school staff to update their school's logo
CREATE POLICY "School staff can update their school"
ON public.schools FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.school_users
    WHERE school_users.user_id = auth.uid()
    AND school_users.school_id = schools.id
    AND school_users.role IN ('school_admin', 'hr')
    AND school_users.is_active = true
  )
);