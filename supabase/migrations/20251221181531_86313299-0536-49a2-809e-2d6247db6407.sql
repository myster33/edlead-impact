-- Add country column to applications table
ALTER TABLE public.applications 
ADD COLUMN country text NOT NULL DEFAULT 'South Africa';