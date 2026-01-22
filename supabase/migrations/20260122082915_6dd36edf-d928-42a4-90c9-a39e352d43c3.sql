-- Add tracking columns to certificate_recipients
ALTER TABLE public.certificate_recipients
ADD COLUMN IF NOT EXISTS email_opened boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS open_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS certificate_downloaded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_downloaded_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tracking_id uuid DEFAULT gen_random_uuid();

-- Add design settings columns to certificate_templates
ALTER TABLE public.certificate_templates
ADD COLUMN IF NOT EXISTS design_settings jsonb DEFAULT '{
  "primaryColor": "#ED7621",
  "secondaryColor": "#4A4A4A",
  "backgroundColor": "#FFFFFF",
  "sidebarColor": "#595959",
  "textColor": "#4A4A4A",
  "accentColor": "#ED7621",
  "layout": "modern",
  "showSeal": true,
  "showChevrons": true,
  "showDiagonalLines": true,
  "signatureStyle": "line",
  "fontStyle": "classic"
}'::jsonb;

-- Create index on tracking_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_certificate_recipients_tracking_id 
ON public.certificate_recipients(tracking_id);

-- Update RLS to allow public access to tracking endpoint
CREATE POLICY "Public can update tracking via tracking_id" 
ON public.certificate_recipients 
FOR UPDATE 
USING (true)
WITH CHECK (true);