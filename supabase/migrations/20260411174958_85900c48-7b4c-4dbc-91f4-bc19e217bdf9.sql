
CREATE TABLE public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.event_bookings(id) ON DELETE SET NULL,
  attendee_name text NOT NULL,
  ticket_number text NOT NULL UNIQUE,
  phone text,
  checked_in_at timestamp with time zone NOT NULL DEFAULT now(),
  notification_sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage attendance"
ON public.event_attendance FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view attendance by ticket"
ON public.event_attendance FOR SELECT
USING (true);

-- Function to auto-generate ticket numbers like EVT-000001
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS integer)), 0) + 1
  INTO next_num
  FROM public.event_attendance;
  
  NEW.ticket_number := 'EVT-' || lpad(next_num::text, 6, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
BEFORE INSERT ON public.event_attendance
FOR EACH ROW
WHEN (NEW.ticket_number IS NULL OR NEW.ticket_number = '')
EXECUTE FUNCTION public.generate_ticket_number();
