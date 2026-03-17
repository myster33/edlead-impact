/**
 * Build-time sitemap generator
 * 
 * Generates dynamic sitemaps for both edlead.co.za and edlead.co domains,
 * including all static routes and published blog post URLs fetched from the database.
 * Includes hreflang annotations so Google treats them as alternate-language equivalents.
 * 
 * Run after `vite build` to create sitemap.xml and sitemap-co.xml in dist/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const TODAY = new Date().toISOString().split('T')[0];

const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/programme', changefreq: 'monthly', priority: '0.8' },
  { path: '/admissions', changefreq: 'monthly', priority: '0.9' },
  { path: '/impact', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/partners', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/faq', changefreq: 'monthly', priority: '0.6' },
  { path: '/check-status', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of envContent.split('\n')) {
      const match = line.match(/^(\w+)=["']?([^"'\n]+)["']?$/);
      if (match) vars[match[1]] = match[2];
    }
    return vars;
  }
  return {};
}

async function fetchBlogSlugs(supabaseUrl, anonKey) {
  const url = `${supabaseUrl}/rest/v1/blog_posts?status=eq.approved&select=slug,id,approved_at&order=approved_at.desc`;
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch blog posts for sitemap (${response.status}).`);
      return [];
    }
    return await response.json();
  } catch (err) {
    console.warn(`⚠️  Could not fetch blog posts: ${err.message}`);
    return [];
  }
}

function buildSitemapXml(baseUrl, altBaseUrl, staticRoutes, blogPosts) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;

  for (const route of staticRoutes) {
    const zaUrl = `https://edlead.co.za${route.path}`;
    const coUrl = `https://edlead.co${route.path}`;
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${route.path}</loc>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en-ZA" href="${zaUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${coUrl}" />\n`;
    xml += `    <lastmod>${TODAY}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const post of blogPosts) {
    const slug = post.slug || post.id;
    const lastmod = post.approved_at ? post.approved_at.split('T')[0] : TODAY;
    const zaUrl = `https://edlead.co.za/blog/${slug}`;
    const coUrl = `https://edlead.co/blog/${slug}`;
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/blog/${slug}</loc>\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en-ZA" href="${zaUrl}" />\n`;
    xml += `    <xhtml:link rel="alternate" hreflang="en" href="${coUrl}" />\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let blogPosts = [];
  if (supabaseUrl && anonKey) {
    console.log('📝 Fetching blog posts for sitemap...');
    blogPosts = await fetchBlogSlugs(supabaseUrl, anonKey);
    console.log(`   Found ${blogPosts.length} published post(s).`);
  } else {
    console.warn('⚠️  Database credentials not found. Generating sitemap without blog posts.');
  }

  const sitemapZa = buildSitemapXml('https://edlead.co.za', 'https://edlead.co', STATIC_ROUTES, blogPosts);
  const sitemapCo = buildSitemapXml('https://edlead.co', 'https://edlead.co.za', STATIC_ROUTES, blogPosts);

  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapZa);
  fs.writeFileSync(path.join(distDir, 'sitemap-co.xml'), sitemapCo);

  const totalUrls = STATIC_ROUTES.length + blogPosts.length;
  console.log(`🗺️  Generated sitemaps with ${totalUrls} URLs each (${STATIC_ROUTES.length} static + ${blogPosts.length} blog posts).`);

  const robotsTxt = [
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    'User-agent: Twitterbot',
    'Allow: /',
    '',
    'User-agent: facebookexternalhit',
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://edlead.co.za/sitemap.xml',
    'Sitemap: https://edlead.co/sitemap-co.xml',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(distDir, 'robots.txt'), robotsTxt);
  console.log('🤖 Generated robots.txt with sitemap references.');
}

main().catch(console.error);
