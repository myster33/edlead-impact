-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can update tracking via tracking_id" ON public.certificate_recipients;

-- Create a more restrictive policy that only allows updating tracking fields
-- This is implemented via edge function with service role key instead