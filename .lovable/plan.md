## Plan: Replace Home Page Hero Background Images

Replace the 5 rotating background images in the home page hero section with the 8 new event photos you uploaded.

### What changes

**Hero carousel** (`src/components/home/HeroSection.tsx`) currently rotates through 5 images:
- `hero-students.jpg`, `hero-students-2.jpg`, `hero-students-3.jpg`, `hero-students-4.jpg`, `hero-students-5.jpg`

These will be replaced with your 8 uploaded event photos:
1. `1.JPG` — Two edLEAD reps presenting (orange/white shirts)
2. `IMG_7972.JPG` — Large group photo of learners outside school
3. `IMG_8078.JPG` — "Managing Discipline" session with raised hands
4. `IMG_8134.JPG` — Audience clapping in venue
5. `IMG_8246.JPG` — Students presenting "Stop Bullying" project
6. `IMG_8320.JPG` — Liesl May "Leadership Growth" presentation
7. `IMG_8331.JPG` — Student speaking with microphone
8. `IMG_8338.JPG` — Speaker presenting "Student Leader Benefits" slide

### Steps

1. Copy the 8 uploaded images into `src/assets/` as optimized hero images (e.g. `hero-event-1.jpg` … `hero-event-8.jpg`).
2. Update `src/components/home/HeroSection.tsx`:
   - Replace the 5 imports with the 8 new ones
   - Update the `heroImages` array
   - The crossfade animation, indicators, and 3-second rotation timing stay exactly the same — just more slides now
3. Leave the old `hero-students*.jpg` files in `src/assets/` untouched (they're not used elsewhere but keeping them avoids any risk of breaking other imports).

### Notes

- All 8 images keep the existing dark gradient overlay (`from-secondary/95 via-secondary/80 to-secondary/40`) so the white headline text remains readable.
- Image dot indicators at the bottom will automatically expand from 5 to 8 dots.
- No layout, copy, or styling changes — purely an image swap.