

## Problem

WhatsApp, Facebook, Twitter etc. don't run JavaScript — they only read the raw HTML. Since this is a React SPA, the Open Graph meta tags set via `react-helmet-async` are invisible to social crawlers. That's why shared event links show the generic edLEAD description instead of the event's banner and title.

## Solution: Edge Function OG Proxy

Create a backend function that detects social media crawlers and serves a minimal HTML page with the correct OG tags (event title, description, square banner image). Normal users get redirected to the SPA as usual.

### How it works

```text
User shares: https://edlead.lovable.app/events/ed0001

WhatsApp crawler hits URL
  → Edge function detects bot user-agent
  → Fetches event data from DB by short_code
  → Returns minimal HTML with:
      og:title = "2026 Student Leadership Masterclass | edLEAD Events"
      og:description = event.description (truncated)
      og:image = event.banner_square_url (1:1 square)
      og:image:width = 1080
      og:image:height = 1080
  → WhatsApp renders the rich preview with square banner

Normal user hits URL
  → Edge function redirects to the SPA
  → React Router handles it as before
```

### Steps

1. **Create Edge Function `og-event`** — accepts the short code from the URL, queries the `events` table, returns OG HTML for bots or a 302 redirect for humans. User-agent detection covers WhatsApp, Facebook, Twitter, LinkedIn, Telegram, and Slack bots.

2. **No changes to `EventDetail.tsx`** — the existing Helmet tags stay for in-app SEO; the edge function handles external crawlers only.

3. **Share format** — the shareable URL stays `/events/ed0001`. The edge function will be invoked at `https://<supabase-url>/functions/v1/og-event?code=ed0001`. WhatsApp notification messages will use this URL instead of the direct SPA URL so crawlers hit the function first, which then redirects real users to the actual page.

4. **Update `notify-event-booking` edge function** — change the event link in SMS/WhatsApp/Email messages to point through the OG proxy so shared links always show rich previews.

### Technical details

- Edge function: `supabase/functions/og-event/index.ts`
- Bot detection via `user-agent` header matching (WhatsAppBot, facebookexternalhit, Twitterbot, LinkedInBot, TelegramBot, Slackbot)
- Square banner (`banner_square_url`) used as `og:image` for optimal WhatsApp display (1:1 ratio)
- Falls back to `image_url` if no square banner exists
- Redirect URL: `https://edlead.lovable.app/events/{short_code}`

