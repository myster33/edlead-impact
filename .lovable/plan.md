

# Platform Enhancement Plan

This plan covers four major improvements to the edLEAD platform, delivered in phases.

---

## Phase 1: Enhanced Dashboard Analytics

**What it does:** Adds richer visualizations to the admin dashboard and analytics page, including demographic breakdowns (gender, age), conversion funnels (pending to approved/rejected over time), and trend comparisons.

### Changes:
- **AdminAnalytics.tsx** -- Add new chart sections:
  - Gender distribution pie chart (using existing `gender` field from applications)
  - Age distribution bar chart (calculated from `date_of_birth`)
  - Conversion funnel visualization showing pending → approved/rejected rates over time
  - Month-over-month trend comparison line chart
  - School-level breakdown table (top schools by application count)
- **AdminDashboard.tsx** -- Add a quick "trends" card showing week-over-week change percentages for total, pending, approved, rejected counts

---

## Phase 2: Admin Notification Center

**What it does:** Adds a real-time in-app notification bell in the admin header, showing alerts for new applications, blog submissions, status changes, and system events -- beyond just chat messages.

### Database Changes:
- Create `admin_notifications` table:
  - `id` (uuid, primary key)
  - `admin_user_id` (uuid, references admin_users)
  - `type` (text -- e.g., "new_application", "blog_submission", "status_change", "system")
  - `title` (text)
  - `message` (text)
  - `link` (text, nullable -- URL to navigate to)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz, default now())
- Add RLS policies for admin access
- Enable realtime on the table
- Create a database trigger/function to auto-generate notifications when:
  - A new application is inserted
  - A blog post is submitted (status = 'pending')

### Frontend Changes:
- **New component: `NotificationBell.tsx`** -- Bell icon with unread count badge in the admin header, with a dropdown popover listing recent notifications
- **New component: `NotificationList.tsx`** -- Scrollable list of notifications with mark-as-read, mark-all-read, and click-to-navigate functionality
- **AdminLayout.tsx** -- Add the NotificationBell to the header bar (next to the existing chat icon and theme toggle)
- Subscribe to realtime inserts on `admin_notifications` for live updates

---

## Phase 3: Blog System Improvements

**What it does:** Enhances the public blog with tags/keywords, better SEO metadata, and a richer editing experience for admins.

### Database Changes:
- Add columns to `blog_posts` table:
  - `tags` (text array, nullable) -- for keyword tagging
  - `meta_description` (text, nullable) -- SEO meta description
  - `reading_time_minutes` (integer, nullable) -- estimated reading time

### Frontend Changes:
- **Blog.tsx** -- Add tag-based filtering alongside category filtering; display reading time on cards
- **BlogCard.tsx** -- Show reading time estimate and tags
- **BlogPost.tsx** -- Display tags as clickable badges, add proper SEO meta tags using react-helmet
- **AdminBlogManagement.tsx** -- Add fields in the edit dialog for tags (comma-separated input), meta description, and auto-calculated reading time
- **StorySubmissionForm.tsx** -- Add optional tags input for authors

---

## Phase 4: Reporting and Data Export

**What it does:** Lets admins generate and download comprehensive PDF and Excel-style (CSV) reports on applications, cohort statistics, and blog activity.

### Frontend Changes:
- **New page: `AdminReports.tsx`** -- A dedicated reports page with:
  - Application summary report (filterable by date range, province, status, cohort)
  - Cohort comparison report
  - Blog activity report (submissions, approvals, rejections over time)
  - Each report has "Download PDF" and "Download CSV" buttons
- **App.tsx** -- Add route `/admin/reports` with ProtectedRoute
- **AdminLayout.tsx** -- Add "Reports" menu item with `FileBarChart` icon
- **Database module_permissions** -- Insert a new permission entry for the "reports" module
- Uses existing `jspdf` and `jspdf-autotable` dependencies (already installed) for PDF generation
- CSV export using the same pattern already used in the reviewer activity export on the dashboard

---

## Technical Details

### Implementation Order
1. Phase 1 (Analytics) -- No database changes needed, uses existing data
2. Phase 2 (Notifications) -- Requires new table + triggers + new components
3. Phase 3 (Blog improvements) -- Requires schema additions + frontend updates
4. Phase 4 (Reports) -- New page + route, no database changes

### Existing Patterns Followed
- All new admin pages use `AdminLayout` wrapper
- All routes use `ProtectedRoute` with `moduleKey`
- Charts use `recharts` (already installed)
- PDF export uses `jspdf` + `jspdf-autotable` (already installed)
- Realtime subscriptions follow the pattern in `AdminLayout.tsx`
- RLS policies follow the existing `admin_users` auth pattern

