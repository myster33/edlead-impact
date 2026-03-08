-- Create table for school 2FA email codes
CREATE TABLE public.school_2fa_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.school_2fa_codes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own codes
CREATE POLICY "Users can manage own 2fa codes"
ON public.school_2fa_codes FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add 2fa_enabled column to school_users
ALTER TABLE public.school_users ADD COLUMN IF NOT EXISTS two_fa_enabled boolean NOT NULL DEFAULT false;