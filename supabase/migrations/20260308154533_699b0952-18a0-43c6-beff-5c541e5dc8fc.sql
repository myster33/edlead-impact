
-- Update the generate_user_code function to use ED prefix instead of EDL-
CREATE OR REPLACE FUNCTION public.generate_user_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := 'ED' || lpad(floor(random() * 1000000)::text, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.school_users WHERE user_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$function$;

-- Update all existing user codes from EDL-XXXXXX to EDXXXXXX
UPDATE public.school_users 
SET user_code = 'ED' || REPLACE(SUBSTRING(user_code FROM 5), '-', '')
WHERE user_code LIKE 'EDL-%';
