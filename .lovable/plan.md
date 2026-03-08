

## Plan: Clean Up Portal Loading Screen

### What's changing
Remove the pulsing logo animation (the "round loading" effect) from `PortalLoadingScreen` and keep only the clean shimmer progress bar with cycling text — a sleeker, more premium feel.

### File: `src/components/shared/PortalLoadingScreen.tsx`
- Remove `animate-pulse` class from the logo `<img>` tag
- Keep the logo static and clean — it serves as branding, not a loading indicator
- The shimmer progress bar + cycling text are sufficient loading feedback

### Result
Logo displays cleanly without pulsing. The shimmer progress bar and contextual messages provide all the loading feedback the user needs.

