
ALTER TABLE public.events ADD COLUMN price numeric DEFAULT NULL;
ALTER TABLE public.events ADD COLUMN price_inclusions text[] DEFAULT '{}';
