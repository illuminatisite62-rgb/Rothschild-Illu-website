/**
 * Vercel Serverless Function — /api/sitemap.js
 * Dynamically generates sitemap.xml from published profiles and static pages.
 * Accessed at: /sitemap.xml (via vercel.json rewrite)
 */

const SITE_URL = "https://www.davidrenederothschild.com";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STATIC_PAGES = [
  { url: "/", priority: "1.0", changefreq: "weekly" },
  { url: "/family", priority: "0.9", changefreq: "daily" },
  { url: "/history", priority: "0.8", changefreq: "weekly" },
  { url: "/archive", priority: "0.8", changefreq: "weekly" },
  { url: "/about", priority: "0.7", changefreq: "monthly" },
  { url: "/contact", priority: "0.5", changefreq: "monthly" },
  { url: "/join", priority: "0.6", changefreq: "monthly" },
];

export default async function handler(req, res) {
  let profiles = [];

  try {
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?status=eq.published&select=slug,updated_at,published_at&order=full_name`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      if (profileRes.ok) {
        profiles = await profileRes.json();
      }
    }
  } catch (err) {
    console.error("[sitemap] fetch error:", err);
  }

  const now = new Date().toISOString().split("T")[0];

  const staticEntries = STATIC_PAGES.map(
    (p) => `
  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
    <lastmod>${now}</lastmod>
  </url>`
  ).join("");

  const profileEntries = profiles
    .map((p) => {
      const lastmod = (p.updated_at || p.published_at || now).split("T")[0];
      return `
  <url>
    <loc>${SITE_URL}/family/${encodeURIComponent(p.slug)}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${profileEntries}
</urlset>`;

  res
    .status(200)
    .setHeader("Content-Type", "application/xml; charset=utf-8")
    .setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=7200")
    .end(xml);
}
