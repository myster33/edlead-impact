
-- Create enums
CREATE TYPE public.event_category AS ENUM ('concurrent', 'once_off');
CREATE TYPE public.event_status AS ENUM ('open', 'closed');
CREATE TYPE public.booker_type AS ENUM ('school', 'student', 'parent');
CREATE TYPE public.booking_extra_type AS ENUM ('teacher', 'child');

-- 1. Events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  event_end_date TIMESTAMP WITH TIME ZONE,
  category event_category NOT NULL DEFAULT 'once_off',
  status event_status NOT NULL DEFAULT 'open',
  max_capacity INTEGER,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open events"
  ON public.events FOR SELECT
  USING (status = 'open' OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Event bookings table
CREATE TABLE public.event_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  booker_type booker_type NOT NULL,
  school_name TEXT,
  school_email TEXT,
  school_phone TEXT,
  contact_teacher_name TEXT,
  contact_teacher_email TEXT,
  contact_teacher_phone TEXT,
  student_name TEXT,
  student_email TEXT,
  student_phone TEXT,
  student_school_name TEXT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  number_of_attendees INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create bookings"
  ON public.event_bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage bookings"
  ON public.event_bookings FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view their booking by reference"
  ON public.event_bookings FOR SELECT
  USING (is_admin(auth.uid()));

-- 3. Event booking extras table
CREATE TABLE public.event_booking_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.event_bookings(id) ON DELETE CASCADE,
  type booking_extra_type NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  grade TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_booking_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create booking extras"
  ON public.event_booking_extras FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can manage booking extras"
  ON public.event_booking_extras FOR ALL
  USING (is_admin(auth.uid()));

-- Enable realtime on event_bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_bookings;
