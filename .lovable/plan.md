

# Session Activity and Login History + New Proposals

## Feature: Session Activity and Login History

Add a new "Activity" tab to Admin Settings that shows login history with metadata (timestamp, IP, browser/device) and lets admins see their recent sign-in activity.

### Database Changes

Create a new `admin_login_history` table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| admin_user_id | uuid | References admin_users(id) |
| logged_in_at | timestamptz | Defaults to now() |
| ip_address | text | Nullable, captured from request headers |
| user_agent | text | Nullable, raw browser user-agent string |
| device_label | text | Nullable, parsed summary like "Chrome on Windows" |

RLS policies will restrict each admin to viewing only their own login history.

Realtime is not needed for this table.

### Login Tracking

Modify `AdminAuthContext.tsx` to insert a row into `admin_login_history` after a successful `signIn` call, capturing:
- `admin_user_id` from the matched admin_users record
- `user_agent` from `navigator.userAgent`
- `device_label` parsed from the user-agent string (a simple helper to extract browser + OS)
- IP address will be left null on the client side (would require a server call to determine)

### New "Activity" Tab in Settings

Add a third tab to the Settings page called "Activity" (with a `History` icon). It will show:
- A table of the last 50 login events for the current admin
- Columns: Date/Time (formatted with `date-fns`), Device/Browser, IP Address (or "N/A")
- Most recent logins at the top
- A simple empty state if no history exists yet

### Files to Create
| File | Purpose |
|------|---------|
| (migration) | Create `admin_login_history` table with RLS |

### Files to Modify
| File | Changes |
|------|---------|
| `src/contexts/AdminAuthContext.tsx` | Insert login history row after successful sign-in; add user-agent parsing helper |
| `src/pages/admin/AdminSettings.tsx` | Add "Activity" tab with login history table |

---

## Other Upgrade Proposals

Here are fresh ideas beyond the 5 already discussed:

1. **Global Search Across Data** -- A search bar in the header that searches across applications, blog posts, admin users, and audit logs, showing grouped results with direct links.

2. **Admin Dashboard Announcements / Pinned Notes** -- Let admins pin a short announcement or note to the top of the dashboard visible to all admin users (useful for "cohort closes Friday" type notices).

3. **Application Kanban Board View** -- An alternative drag-and-drop Kanban view for Applications (columns: Pending, Under Review, Approved, Rejected) alongside the existing table view.

4. **Scheduled Reports / Auto-Export** -- Let admins schedule weekly or monthly CSV exports of application data or analytics to be emailed automatically.

5. **Admin User Online Presence Indicators** -- Show green/grey dots next to admin names in the sidebar footer and chat to indicate who is currently online.
