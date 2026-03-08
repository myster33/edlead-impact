

# Plan: Schools Portal, General Portal & STATs (Attendance) Module

## Overview

Build two new portals reusing the existing admin layout pattern, plus the foundational database schema for schools, users, and the STATs attendance module.

```text
┌──────────────────────────────────────────────────┐
│              edLEAD Main Admin Portal            │
│  (existing - manages all accounts & settings)    │
│  /admin/*                                        │
└──────────────┬───────────────────┬───────────────┘
               │                   │
    ┌──────────▼──────┐   ┌───────▼────────────┐
    │  Schools Portal │   │  General Portal     │
    │  /school/*      │   │  /portal/*          │
    │  School Admin   │   │  Parent, Student,   │
    │  HR             │   │  Educator           │
    └─────────────────┘   └────────────────────┘
```

## Phase 1: Foundation (this implementation)

### 1. Database Tables (migrations)

**schools** - Mother class for all school instances
- `id`, `name`, `address`, `province`, `country`, `school_code` (unique), `email`, `phone`, `logo_url`, `is_verified` (main admin approves), `created_at`

**school_users** - All portal users (parents, students, educators, school admins, HR)
- `id`, `user_id` (auth.users), `school_id` (FK schools), `role` (enum: `school_admin`, `hr`, `educator`, `class_teacher`, `subject_teacher`, `parent`, `student`), `full_name`, `email`, `phone`, `student_id_number` (nullable, for students), `profile_picture_url`, `is_active`, `created_at`
- A parent with learners at multiple schools = multiple rows, one per school

**student_parent_links** - Links parents to students
- `id`, `parent_user_id` (FK school_users), `student_user_id` (FK school_users), `relationship` (e.g. mother, father, guardian), `is_primary`, `created_at`

**classes** - For class teacher register
- `id`, `school_id`, `name` (e.g. "Grade 10A"), `grade`, `class_teacher_id` (FK school_users), `created_at`

**class_students** - Students assigned to classes
- `id`, `class_id`, `student_id` (FK school_users), `created_at`

**attendance_events** - Core STATs tracking
- `id`, `user_id` (FK school_users), `school_id`, `role`, `event_type` (check_in/check_out), `timestamp`, `method` (scan/manual/e-card), `status` (present/late/absent), `marked_by` (nullable, for manual), `created_at`

**absence_requests** - Parent-submitted reasons
- `id`, `student_id` (FK school_users), `parent_id` (FK school_users), `reason`, `start_date`, `end_date`, `attachment_url`, `status` (pending/approved/rejected), `reviewed_by`, `created_at`

RLS policies: School-scoped access (users can only see data for their linked school). Main admin bypasses via `is_admin()`.

### 2. Auth & Contexts

**SchoolAuthContext** (`src/contexts/SchoolAuthContext.tsx`)
- Similar to AdminAuthContext but queries `school_users` table
- Tracks current school, user role, active school for parent switching

**PortalAuthContext** (`src/contexts/PortalAuthContext.tsx`)
- For general portal (parent/student/educator)
- Includes `switchSchool()` for parents with multi-school learners

### 3. Portal Layouts (copying admin pattern)

**SchoolLayout** (`src/components/school/SchoolLayout.tsx`)
- Sidebar with school-specific modules: Dashboard, Attendance (STATs), Classes, Students, Staff, Reports
- Same sidebar/header pattern as AdminLayout with edLEAD branding + school name badge
- Role-based menu filtering (school_admin sees all, educator sees limited)

**PortalLayout** (`src/components/portal/PortalLayout.tsx`)
- Sidebar modules vary by role:
  - **Student**: Dashboard, My Attendance, E-Card, Reports
  - **Parent**: Dashboard, My Children, Attendance, Absence Requests
  - **Educator**: Dashboard, My Classes, Attendance, Reports

### 4. Login Pages

**SchoolLogin** (`src/pages/school/SchoolLogin.tsx`) at `/school/login`
- Login/signup tabs (same pattern as AdminLogin)
- Signup creates auth user + pending school registration (main admin verifies)

**PortalLogin** (`src/pages/portal/PortalLogin.tsx`) at `/portal/login`
- Login/signup with role selection (Parent, Student, Educator)
- After login, auto-detects role from `school_users` table and routes to correct dashboard

### 5. STATs Module Pages

**School Portal side:**
- `/school/dashboard` - Overview with attendance stats
- `/school/attendance` - Daily attendance dashboard, filters by class/grade
- `/school/classes` - Manage classes, add students
- `/school/students` - Student directory
- `/school/staff` - Staff directory
- `/school/absence-requests` - Review parent-submitted absence reasons

**General Portal side:**
- `/portal/dashboard` - Role-specific dashboard (student sees own stats, parent sees children)
- `/portal/attendance` - View attendance records
- `/portal/absence-request` - (Parent) Submit absence reason with optional attachment
- `/portal/my-classes` - (Educator) View and mark attendance

### 6. Main Admin Integration

Add to existing admin sidebar:
- **Schools** module - View/verify registered schools, manage school accounts
- **Portal users** module - View all portal users across schools

### 7. Routes (App.tsx)

Add new route groups for `/school/*` and `/portal/*` with their respective protected route wrappers.

## Technical Details

- New enum type: `school_user_role` = `school_admin | hr | educator | class_teacher | subject_teacher | parent | student`
- Protected routes use new contexts (SchoolProtectedRoute, PortalProtectedRoute)
- Storage bucket `school-logos` for school branding
- Enable realtime on `attendance_events` for live dashboard updates
- Parent school switching: query `school_users` where `user_id = current` and `role = parent` to get all linked schools

## Build Order

1. Database migration (all tables + RLS + enum)
2. Auth contexts (SchoolAuthContext, PortalAuthContext)
3. Login pages (`/school/login`, `/portal/login`)
4. Layouts (SchoolLayout, PortalLayout)
5. School portal dashboard + attendance pages
6. General portal dashboard + attendance views
7. Main admin schools management page
8. Wire up routes in App.tsx

