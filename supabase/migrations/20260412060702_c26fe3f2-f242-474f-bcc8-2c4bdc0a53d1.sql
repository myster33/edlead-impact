
CREATE TABLE public.event_partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Organised by',
  name text NOT NULL,
  website text,
  logo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event partners"
ON public.event_partners
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage event partners"
ON public.event_partners
FOR ALL
USING (is_admin(auth.uid()));
