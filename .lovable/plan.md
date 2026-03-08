

## Plan: Backend Upgrades (7 items)

Implementing rate limiting, database indexes, soft deletes, application status history, automated cleanup, email delivery tracking, and external webhooks.

---

### 1. Rate Limiting on Public Endpoints

**Database migration:** Create a `rate_limits` table with columns: `id` (uuid), `ip_address` (text), `endpoint` (text), `request_count` (int), `window_start` (timestamptz). Add a `check_rate_limit` security definer function that increments/resets counts per IP+endpoint within a time window. No RLS needed (accessed only via security definer function).

**Edge functions to modify:** Add rate limit checks at the top of:
- `submit-application/index.ts` — 5 requests/hour
- `send-contact/index.ts` — 10 requests/hour
- `chat-ai-faq/index.ts` — 30 requests/minute
- `chat-apply/index.ts` — 20 requests/minute
- `chat-story-submit/index.ts` — 10 requests/hour

Each function extracts the client IP from headers and calls the rate limit check before proceeding.

---

### 2. Database Indexes for Performance

**Database migration:** Add indexes on:
- `applications(status, created_at)`
- `blog_posts(status, created_at)`
- `chat_conversations(session_id)`
- `chat_messages(conversation_id, created_at)`
- `admin_audit_log(admin_user_id, created_at)`
- `newsletter_subscribers(email)`
- `blog_likes(blog_post_id)`
- `blog_comments(blog_post_id)`
- `admin_notifications(admin_user_id, is_read)`

---

### 3. Soft Delete for Applications and Blog Posts

**Database migration:**
- Add `deleted_at` (timestamptz, nullable, default null) column to `applications` and `blog_posts`
- Update existing RLS SELECT policies to add `AND deleted_at IS NULL` for non-admin users
- Add admin-only policies that can see soft-deleted records

**Files to modify:**
- `src/pages/admin/AdminApplications.tsx` — Add "Trash" tab showing soft-deleted applications, with restore/permanent-delete actions
- `src/pages/admin/AdminBlogManagement.tsx` — Add "Trash" tab with restore/purge actions
- `src/hooks/use-audit-log.ts` — Add `application_restored`, `application_purged`, `blog_restored`, `blog_purged` audit actions

---

### 4. Application Status Change History

**Database migration:**
- Create `application_status_history` table: `id` (uuid), `application_id` (uuid), `old_status` (text), `new_status` (text), `changed_by` (uuid, nullable), `reason` (text, nullable), `changed_at` (timestamptz, default now())
- Create a trigger function `track_application_status_change()` on `applications` that fires BEFORE UPDATE when `OLD.status != NEW.status`, inserting a row into the history table
- RLS: admin-only SELECT and INSERT

**Files to modify:**
- `src/components/admin/ApplicationDetailView.tsx` — Add a "Status History" section showing the timeline of status changes
- `src/components/admin/ApplicationTimeline.tsx` — Enhance to pull from the new history table

---

### 5. Automated Data Cleanup

**Edge function to create:** `cleanup-stale-data/index.ts`
- Archive/delete chat conversations older than 90 days
- Remove expired dashboard announcements (where `expires_at < now()`)
- Compress audit log entries older than 1 year (aggregate into summary rows)
- Returns a summary of what was cleaned

**Files to modify:**
- `src/pages/admin/AdminSettings.tsx` — Add a "Run Cleanup" button in settings that invokes the function manually
- `supabase/config.toml` — Add the function config with `verify_jwt = false`

---

### 6. Email Delivery Tracking

**Database migration:** Create `email_logs` table: `id` (uuid), `recipient_email` (text), `template_key` (text, nullable), `subject` (text), `status` (text, default 'sent'), `sent_at` (timestamptz, default now()), `resend_id` (text, nullable), `error_message` (text, nullable), `related_record_id` (uuid, nullable), `related_table` (text, nullable). RLS: admin-only SELECT and INSERT.

**Edge functions to modify:** Update all notification functions that use Resend to log sends into `email_logs`:
- `notify-applicant-approved`, `notify-applicant-rejected`, `notify-applicant-status-change`
- `notify-author-approval`, `notify-author-rejection`, `notify-author-submission`
- `notify-blog-submission`, `notify-admin-approval`, `notify-reviewer-assignment`
- `send-certificate`, `send-contact`, `send-critical-alert`
- `send-audit-digest`, `send-performance-report`, `send-scheduled-report`

**Files to create:**
- `src/pages/admin/AdminEmailLogs.tsx` — New admin page showing email delivery history with filtering by status, template, and date range

**Files to modify:**
- `src/components/admin/AdminLayout.tsx` — Add "Email Logs" navigation item
- `src/App.tsx` — Add route for the email logs page

---

### 7. External Webhooks

**Database migration:** Create `webhooks` table: `id` (uuid), `url` (text), `events` (text array), `secret` (text), `is_active` (boolean, default true), `created_at` (timestamptz), `last_triggered_at` (timestamptz, nullable), `failure_count` (int, default 0). RLS: admin-only all operations.

**Edge function to create:** `fire-webhook/index.ts` — Accepts event type and payload, queries active webhooks subscribed to that event, sends POST with HMAC-signed payload, updates `last_triggered_at`. Includes retry logic.

**Edge functions to modify:** Add webhook firing after key events in:
- `submit-application/index.ts` — `application.created` event
- Application status change trigger — `application.status_changed` event

**Files to create:**
- `src/pages/admin/AdminWebhooks.tsx` — Admin page to manage webhook endpoints (add, edit, delete, test)

**Files to modify:**
- `src/components/admin/AdminLayout.tsx` — Add "Webhooks" navigation item
- `src/App.tsx` — Add route for webhooks page

---

### Technical Notes
- Rate limiting uses a database function (security definer) to avoid RLS complexity
- Soft delete modifies existing RLS policies — careful migration ordering required
- Status history trigger runs as security definer to bypass RLS on insert
- Email logging is added alongside existing Resend calls, not replacing them
- Webhook secrets are generated server-side and used for HMAC-SHA256 signature verification
- All new admin pages follow existing patterns: `AdminLayout` wrapper, table with filters, permission checks via `ProtectedRoute`

