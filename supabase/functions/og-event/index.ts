import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SPA_BASE = "https://edlead.lovable.app";

const BOT_PATTERNS = [
  "WhatsApp",
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "TelegramBot",
  "Slackbot",
  "Discordbot",
  "Googlebot",
  "bingbot",
  "PinterestBot",
];

function isBot(ua: string): boolean {
  return BOT_PATTERNS.some((p) => ua.includes(p));
}

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return text.substring(0, max).replace(/\s+\S*$/, "") + "…";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.redirect(`${SPA_BASE}/events`, 302);
  }

  const ua = req.headers.get("user-agent") || "";

  // Non-bots get redirected straight to the SPA
  if (!isBot(ua)) {
    return Response.redirect(`${SPA_BASE}/events/${code}`, 302);
  }

  // Bot: fetch event data and return OG HTML
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: event } = await supabase
    .from("events")
    .select("title, description, banner_square_url, image_url, location, event_date")
    .eq("short_code", code)
    .single();

  if (!event) {
    return Response.redirect(`${SPA_BASE}/events`, 302);
  }

  const title = escapeHtml(`${event.title} | edLEAD Events`);
  const description = escapeHtml(truncate(event.description));
  const image = event.banner_square_url || event.image_url || "";
  const canonicalUrl = `${SPA_BASE}/events/${code}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <meta name="description" content="${description}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}"/>
  <meta property="og:site_name" content="edLEAD"/>
  ${image ? `<meta property="og:image" content="${escapeHtml(image)}"/>
  <meta property="og:image:width" content="1080"/>
  <meta property="og:image:height" content="1080"/>` : ""}
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title}"/>
  <meta name="twitter:description" content="${description}"/>
  ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}"/>` : ""}
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}"/>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(canonicalUrl)}">${title}</a>…</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
