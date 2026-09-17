/**
 * Vercel Serverless Function — /api/profile/[slug].js
 * Serves a fully server-rendered profile page at /family/{slug}/
 * All SEO content is in the initial HTML — no client-side fetch required for indexing.
 */

const SITE_URL = "https://www.davidrenederothschild.com";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

function formatDateLong(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function lifespanStr(profile) {
  const b = formatYear(profile.birth_date);
  const d = formatYear(profile.death_date);
  if (b && d) return `${b}–${d}`;
  if (b) return `b. ${b}`;
  return null;
}

function generateTitle(profile) {
  if (profile.seo_title) return profile.seo_title;
  const span = lifespanStr(profile);
  const name = profile.full_name;
  const occ = profile.occupation ? ` & ${profile.occupation} History` : " & Family History";
  return span
    ? `${name} (${span}) | Biography${occ} | Rothschild`
    : `${name} | Biography${occ} | Rothschild`;
}

function generateDescription(profile) {
  if (profile.seo_description) return profile.seo_description;
  if (profile.short_bio) return profile.short_bio.slice(0, 160);
  const span = lifespanStr(profile);
  const spanStr = span ? ` (${span})` : "";
  return `Explore the life of ${profile.full_name}${spanStr} — biography, family history, achievements and historical legacy from the Rothschild family record.`;
}

function paragraphsHtml(text) {
  if (!text) return "";
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

/* ------------------------------------------------------------------ */
/* Supabase fetch (server-side, uses service key)                      */
/* ------------------------------------------------------------------ */

async function fetchProfile(slug) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;

  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
    { headers }
  );
  if (!profileRes.ok) return null;
  const profiles = await profileRes.json();
  if (!profiles || profiles.length === 0) return null;
  const profile = profiles[0];

  // Fetch related data in parallel
  const [relsRes, imagesRes, sourcesRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/family_relationships?profile_id=eq.${profile.id}&select=relationship_type,related_profile_id,profiles!family_relationships_related_profile_id_fkey(slug,full_name,portrait_url)`,
      { headers }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/profile_images?profile_id=eq.${profile.id}&order=display_order`,
      { headers }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/sources?profile_id=eq.${profile.id}`,
      { headers }
    ),
  ]);

  profile.relationships = relsRes.ok ? await relsRes.json() : [];
  profile.gallery = imagesRes.ok ? await imagesRes.json() : [];
  profile.sources = sourcesRes.ok ? await sourcesRes.json() : [];

  return profile;
}

/* ------------------------------------------------------------------ */
/* JSON-LD generators                                                   */
/* ------------------------------------------------------------------ */

function buildPersonSchema(profile, canonicalUrl) {
  const person = {
    "@type": "Person",
    "@id": `${canonicalUrl}#person`,
    name: profile.full_name,
    url: canonicalUrl,
  };
  if (profile.alternative_names) person.alternateName = profile.alternative_names;
  if (profile.portrait_url) person.image = profile.portrait_url;
  if (profile.short_bio) person.description = profile.short_bio.slice(0, 300);
  if (profile.birth_date) person.birthDate = profile.birth_date;
  if (profile.death_date) person.deathDate = profile.death_date;
  if (profile.birth_place) person.birthPlace = profile.birth_place;
  if (profile.death_place) person.deathPlace = profile.death_place;
  if (profile.occupation) person.jobTitle = profile.occupation;
  if (profile.nationality) person.nationality = profile.nationality;
  return person;
}

function buildSchemaLD(profile, canonicalUrl, title, description) {
  const person = buildPersonSchema(profile, canonicalUrl);
  const profilePage = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": canonicalUrl,
    name: title,
    description: description,
    url: canonicalUrl,
    dateModified: profile.updated_at || profile.published_at || new Date().toISOString(),
    mainEntity: person,
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Family Directory", item: SITE_URL + "/family" },
      { "@type": "ListItem", position: 3, name: profile.full_name, item: canonicalUrl },
    ],
  };

  return [profilePage, breadcrumb];
}

/* ------------------------------------------------------------------ */
/* HTML sections                                                        */
/* ------------------------------------------------------------------ */

const SECTION_FIELDS = [
  ["short_bio", "Overview"],
  ["full_bio", "Full Biography"],
  ["early_life", "Early Life"],
  ["family_background", "Family Background"],
  ["education", "Education"],
  ["career", "Career"],
  ["business_activities", "Business Activities"],
  ["historical_context", "Historical Context"],
  ["personal_life", "Personal Life"],
  ["achievements", "Achievements"],
  ["philanthropy", "Philanthropy"],
  ["legacy", "Legacy"],
  ["interesting_facts", "Interesting Facts"],
  ["quotes", "Quotes"],
];

const REL_LABELS = {
  father: "Father", mother: "Mother", spouse: "Spouse",
  son: "Son", daughter: "Daughter", sibling: "Sibling",
  relative: "Relative", other: "Related",
};

function renderFacts(profile) {
  const facts = [
    ["Birth Date", formatDateLong(profile.birth_date)],
    ["Death Date", formatDateLong(profile.death_date)],
    ["Birthplace", profile.birth_place],
    ["Death Place", profile.death_place],
    ["Nationality", profile.nationality],
    ["Family Branch", profile.family_branch],
    ["Occupation", profile.occupation],
  ].filter(([, v]) => v);
  if (!facts.length) return "";
  return `<section class="profile-facts-section"><div class="container"><div class="profile-facts-grid">${facts.map(([l, v]) => `<div class="fact-item"><div class="fact-label">${esc(l)}</div><div class="fact-value">${esc(v)}</div></div>`).join("")}</div></div></section>`;
}

function renderBiographySections(profile) {
  const sections = SECTION_FIELDS.filter(([f]) => profile[f] && String(profile[f]).trim().length > 0);
  if (!sections.length) return `<p class="profile-section-body">No biography content has been added for this profile yet.</p>`;
  return sections.map(([f, label]) => {
    if (f === "quotes") return `<article><h2 class="profile-section-title">${esc(label)}</h2><div class="profile-quote">${esc(profile[f])}</div></article>`;
    return `<article><h2 class="profile-section-title">${esc(label)}</h2><div class="profile-section-body">${paragraphsHtml(String(profile[f]))}</div></article>`;
  }).join("");
}

function renderRelatives(relationships) {
  const valid = (relationships || []).filter(r => r.profiles?.full_name || r.full_name);
  if (!valid.length) return "";
  return `<div class="sidebar-card"><h3 class="sidebar-heading">Related Family Members</h3><div class="relative-list">${valid.map(r => {
    const name = r.profiles?.full_name || r.full_name;
    const slug = r.profiles?.slug || r.slug;
    const portrait = r.profiles?.portrait_url || r.portrait_url || "assets/images/05_archival_family_photo.jpg";
    const role = REL_LABELS[r.relationship_type || r.type] || (r.relationship_type || r.type);
    return `<div class="relative-item"><span class="relative-avatar"><img src="${esc(portrait)}" alt="Portrait of ${esc(name)}" loading="lazy" width="48" height="48" /></span><div class="relative-info">${slug ? `<a href="${SITE_URL}/family/${encodeURIComponent(slug)}/">${esc(name)}</a>` : `<span>${esc(name)}</span>`}<span class="relative-role">${esc(role)}</span></div></div>`;
  }).join("")}</div></div>`;
}

function renderSources(sources) {
  if (!sources?.length) return "";
  return `<div class="sidebar-card"><h3 class="sidebar-heading">Sources &amp; References</h3><ul class="source-list">${sources.map(s => `<li>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("")}</ul></div>`;
}

function renderGallery(gallery) {
  if (!gallery?.length) return "";
  return `<div class="sidebar-card"><h3 class="sidebar-heading">Photo Gallery</h3><div class="gallery-grid">${gallery.map(g => `<img src="${esc(g.image_url)}" alt="${esc(g.caption || "")}" loading="lazy" />`).join("")}</div></div>`;
}

/* ------------------------------------------------------------------ */
/* Full HTML page builder                                               */
/* ------------------------------------------------------------------ */

function buildHtml(profile, canonicalUrl, title, description) {
  const schemas = buildSchemaLD(profile, canonicalUrl, title, description);
  const schemaJson = schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n");
  const ogImage = profile.portrait_url || `${SITE_URL}/assets/images/01_logo_emblem_transparent.png`;
  const span = lifespanStr(profile);
  const tags = [profile.occupation, profile.titles].filter(Boolean);
  const sidebarParts = [renderRelatives(profile.relationships), renderGallery(profile.gallery), renderSources(profile.sources)].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(canonicalUrl)}" />
<meta name="robots" content="${profile.seo_noindex ? 'noindex, nofollow' : 'index, follow'}" />

<!-- Open Graph -->
<meta property="og:type" content="profile" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(canonicalUrl)}" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta property="og:site_name" content="The Rothschild Family" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(ogImage)}" />

<!-- Structured Data -->
${schemaJson}

<link rel="icon" href="/assets/images/01_logo_emblem_transparent.png" type="image/png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Cormorant+Garamond:ital,wght@0,500;1,500;1,600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/css/variables.css" />
<link rel="stylesheet" href="/css/global.css" />
<link rel="stylesheet" href="/css/header.css" />
<link rel="stylesheet" href="/css/profile.css" />
<link rel="stylesheet" href="/css/responsive.css" />
<!-- Smartsupp Live Chat script -->
<script type="text/javascript">
var _smartsupp = _smartsupp || {};
_smartsupp.key = '67eba19d6e094648928f86ae393126790c9307a8';
window.smartsupp||(function(d) {
  var s,c,o=smartsupp=function(){ o._.push(arguments)};o._=[];
  s=d.getElementsByTagName('script')[0];c=d.createElement('script');
  c.type='text/javascript';c.charset='utf-8';c.async=true;
  c.src='https://www.smartsuppchat.com/loader.js?';s.parentNode.insertBefore(c,s);
})(document);
</script>
<noscript>Powered by <a href="https://www.smartsupp.com" target="_blank">Smartsupp</a></noscript>
</head>
<body>

<!-- HEADER -->
<header class="site-header">
  <div class="container">
    <a href="/" class="brand" aria-label="The Rothschild Family — Home">
      <img src="/assets/images/01_logo_emblem_transparent.png" alt="Rothschild Emblem" class="monogram" />
      <span class="brand-text">
        <span class="brand-name">ROTHSCHILD</span>
        <span class="brand-subtitle">The Family &middot; Est. 1760</span>
      </span>
    </a>
    <div class="header-tagline" aria-hidden="true">
      <span>Legacy</span><span>Vision</span><span>Continuity</span>
    </div>
    <button class="hamburger" id="navToggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="navDrawer">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </button>
  </div>
</header>

<!-- NAV DRAWER -->
<div class="nav-drawer" id="navDrawer" data-open="false">
  <div class="nav-drawer-backdrop" data-nav-close></div>
  <nav class="nav-drawer-panel" aria-label="Primary">
    <div class="nav-drawer-header">
      <span class="brand-name">Navigate</span>
      <button class="nav-drawer-close" data-nav-close aria-label="Close navigation menu">&times;</button>
    </div>
    <ul class="nav-drawer-links">
      <li><a href="/">Home <span class="arrow">&rsaquo;</span></a></li>
      <li><a href="/family" class="active">Our Family <span class="arrow">&rsaquo;</span></a></li>
      <li><a href="/history">Our History <span class="arrow">&rsaquo;</span></a></li>
      <li><a href="/archive">The Archive <span class="arrow">&rsaquo;</span></a></li>
      <li><a href="/about">About Us <span class="arrow">&rsaquo;</span></a></li>
      <li><a href="/contact">Contact <span class="arrow">&rsaquo;</span></a></li>
    </ul>
    <p class="nav-drawer-foot">&ldquo;Concordia &middot; Integritas &middot; Fortitudo&rdquo;</p>
  </nav>
</div>

<main id="profileMain">

  <!-- PROFILE HERO -->
  <section class="profile-hero">
    <div class="container">
      <div class="profile-hero-inner">
        <div class="profile-portrait">
          <img
            src="${esc(profile.portrait_url || "/assets/images/05_archival_family_photo.jpg")}"
            alt="Portrait of ${esc(profile.full_name)}"
            width="300" height="380"
            loading="eager"
            fetchpriority="high"
          />
        </div>
        <div>
          <nav aria-label="Breadcrumb">
            <p class="profile-breadcrumb">
              <a href="/">Home</a> &rsaquo;
              <a href="/family">Family</a> &rsaquo;
              <span>${esc(profile.full_name)}</span>
            </p>
          </nav>
          <h1 class="profile-name">${esc(profile.full_name)}</h1>
          ${profile.alternative_names ? `<p class="profile-alt-names">also known as ${esc(profile.alternative_names)}</p>` : ""}
          ${span ? `<p class="profile-lifespan">${esc(span)}</p>` : ""}
          ${tags.length ? `<div class="profile-tags">${tags.map(t => `<span class="profile-tag">${esc(t)}</span>`).join("")}</div>` : ""}
          ${profile.facebook_url ? `<div style="margin-top:1.2rem;"><a href="${esc(profile.facebook_url)}" target="_blank" rel="noopener noreferrer" style="color:#c9a84c;text-decoration:none;font-size:0.95rem;">Official Facebook Profile</a></div>` : ""}
        </div>
      </div>
    </div>
  </section>

  ${renderFacts(profile)}

  <section class="profile-body-section">
    <div class="container">
      <div class="profile-layout">
        <div class="profile-content">
          ${renderBiographySections(profile)}
        </div>
        ${sidebarParts.length ? `<aside class="profile-sidebar">${sidebarParts.join("")}</aside>` : ""}
      </div>
    </div>
  </section>

</main>

<!-- FOOTER -->
<footer class="site-footer tex-filigree">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <img src="/assets/images/01_logo_emblem_transparent.png" alt="Rothschild Emblem" class="monogram" />
          <span class="footer-brand-text"><span class="name">ROTHSCHILD</span><br /><span class="tag">The Family &middot; Est. 1760</span></span>
        </div>
        <p class="footer-about-text">The official record of the Rothschild family &mdash; our biographies, timelines and primary-source materials, preserved for future generations.</p>
      </div>
      <div>
        <p class="footer-heading">Explore</p>
        <ul class="footer-links">
          <li><a href="/family">Our Family Directory</a></li>
          <li><a href="/history">Our History &amp; Timeline</a></li>
          <li><a href="/archive">The Archive</a></li>
          <li><a href="/about">About Us</a></li>
        </ul>
      </div>
      <div>
        <p class="footer-heading">The Family</p>
        <ul class="footer-links">
          <li><a href="/about">Our Mission</a></li>
          <li><a href="/contact">Contact</a></li>
        </ul>
      </div>
      <div>
        <p class="footer-heading">Correspondence</p>
        <ul class="footer-links">
          <li><a href="/contact">Send a Message</a></li>
          <li><a href="mailto:contact@davidrenederothschild.com" style="text-transform:lowercase;">contact@davidrenederothschild.com</a></li>
        </ul>
      </div>
    </div>
    <p class="footer-disclaimer">Concordia &middot; Integritas &middot; Fortitudo. The Rothschild family has maintained its commitment to these values since our founding in Frankfurt in 1760.</p>
    <div class="footer-bottom">
      <span>&copy; <span id="year"></span> The Rothschild Family. All rights reserved.</span>
      <span>Est. Frankfurt, 1760</span>
    </div>
  </div>
</footer>

<script src="/js/config.js"></script>
<script src="/js/app.js"></script>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Handler                                                              */
/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    res.status(404).end("Not Found");
    return;
  }

  let profile;
  try {
    profile = await fetchProfile(slug);
  } catch (err) {
    console.error("[SEO profile] fetch error:", err);
    res.status(500).end("Internal Server Error");
    return;
  }

  if (!profile) {
    res.status(404).setHeader("Content-Type", "text/html; charset=utf-8").end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Profile Not Found | Rothschild</title>
<link rel="stylesheet" href="/css/variables.css"><link rel="stylesheet" href="/css/global.css">
<link rel="stylesheet" href="/css/header.css"><link rel="stylesheet" href="/css/responsive.css"></head>
<body><main style="padding:4rem 2rem;text-align:center;">
<h1>Biography Not Found</h1>
<p>We could not find a published profile matching that address.</p>
<a href="/family" style="color:#c9a84c;">Return to the Family Directory &rsaquo;</a>
</main></body></html>`);
    return;
  }

  const canonicalUrl = `${SITE_URL}/family/${encodeURIComponent(slug)}/`;
  const title = generateTitle(profile);
  const description = generateDescription(profile);
  const html = buildHtml(profile, canonicalUrl, title, description);

  res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    .end(html);
}
