/**
 * Vercel Serverless Function — /api/robots.js
 * Returns robots.txt with sitemap directive.
 * Accessed at: /robots.txt (via vercel.json rewrite)
 */

export default function handler(req, res) {
  const txt = `User-agent: *
Allow: /

# Admin dashboard — do not index
Disallow: /admin/

# API routes — not for crawlers
Disallow: /api/

# Sitemap
Sitemap: https://www.davidrenederothschild.com/sitemap.xml
`;

  res
    .status(200)
    .setHeader("Content-Type", "text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, s-maxage=86400")
    .end(txt);
}
