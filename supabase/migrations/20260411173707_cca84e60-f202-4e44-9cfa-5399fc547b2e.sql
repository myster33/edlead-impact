
-- Add square banner URL column
ALTER TABLE public.events ADD COLUMN banner_square_url text;

-- Create storage bucket for event banners
INSERT INTO storage.buckets (id, name, public) VALUES ('event-banners', 'event-banners', true);

-- Storage policies
CREATE POLICY "Anyone can view event banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-banners');

CREATE POLICY "Admins can upload event banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-banners' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update event banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-banners' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete event banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-banners' AND is_admin(auth.uid()));
