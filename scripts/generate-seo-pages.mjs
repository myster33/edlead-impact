/**
 * Build-time SEO page generator
 * 
 * Generates static HTML files for each public route with baked-in meta tags,
 * Open Graph data, and JSON-LD structured data so that social media crawlers
 * and search engine bots can read them without executing JavaScript.
 * 
 * Run after `vite build` to create per-route HTML files in dist/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const SITE_URL = 'https://edlead.co.za';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

// Define all public routes with their SEO metadata
const routes = [
  {
    path: '/',
    title: 'edLEAD | Transforming Student Leaders in Africa',
    description: 'edLEAD is a national youth leadership programme equipping high school learners with leadership, academic, and social skills to transform their schools from within.',
    ogTitle: 'edLEAD | Empowering Young Leaders for Positive Impact',
    ogDescription: 'A national youth leadership programme equipping high school learners with leadership, academic, and social skills to transform their schools and communities.',
    canonical: SITE_URL,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'EducationalOrganization',
      name: 'edLEAD',
      alternateName: 'edLEAD Africa',
      url: SITE_URL,
      logo: `${SITE_URL}/edlead-icon.png`,
      description: 'A national youth leadership programme equipping high school learners with leadership, academic, and social skills to transform their schools and communities.',
      foundingDate: '2020',
      areaServed: { '@type': 'Place', name: 'Africa' },
      sameAs: [
        'https://www.linkedin.com/company/edlead/',
        'https://www.instagram.com/edlead.africa/',
        'https://www.tiktok.com/@edleadafrica',
        'https://www.facebook.com/edleadafrica',
      ],
    },
  },
  {
    path: '/about',
    title: 'About edLEAD | Transforming Student Leaders in Africa',
    description: "Learn about edLEAD's mission to empower learners with leadership, academic, and social skills to positively influence school culture across Africa.",
    ogTitle: 'About edLEAD | Transforming Student Leaders in Africa',
    ogDescription: 'edLEAD is a youth leadership development programme creating intelligent, well-managed, and positive learning environments across Africa.',
    canonical: `${SITE_URL}/about`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'About edLEAD',
      description: 'edLEAD is a youth leadership development programme creating intelligent, well-managed, and positive learning environments across Africa.',
      url: `${SITE_URL}/about`,
      mainEntity: {
        '@type': 'EducationalOrganization',
        name: 'edLEAD',
        url: SITE_URL,
        foundingDate: '2020',
        description: 'A national youth leadership programme equipping high school learners with leadership, academic, and social skills.',
      },
    },
  },
  {
    path: '/programme',
    title: 'The edLEAD Programme | Leadership Development for Students',
    description: 'Discover the edLEAD programme — a three-month journey of mentorship, leadership workshops, school projects, and a final awards ceremony for high school learners.',
    ogTitle: 'The edLEAD Programme | Leadership Development for Students',
    ogDescription: 'A three-month online journey of growth, mentorship, and impact — culminating in a physical awards ceremony celebrating your accomplishments.',
    canonical: `${SITE_URL}/programme`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'edLEAD Leadership Programme',
      description: 'A three-month youth leadership programme combining mentorship, training, collaboration, and practical leadership experience.',
      url: `${SITE_URL}/programme`,
      provider: { '@type': 'EducationalOrganization', name: 'edLEAD', url: SITE_URL },
      educationalLevel: 'High School',
      duration: 'P3M',
      courseMode: 'Online',
    },
  },
  {
    path: '/impact',
    title: 'Our Impact | edLEAD — Measuring Change in African Schools',
    description: 'See how edLEAD is building student leadership capacity, promoting safer schools, and strengthening school culture across Africa.',
    ogTitle: 'Our Impact | edLEAD — Measuring Change in African Schools',
    ogDescription: 'Measuring the change we create in schools and communities across Africa through student leadership development.',
    canonical: `${SITE_URL}/impact`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Our Impact',
      description: 'Measuring the change edLEAD creates in schools and communities across Africa.',
      url: `${SITE_URL}/impact`,
      isPartOf: { '@type': 'WebSite', name: 'edLEAD', url: SITE_URL },
    },
  },
  {
    path: '/partners',
    title: 'Partners & Schools | edLEAD — Join the Movement',
    description: 'Partner with edLEAD to expand youth leadership development across Africa. Schools, NGOs, and corporate partners welcome.',
    ogTitle: 'Partners & Schools | edLEAD — Join the Movement',
    ogDescription: 'Join edLEAD in building a generation of ethical, confident, and socially responsible student leaders across Africa.',
    canonical: `${SITE_URL}/partners`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Partners & Schools',
      description: 'Partner with edLEAD to expand youth leadership development across Africa.',
      url: `${SITE_URL}/partners`,
      isPartOf: { '@type': 'WebSite', name: 'edLEAD', url: SITE_URL },
    },
  },
  {
    path: '/contact',
    title: 'Contact Us | edLEAD — Get in Touch',
    description: 'Contact edLEAD for questions about our youth leadership programme, partnership opportunities, or general inquiries. Email info@edlead.co.za.',
    ogTitle: 'Contact Us | edLEAD — Get in Touch',
    ogDescription: 'Have questions or want to get involved with edLEAD? Reach out to us at info@edlead.co.za.',
    canonical: `${SITE_URL}/contact`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact edLEAD',
      description: 'Contact edLEAD for questions about our youth leadership programme.',
      url: `${SITE_URL}/contact`,
      mainEntity: {
        '@type': 'EducationalOrganization',
        name: 'edLEAD',
        email: 'info@edlead.co.za',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '19 Ameshoff St, Braamfontein',
          addressLocality: 'Johannesburg',
          addressCountry: 'ZA',
        },
      },
    },
  },
  {
    path: '/admissions',
    title: 'Get Started | edLEAD — Apply to the Leadership Programme',
    description: 'Apply to join the edLEAD leadership programme. Open to high school learners nominated by their schools across Africa.',
    ogTitle: 'Get Started | edLEAD — Apply to the Leadership Programme',
    ogDescription: 'Take the first step in your leadership journey. Apply to the edLEAD programme today.',
    canonical: `${SITE_URL}/admissions`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Admissions',
      description: 'Apply to join the edLEAD leadership programme.',
      url: `${SITE_URL}/admissions`,
      isPartOf: { '@type': 'WebSite', name: 'edLEAD', url: SITE_URL },
    },
  },
  {
    path: '/blog',
    title: "Leaders' Stories | edLEAD — Student Leadership Blog",
    description: "Read inspiring stories from edLEAD student leaders across Africa. Leadership experiences, school projects, and personal growth journeys.",
    ogTitle: "Leaders' Stories | edLEAD — Student Leadership Blog",
    ogDescription: "Inspiring stories from student leaders transforming their schools and communities across Africa.",
    canonical: `${SITE_URL}/blog`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: "Leaders' Stories",
      description: 'Inspiring stories from edLEAD student leaders across Africa.',
      url: `${SITE_URL}/blog`,
      publisher: { '@type': 'EducationalOrganization', name: 'edLEAD', url: SITE_URL },
    },
  },
];

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateHtml(route, templateHtml) {
  // Build the meta tags to inject
  const metaTags = [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeHtml(route.description)}" />`,
    `<meta property="og:title" content="${escapeHtml(route.ogTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(route.ogDescription)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(route.canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(OG_IMAGE)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="640" />`,
    `<meta property="og:site_name" content="edLEAD" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(route.ogTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(route.ogDescription)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}" />`,
    `<link rel="canonical" href="${escapeHtml(route.canonical)}" />`,
  ].join('\n    ');

  const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(route.jsonLd)}</script>`;

  // Replace the default title and description in the template
  let html = templateHtml;

  // Remove existing title tag and replace
  html = html.replace(/<title>[^<]*<\/title>/, '');
  // Remove existing meta description
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, '');
  // Remove existing OG tags (they'll be replaced with route-specific ones)
  html = html.replace(/<meta\s+property="og:[^"]*"\s+content="[^"]*"\s*\/?>\s*/gi, '');
  // Remove existing Twitter tags
  html = html.replace(/<meta\s+name="twitter:[^"]*"\s+content="[^"]*"\s*\/?>\s*/gi, '');

  // Inject route-specific meta tags right after <head> and charset/viewport
  html = html.replace(
    /(<meta\s+name="viewport"[^>]*>)/i,
    `$1\n    ${metaTags}\n    ${jsonLdScript}`
  );

  return html;
}

async function main() {
  const indexHtmlPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ dist/index.html not found. Run `vite build` first.');
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
  let created = 0;

  for (const route of routes) {
    const routePath = route.path === '/' ? '' : route.path;
    const html = generateHtml(route, templateHtml);

    if (route.path === '/') {
      // Overwrite the root index.html with proper meta (already has defaults, but let's ensure consistency)
      fs.writeFileSync(indexHtmlPath, html);
      console.log(`✅ Updated: /index.html`);
    } else {
      // Create directory and index.html for each route
      const dir = path.join(distDir, routePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
      console.log(`✅ Created: ${routePath}/index.html`);
    }
    created++;
  }

  console.log(`\n🎉 Generated ${created} pre-rendered SEO pages.`);
}

main().catch(console.error);
