
-- Add short_code column
ALTER TABLE public.events ADD COLUMN short_code text UNIQUE;

-- Create function to auto-generate short codes
CREATE OR REPLACE FUNCTION public.generate_event_short_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  IF NEW.short_code IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(short_code FROM 3) AS integer)), 0) + 1
    INTO next_num
    FROM public.events
    WHERE short_code ~ '^ed[0-9]+$';
    
    NEW.short_code := 'ed' || lpad(next_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER auto_generate_event_short_code
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.generate_event_short_code();

-- Backfill existing events
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.events
  WHERE short_code IS NULL
)
UPDATE public.events e
SET short_code = 'ed' || lpad(n.rn::text, 4, '0')
FROM numbered n
WHERE e.id = n.id;
