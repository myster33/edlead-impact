

## Plan: Add robots.txt to Build Output

Currently `public/robots.txt` is already copied to `dist/` by Vite automatically (Vite copies everything in `public/` to the build output). So the existing robots.txt with the correct sitemap URLs is already present in the build.

However, the current robots.txt references both domains, which is correct. To make this more robust and consistent with the dynamic sitemap generation approach, I'll update the `generate-sitemap.mjs` script to also write the robots.txt file to `dist/` at build time, ensuring it always stays in sync with the sitemap filenames.

### Changes

1. **Update `scripts/generate-sitemap.mjs`** — Add a `generateRobotsTxt()` function at the end of `main()` that writes a `robots.txt` to `dist/` with:
   - Standard bot allow rules
   - Correct sitemap URLs for both domains (`https://edlead.co.za/sitemap.xml` and `https://edlead.co/sitemap-co.xml`)
   - This overwrites the static `public/robots.txt` copy, ensuring build-time generation is the source of truth

This is a single-file, minimal change — just appending a function call to the existing sitemap generation script.

