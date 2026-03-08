

## Plan: Website Upgrades (7 items)

This covers all approved upgrades: accessibility, lazy loading, FAQ page, enhanced 404, page transitions, newsletter subscription, and testimonials on the Impact page.

---

### 1. Accessibility Improvements

**Files to modify:**
- `src/components/layout/Layout.tsx` — Add a skip-to-content link (`<a href="#main-content">`) and `id="main-content"` on `<main>`
- `src/components/layout/Navbar.tsx` — Add `aria-label` to theme toggle button and mobile menu toggle
- `src/components/chat/ChatWidget.tsx` — Add `aria-label` to open/close/minimize/send buttons, add `aria-live="polite"` on message list container
- `src/components/home/HeroSection.tsx` — Add `aria-live="polite"` to the typing animation heading
- `src/index.css` — Add visible focus ring utility (e.g., `focus-visible:ring-2 ring-primary ring-offset-2`) as a global style

### 2. Lazy Loading Routes + Images

**Files to modify:**
- `src/App.tsx` — Replace all eager imports with `React.lazy()` and wrap `<Routes>` children in `<Suspense>` with a loading fallback. Keep `Index` eager for fast first paint; lazy-load all other pages.
- Image optimization across pages — Add `loading="lazy"` to below-the-fold images in `HeroSection` (images 2-5 only), programme, partners, and blog card components

### 3. FAQ Page

**Files to create:**
- `src/pages/FAQ.tsx` — New page using `Layout`, `Helmet` with SEO tags, and `@radix-ui/react-accordion` for Q&A sections covering: Programme Overview, Eligibility & Admissions, Application Process, Technical Support, and General. Include 4-5 questions per section.

**Files to modify:**
- `src/App.tsx` — Add `/faq` route (lazy-loaded)
- `scripts/generate-seo-pages.mjs` — Add `/faq` to the static routes array for prerendering

### 4. Enhanced 404 Page

**Files to modify:**
- `src/pages/NotFound.tsx` — Wrap in `Layout`, add `Helmet` SEO tags, edLEAD branding, a friendly illustration (using Lucide icons), and navigation links to Home, About, Admissions, Contact, and Blog

### 5. Page Transition Animations

**Files to modify:**
- `src/index.css` — Add a CSS `@keyframes` for fade-in-up animation
- `src/components/layout/Layout.tsx` — Apply the animation class to the `<main>` element so each page fades in on mount

### 6. Newsletter Subscription

**Database migration:** Create a `newsletter_subscribers` table with columns: `id` (uuid), `email` (text, unique), `subscribed_at` (timestamptz, default now()), `is_active` (boolean, default true). Enable RLS with a public INSERT policy (anyone can subscribe) and admin-only SELECT.

**Files to modify:**
- `src/components/layout/Footer.tsx` — Add a newsletter signup form (email input + subscribe button) in the "Get in Touch" column, using the database client to insert into `newsletter_subscribers`

### 7. Testimonials Section on Impact Page

**Database migration:** Create a `testimonials` table with columns: `id` (uuid), `name` (text), `role` (text), `school` (text), `province` (text), `quote` (text), `is_published` (boolean, default false), `created_at` (timestamptz). Enable RLS with public SELECT for published testimonials, admin-only INSERT/UPDATE/DELETE.

**Files to modify:**
- `src/pages/Impact.tsx` — Add a "What Our Leaders Say" section between the Outcomes and Stats sections. Fetch published testimonials from the database and display them in a carousel (using the existing `embla-carousel-react` + autoplay). Each card shows the quote, name, role, and school. Include a static fallback with 3-4 hardcoded testimonials if the database returns empty.

---

### Technical Notes
- Lazy loading uses `React.lazy` + `Suspense` — no new dependencies needed
- FAQ uses the already-installed `@radix-ui/react-accordion`
- Newsletter and testimonials each need one new database table with RLS
- Page transitions use pure CSS animation — no library needed
- The testimonials carousel reuses the existing Embla carousel dependency

