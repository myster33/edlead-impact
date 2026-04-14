

## Plan: Add Counts to Tab Labels and Fix current_bookings Sync

### Problem
1. The tab labels "Bookings" and "Attendance" show no counts
2. The `current_bookings` field on the events table is out of sync -- the event "2026 STUDENT LEADERSHIP MASTERCLASS" has `current_bookings = 1` but actually has 6 confirmed bookings (26 total). This means "spots remaining" on the public page is wrong (shows 299 instead of 294)

### Changes

**1. AdminEvents.tsx -- Add dynamic counts to tab labels**
- Query total bookings count, total attendance count, checked-in count, and checked-out count
- Display: `Bookings (26)`, `Attendance (6 | In: 0 | Out: 0)`
- Also show events count on the Events tab

**2. Fix current_bookings sync**
- Run a one-time data update to set `current_bookings` to the actual count of confirmed bookings for each event
- The value should equal the number of bookings with `status = 'confirmed'` (currently 6 confirmed out of 26 total)

**3. Ensure future sync**
- In `AdminEventBookingsTab.tsx`, after every status change mutation, also update the event's `current_bookings` by counting confirmed bookings for that event

### Technical Details

**File: `src/pages/admin/AdminEvents.tsx`**
- Add queries for booking count, attendance stats
- Update TabsTrigger labels with counts

**File: `src/components/admin/events/AdminEventBookingsTab.tsx`**
- After each status change (single or bulk), recalculate and update `events.current_bookings` with a count of confirmed bookings

**Data fix (one-time migration or insert tool)**
- Update `events` SET `current_bookings` = (SELECT count from event_bookings WHERE status='confirmed' AND event_id matches) for the affected event

