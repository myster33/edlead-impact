-- Create table for storing backup codes (hashed)
CREATE TABLE public.admin_backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_backup_codes ENABLE ROW LEVEL SECURITY;

-- Policies: admins can only manage their own backup codes
CREATE POLICY "Users can view their own backup codes"
ON public.admin_backup_codes
FOR SELECT
USING (
  admin_user_id IN (
    SELECT id FROM public.admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own backup codes"
ON public.admin_backup_codes
FOR INSERT
WITH CHECK (
  admin_user_id IN (
    SELECT id FROM public.admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own backup codes"
ON public.admin_backup_codes
FOR UPDATE
USING (
  admin_user_id IN (
    SELECT id FROM public.admin_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own backup codes"
ON public.admin_backup_codes
FOR DELETE
USING (
  admin_user_id IN (
    SELECT id FROM public.admin_users WHERE user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_backup_codes_admin_user ON public.admin_backup_codes(admin_user_id);