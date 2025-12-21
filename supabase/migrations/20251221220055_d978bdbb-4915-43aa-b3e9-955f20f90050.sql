-- Add reference_number column to applications table
ALTER TABLE public.applications 
ADD COLUMN reference_number TEXT UNIQUE;

-- Create index for faster lookups by reference
CREATE INDEX idx_applications_reference_number ON public.applications(reference_number);

-- Update existing applications with reference numbers based on their IDs
UPDATE public.applications 
SET reference_number = UPPER(LEFT(id::text, 8))
WHERE reference_number IS NULL;