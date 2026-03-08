

## Plan: Create "User Access" Portal Selector Page

### What changes

1. **Footer update** — Replace the three portal links (Educator/Student/Parent Portal, School Portal, Admin Portal) under Community with a single "User Access" link pointing to `/user-access`.

2. **New page: `/user-access`** (`src/pages/UserAccess.tsx`)
   - Full-screen centered layout with edLEAD logo at top
   - Animated heading: "What is your title?" with a subtle fade/slide-in
   - Six role cards in a grid, each with an icon and label:
     - School Admin → `/school/login`
     - School HR → `/school/login`
     - Parent/Guardian → `/portal/login`
     - Student/Learner → `/portal/login`
     - Partner Organisation/Sponsor → `/contact` (or a dedicated page later)
     - edLEAD Admin → `/admin/login`
   - On selection, animate-out current view and navigate to the target login page
   - Dark/light mode support via `useTheme`
   - Smooth CSS animations (fade-in cards, slide-up heading)

3. **Login pages animation** — Add a slide-in entry animation (CSS `@keyframes slideUp`) to the login Card wrapper in `PortalLogin.tsx`, `SchoolLogin.tsx`, and `AdminLogin.tsx`.

4. **Route registration** — Add `/user-access` route to `App.tsx`.

### Technical details

- Animations use Tailwind `animate-` utilities + custom keyframes in `index.css` (slide-up and fade-in)
- Role cards use `framer-motion`-style CSS transitions (no new deps — pure CSS/Tailwind)
- Each card navigates via `useNavigate` with a brief delay for exit animation
- Footer `community` array simplified to single entry: `{ name: "User Access", path: "/user-access" }`

