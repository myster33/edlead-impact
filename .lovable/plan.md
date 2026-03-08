

# Misconduct Reports Module

## Overview
Replace the placeholder "Reports" pages in both School Portal and General Portal with a full **Misconduct Reporting** system. Students, parents, and educators can submit reports (anonymously or identified). School admins review, assign, and escalate. Includes an emergency panic button and a trending reports feed.

## Database Changes

### 1. New table: `misconduct_reports`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| school_id | uuid | FK → schools, nullable (outside-school reports) |
| reporter_user_id | uuid | nullable (anonymous) |
| reporter_role | text | student/educator/parent/guest |
| reporter_name | text | nullable |
| is_anonymous | boolean | default false |
| victim_names | text | comma-separated or free text |
| report_type | text | bullying/harassment/violence/theft/substance/vandalism/emergency/other |
| description | text | required |
| attachment_urls | text[] | array of storage URLs |
| location | text | nullable, free text or geo coords |
| priority | text | low/medium/high/critical |
| status | text | pending/under_review/resolved/escalated/dismissed |
| assigned_to | uuid | FK → school_users, nullable |
| resolved_at | timestamptz | nullable |
| resolution_notes | text | nullable |
| is_emergency | boolean | default false |
| is_trending | boolean | default false (admin-published to feed) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS:
- Anyone can INSERT (public submission including anonymous)
- School staff can SELECT/UPDATE for their school_id
- Reporter can SELECT own reports (by reporter_user_id)
- Main admins can manage all

### 2. New table: `misconduct_report_audit`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| report_id | uuid | FK → misconduct_reports |
| user_id | uuid | nullable |
| action | text | created/assigned/status_changed/escalated/resolved/commented |
| details | jsonb | |
| created_at | timestamptz | |

RLS: School staff + main admins can SELECT. Insert via triggers/app.

### Storage
Use existing `school-assets` bucket for report attachments (max 10MB per file, max 3 files).

## Implementation Plan

### Step 1: Database migration
- Create `misconduct_reports` and `misconduct_report_audit` tables with RLS
- Enable realtime on `misconduct_reports` for live status updates

### Step 2: School Portal — SchoolReports.tsx (admin view)
Rebuild as a tabbed interface:
- **Reports tab**: Table of all misconduct reports for the school, filterable by status/priority/type. Click to expand detail view with timeline (audit log). Actions: assign, change status, add resolution notes, mark as trending.
- **Trending tab**: Manage which resolved reports are published to the trending feed.

Rename sidebar item from "Reports" to "Misconduct reports" with `AlertTriangle` icon.

### Step 3: Portal — PortalReports.tsx (student/parent/educator view)
Rebuild as:
- **Submit report** form: report type, description, attachments, anonymous toggle, emergency/panic button
- **My reports** tab: View own submitted reports and their status
- **Trending feed** tab: View school-published trending reports (anonymized)

Rename sidebar item from "Reports" to "Misconduct reports" in PortalLayout for all roles that have it. Add it to student and parent menus too (currently only educator/class_teacher have "Reports").

### Step 4: Emergency Panic Button
- Prominent red button on the portal submission form
- Sets `is_emergency = true`, `priority = 'critical'`
- Attempts geolocation capture via browser API
- Creates a notification entry for school admin (uses existing notification patterns)

### Step 5: Route and navigation updates
- Update sidebar labels in SchoolLayout and PortalLayout
- No route URL changes needed (keep `/school/reports` and `/portal/reports`)

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` | New migration for 2 tables |
| `src/pages/school/SchoolReports.tsx` | Full rebuild — admin misconduct dashboard |
| `src/pages/portal/PortalReports.tsx` | Full rebuild — submit + my reports + trending |
| `src/components/school/SchoolLayout.tsx` | Rename "Reports" → "Misconduct reports", change icon |
| `src/components/portal/PortalLayout.tsx` | Rename "Reports" → "Misconduct reports", add to student/parent menus |

## Key Decisions
- Anonymous reports have no `reporter_user_id` — can't be tracked back
- Emergency panic button uses browser Geolocation API (optional, graceful fallback)
- Trending feed shows anonymized resolved cases published by school admin
- Attachments stored in existing `school-assets` bucket
- Duplicate detection: simple check on description similarity + same reporter within 24h (client-side warning)
- No offline sync in v1 (would require service worker — future enhancement)

