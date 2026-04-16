ALTER TABLE public.events
ADD COLUMN program_url text DEFAULT NULL,
ADD COLUMN show_program boolean NOT NULL DEFAULT false;