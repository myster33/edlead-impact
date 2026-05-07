## Add YouTube Video to Hero Section

Add an embedded, playable YouTube video on the right side of the "Empowering Young Leaders..." headline on the home page.

**Video URL:** `https://www.youtube.com/watch?v=1F19ZKvwcxA` (ID: `1F19ZKvwcxA`)

### Layout Changes (`src/components/home/HeroSection.tsx`)

- Convert the hero content area into a 2-column grid on `lg` screens:
  - **Left column**: existing headline, paragraph, and CTA buttons (unchanged copy/behavior).
  - **Right column**: a 16:9 YouTube embed in a rounded card with subtle shadow and a primary-colored ring accent to match brand.
- On mobile/tablet (`<lg`), stack vertically: text first, video below.
- Keep the rotating background images and gradient overlay intact behind both columns.
- Slightly darken the gradient on the right side so the video frame stands out (currently it fades to transparent on the right — adjust to keep some overlay across full width).

### Video Embed

- Use a standard `<iframe>` with `https://www.youtube.com/embed/1F19ZKvwcxA` (privacy-enhanced `youtube-nocookie.com` domain).
- `title`, `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`, `allowFullScreen`, `loading="lazy"`.
- Wrap in an `aspect-video` container with `rounded-xl overflow-hidden` and `shadow-2xl`.
- No autoplay — user clicks to play.

### Files Touched

- `src/components/home/HeroSection.tsx` — layout grid + iframe embed.

No other components, routes, or backend changes.
