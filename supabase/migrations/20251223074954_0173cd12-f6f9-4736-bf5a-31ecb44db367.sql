-- Add profile picture column to admin_users
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Create storage bucket for admin profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-avatars', 'admin-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Admins can upload their avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'admin-avatars' 
  AND is_admin(auth.uid())
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Admins can update their avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'admin-avatars' 
  AND is_admin(auth.uid())
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Admins can delete their avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'admin-avatars' 
  AND is_admin(auth.uid())
);

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view admin avatars"
ON storage.objects
FOR SELECT
USING (bucket_id = 'admin-avatars');