

## Plan: Branded Loading Screen for All Portals

### Problem
All three portals (User, School, Admin) and their protected routes show a plain spinner (`Loader2`) during auth loading. This feels bare and unpolished.

### Solution
Create a reusable `PortalLoadingScreen` component with a branded, animated experience:

- edLEAD logo (theme-aware) with a subtle pulse animation
- Animated progress bar that fills gradually
- Contextual loading text (e.g., "Preparing your portal..." with a typing/fade effect)
- Matching background style (gradient orbs like the User Access page, but subtle)
- Smooth fade-out when loading completes

### Changes

1. **New component**: `src/components/shared/PortalLoadingScreen.tsx`
   - Props: `portalName?: string` (e.g., "User Portal", "Schools Portal", "Admin Portal")
   - Displays: edLEAD logo (light/dark), animated progress bar, loading message
   - Uses existing CSS animation patterns plus a new shimmer/progress keyframe

2. **New CSS keyframes** in `src/index.css`:
   - `portal-loading-shimmer` — subtle shimmer across the progress bar
   - `portal-loading-fade-text` — cycling loading messages with fade

3. **Replace all spinner loading states** in:
   - `src/pages/portal/PortalLogin.tsx` (line 239-245)
   - `src/pages/school/SchoolLogin.tsx` (line 305-311)
   - `src/pages/admin/AdminLogin.tsx` (line 341-347)
   - `src/components/portal/PortalProtectedRoute.tsx` (line 9-13)
   - `src/components/school/SchoolProtectedRoute.tsx` (line 9-13)
   - `src/components/admin/ProtectedRoute.tsx` (line 33-39)

### Component Design

```text
┌─────────────────────────────────┐
│                                 │
│      (floating gradient orbs)   │
│                                 │
│         [edLEAD logo]           │
│                                 │
│    ━━━━━━━━━━░░░░░░░░░░░░░░░   │
│       (animated progress bar)   │
│                                 │
│    "Preparing your portal..."   │
│                                 │
└─────────────────────────────────┘
```

The progress bar auto-fills over ~3 seconds with a shimmer effect. The loading text cycles through contextual messages like "Verifying credentials...", "Loading your dashboard...", "Almost there...".

