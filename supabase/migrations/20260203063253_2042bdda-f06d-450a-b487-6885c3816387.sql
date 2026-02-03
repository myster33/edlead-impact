-- Create storage bucket for applicant photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('applicant-photos', 'applicant-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view applicant photos (needed for email display)
CREATE POLICY "Applicant photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'applicant-photos');

-- Allow anonymous uploads to applicant-photos bucket (for application form)
CREATE POLICY "Anyone can upload applicant photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'applicant-photos');