

# Social Banner — Pure Image Compositing (No AI)

## What Changes

Replace the current broken AI-based banner generation with a simple server-side image compositing approach using an HTML/CSS-to-image technique via Deno Canvas (`esm.sh/canvas`). The banner is generated automatically on approval — no admin action needed.

## How It Works

The template has a clear layout: large dark circle (photo area) in the upper half, empty white space below for text. The edge function will:

1. Load the background template image (the uploaded JPG)
2. Load the student's photo from their application
3. Draw the template onto a canvas (1080x1080)
4. Crop and draw the student photo as a circle, positioned over the dark circle area (~center x:480, y:340, radius:~250)
5. Draw text below the circle:
   - "CONGRATULATIONS" (white on dark or orange text)
   - Student name in gold/orange
   - "Accepted into the edLEAD Leadership Program"
6. Export as PNG, upload to storage, return URL

## Files to Change

### 1. Save template to project
- Copy `user-uploads://Social_Banner-2.jpg` to `public/social-banner-template.jpg`
- Upload it to storage bucket `applicant-photos/templates/social-banner-template.jpg` via the edge function on first use (or manually)

### 2. Rewrite `supabase/functions/generate-social-banner/index.ts`
- Remove Bedrock/AI dependency entirely
- Use `jsr:@nicolo/canvas` or the built-in `ImageMagick` approach via Deno — however, since Deno edge functions have limited native image libraries, the most reliable approach is to use **SVG compositing**:
  - Build an SVG string (1080x1080) that embeds:
    - The background template as a base64 `<image>`
    - The student photo as a base64 `<image>` with a circular `<clipPath>`
    - Text elements positioned below the circle
  - Convert the SVG to PNG using `resvg-wasm` (available on esm.sh for Deno)
- Upload the final PNG to storage
- Return the public URL

### 3. `SocialBannerPreview.tsx` — Simplify
- Remove the manual "Generate Banner" button flow
- Instead, show the banner if it already exists (fetched from the application record or storage)
- Optionally keep a "Regenerate" button for edge cases
- The banner is auto-generated during the approval flow (already wired in `notify-applicant-approved`)

### 4. Store banner URL on application
- Add a `social_banner_url` column to the `applications` table (if not already present) so the generated URL is saved and can be displayed without regenerating

## Technical Approach — SVG + resvg-wasm

Since Deno edge functions cannot use Node Canvas, the approach is:
- Construct an SVG with embedded base64 images and text
- Use `resvg-wasm` to render the SVG to PNG bytes
- This is lightweight, deterministic, and requires no AI

```text
┌──────────────────────────┐
│  Background template     │
│  (base64 embedded)       │
│                          │
│     ┌──────────┐         │
│     │ Student  │ circular│
│     │  Photo   │ clip    │
│     └──────────┘         │
│                          │
│   CONGRATULATIONS        │
│   STUDENT NAME           │
│   Accepted into the      │
│   edLEAD Leadership      │
│   Program                │
└──────────────────────────┘
```

## Summary
- No AI involved — pure image compositing
- Fully automatic on approval
- Deterministic output every time
- Admin can still preview/regenerate from the application detail view

