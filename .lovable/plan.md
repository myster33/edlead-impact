

## Events Management System

### Overview
Build a full events module: admin creates/manages events, public events page for browsing, and a dynamic booking form that adapts based on who is reserving (School, Student, or Parent).

### Database Tables (3 new tables via migrations)

**1. `events`** — Admin-managed event listings
- `id`, `title`, `description`, `image_url`, `location`, `event_date` (nullable for concurrent), `event_end_date`, `category` (enum: `concurrent` | `once_off`), `status` (enum: `open` | `closed`), `max_capacity`, `current_bookings` (default 0), `created_by` (uuid), `created_at`, `updated_at`
- RLS: public can SELECT open events, admins can ALL

**2. `event_bookings`** — Booking header
- `id`, `event_id`, `booker_type` (enum: `school` | `student` | `parent`), `school_name`, `school_email`, `school_phone`, `contact_teacher_name`, `contact_teacher_email`, `contact_teacher_phone`, `student_name`, `student_email`, `student_phone`, `student_school_name`, `parent_name`, `parent_email`, `parent_phone`, `number_of_attendees`, `status` (default `pending`), `notes`, `reference_number`, `created_at`
- RLS: anyone can INSERT, admins can ALL

**3. `event_booking_extras`** — Additional teachers (for school) or additional children (for parent)
- `id`, `booking_id`, `type` (enum: `teacher` | `child`), `full_name`, `email`, `phone`, `grade` (nullable, for children), `created_at`
- RLS: anyone can INSERT, admins can ALL

### Admin Module

**File: `src/pages/admin/AdminEvents.tsx`**
- Tabs: Events List | Bookings
- Events List: table of all events with create/edit/close actions
- Create/Edit dialog: title, description, category (concurrent/once-off), date fields, capacity, image upload, status toggle
- Bookings tab: table of all bookings across events with status management

**File: `src/components/admin/events/AdminEventsTab.tsx`** and `AdminEventBookingsTab.tsx`

### Public Events Page

**File: `src/pages/Events.tsx`**
- Grid/list of open events with category filter (Concurrent / Once-Off)
- Each event card shows title, description, date, location, capacity remaining
- "Book Now" button opens booking flow

### Booking Flow

**File: `src/pages/EventBooking.tsx`** (route: `/events/:eventId/book`)
- Step 1: Select booker type (School / Student / Parent)
- Step 2: Dynamic form based on selection:
  - **School**: School name, email, phone, contact teacher details, "Add Another Teacher" button
  - **Student**: Select school (from `schools` table), student name, email, phone
  - **Parent**: Parent name, email, phone, child details (name, grade), "Add Another Child" button
- Step 3: Review and submit
- Generates a reference number on submission

### Routing & Navigation

- Add `/events` and `/events/:eventId/book` public routes in `App.tsx`
- Add "Events" link in footer under Community
- Add `/admin/events` route with `ProtectedRoute moduleKey="events"`
- Add "Events" nav item in `AdminLayout.tsx` sidebar

### Files to Create
1. `src/pages/Events.tsx` — public events listing
2. `src/pages/EventBooking.tsx` — public booking form
3. `src/pages/admin/AdminEvents.tsx` — admin events management
4. `src/components/admin/events/AdminEventsTab.tsx` — events CRUD
5. `src/components/admin/events/AdminEventBookingsTab.tsx` — bookings management
6. `src/components/events/EventCard.tsx` — event card component
7. `src/components/events/BookingForm.tsx` — dynamic booking form

### Files to Modify
1. `src/App.tsx` — add routes
2. `src/components/layout/Footer.tsx` — add "Events" under Community
3. `src/components/admin/AdminLayout.tsx` — add sidebar item

### Migration
One migration creating the 3 tables, RLS policies, and enabling realtime on `event_bookings`.

