
-- Add id_passport_number to portal_registration_requests
ALTER TABLE public.portal_registration_requests ADD COLUMN IF NOT EXISTS id_passport_number text;

-- Add user_code and id_passport_number to school_users
ALTER TABLE public.school_users ADD COLUMN IF NOT EXISTS user_code text UNIQUE;
ALTER TABLE public.school_users ADD COLUMN IF NOT EXISTS id_passport_number text;

-- Add mutual approval columns to parent_link_requests
ALTER TABLE public.parent_link_requests ADD COLUMN IF NOT EXISTS parent_approved boolean DEFAULT false;
ALTER TABLE public.parent_link_requests ADD COLUMN IF NOT EXISTS student_approved boolean DEFAULT false;

-- Function to generate unique user code
CREATE OR REPLACE FUNCTION public.generate_user_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'EDL-' || lpad(floor(random() * 1000000)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.school_users WHERE user_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Auto-generate user_code on school_users insert
CREATE OR REPLACE FUNCTION public.auto_generate_user_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_code IS NULL THEN
    NEW.user_code := public.generate_user_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_user_code
  BEFORE INSERT ON public.school_users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_user_code();
