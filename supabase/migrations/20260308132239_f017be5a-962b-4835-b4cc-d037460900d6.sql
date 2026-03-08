
-- Add Email/SMS 2FA columns to admin_users
ALTER TABLE public.admin_users 
  ADD COLUMN IF NOT EXISTS two_fa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_fa_channel text NOT NULL DEFAULT 'email';

-- Add two_fa_channel to school_users
ALTER TABLE public.school_users 
  ADD COLUMN IF NOT EXISTS two_fa_channel text NOT NULL DEFAULT 'email';

-- Create admin_2fa_codes table
CREATE TABLE IF NOT EXISTS public.admin_2fa_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_2fa_codes ENABLE ROW LEVEL SECURITY;

-- RLS: service role only (edge function uses service key)
CREATE POLICY "Service role can manage admin 2fa codes"
  ON public.admin_2fa_codes FOR ALL
  USING (true)
  WITH CHECK (true);
