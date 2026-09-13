/**
 * Individual profile page.
 * Reads ?slug=... from the URL, loads the profile (+ relationships, gallery,
 * sources) from Supabase, and renders only the sections that have content.
 * Falls back to a small static sample set when Supabase isn't configured.
 */
import { supabase } from "./supabase-client.js";

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

const RELATIONSHIP_LABELS = {
  father: "Father",
  mother: "Mother",
  spouse: "Spouse",
  son: "Son",
  daughter: "Daughter",
  sibling: "Sibling",
  relative: "Relative",
  other: "Related",
};

const SAMPLE_PROFILES = {
  "mayer-amschel-rothschild": {
    full_name: "Mayer Amschel Rothschild",
    alternative_names: "Mayer Amschel Bauer",
    birth_date: "1744-02-23",
    death_date: "1812-09-19",
    birth_place: "Frankfurt am Main, Holy Roman Empire",
    death_place: "Frankfurt am Main",
    nationality: "German",
    family_branch: "Frankfurt",
    occupation: "Banker, Coin Dealer",
    titles: "Founder of the House of Rothschild",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    short_bio: "Mayer Amschel Rothschild was the founder of the Rothschild banking dynasty, building a coin-trading and banking business in Frankfurt that his five sons expanded across Europe.",
    full_bio: "Born in the Judengasse of Frankfurt, Mayer Amschel Rothschild began his working life as an apprentice at a bank in Hanover before returning to Frankfurt to establish his own trading house. Over several decades he built a reputation as a dealer in rare coins and, later, as a financial agent to the Landgrave of Hesse-Kassel.",
    early_life: "Mayer Amschel was born to a family of moneylenders and merchants in the Frankfurt ghetto. He was educated for the rabbinate before turning to commerce after his parents' early deaths.",
    family_background: "The Rothschild (originally Bauer) family had lived in the Frankfurt Judengasse for generations, taking the name 'Rothschild' from the red shield (Roth Schild) that marked their ancestral house.",
    career: "Mayer Amschel built his fortune as a coin dealer before becoming a court factor and financial agent, laying the groundwork for a banking network his sons would extend to London, Paris, Vienna and Naples.",
    achievements: "Established what would become one of the most influential banking houses in European history, and pioneered an early cross-border financial network operated by his five sons.",
    legacy: "His five sons, sent to the great financial centers of Europe, expanded the family enterprise into an international banking network that played a major role in 19th-century European finance.",
    interesting_facts: "Mayer Amschel is widely quoted, on uncertain sourcing, with sayings about finance and family unity; readers should treat undocumented quotations with caution.",
    father_name: null,
    mother_name: null,
    spouse_name: "Gutle Schnapper",
    children: [
      { slug: "nathan-mayer-rothschild", full_name: "Nathan Mayer Rothschild" },
      { slug: "james-mayer-de-rothschild", full_name: "James Mayer de Rothschild" },
    ],
    sources: [
      { label: "Ferguson, Niall — The House of Rothschild: Money's Prophets, 1798–1848", url: "" },
      { label: "Encyclopaedia Britannica — Mayer Amschel Rothschild", url: "" },
    ],
  },
  "nathan-mayer-rothschild": {
    full_name: "Nathan Mayer Rothschild",
    birth_date: "1777-09-16",
    death_date: "1836-07-28",
    birth_place: "Frankfurt am Main",
    death_place: "Frankfurt am Main",
    nationality: "British (naturalized)",
    family_branch: "London",
    occupation: "Banker",
    titles: "Founder, N M Rothschild & Sons",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    short_bio: "Nathan Mayer Rothschild established the London branch of the family bank, N M Rothschild & Sons, and became one of the most prominent financiers of his era.",
    full_bio: "Nathan relocated first to Manchester to trade textiles before settling in London, where he founded N M Rothschild & Sons. His firm played a documented role in financing the British government during the Napoleonic Wars and in subsequent government bond issues.",
    career: "Built the London merchant bank into a central pillar of British and European finance during the early 19th century.",
    business_activities: "Underwrote government loans, dealt in bullion, and financed major infrastructure and government projects across Europe.",
    historical_context: "His firm's financial activities intersected with major events of the era, including the financing surrounding the Napoleonic Wars; some popular anecdotes about his personal conduct during this period are unverified and are presented here only where documented by historians.",
    father_name: "Mayer Amschel Rothschild",
    spouse_name: "Hannah Barent Cohen",
    sources: [
      { label: "Ferguson, Niall — The House of Rothschild: Money's Prophets, 1798–1848", url: "" },
    ],
  },
  "james-mayer-de-rothschild": {
    full_name: "James Mayer de Rothschild",
    birth_date: "1792-05-15",
    death_date: "1868-11-15",
    birth_place: "Frankfurt am Main",
    death_place: "Paris, France",
    nationality: "French",
    family_branch: "Paris",
    occupation: "Banker",
    titles: "Founder, de Rothschild Frères",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    short_bio: "James Mayer de Rothschild founded the French branch of the family and built de Rothschild Frères into a leading Parisian bank.",
    career: "Financed French railways and government bonds, establishing the Paris house as a major force in 19th-century French finance.",
    father_name: "Mayer Amschel Rothschild",
    sources: [],
  },
};

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function paragraphsHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

async function fetchProfile(slug) {
  if (supabase) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (!error && profile) {
      const [{ data: relationships }, { data: images }, { data: sources }] = await Promise.all([
        supabase
          .from("family_relationships")
          .select("relationship_type, related_profile_id, profiles!family_relationships_related_profile_id_fkey(slug, full_name, portrait_url)")
          .eq("profile_id", profile.id),
        supabase.from("profile_images").select("image_url, caption").eq("profile_id", profile.id),
        supabase.from("sources").select("label, url").eq("profile_id", profile.id),
      ]);

      profile.relationships = (relationships || []).map((r) => ({
        type: r.relationship_type,
        slug: r.profiles?.slug,
        full_name: r.profiles?.full_name,
        portrait_url: r.profiles?.portrait_url,
      }));
      profile.gallery = images || [];
      profile.sources = sources || [];
      return profile;
    }

    if (error) {
      console.warn("[Rothschild] Supabase profile lookup failed, falling back to sample data:", error.message);
    }
  }

  const sample = SAMPLE_PROFILES[slug];
  if (!sample) return null;

  const relationships = [];
  if (sample.father_name) relationships.push({ type: "father", full_name: sample.father_name, slug: findSlugByName(sample.father_name) });
  if (sample.mother_name) relationships.push({ type: "mother", full_name: sample.mother_name, slug: findSlugByName(sample.mother_name) });
  if (sample.spouse_name) relationships.push({ type: "spouse", full_name: sample.spouse_name, slug: findSlugByName(sample.spouse_name) });
  (sample.children || []).forEach((c) => relationships.push({ type: "son", full_name: c.full_name, slug: c.slug }));

  return { ...sample, relationships, gallery: [], sources: sample.sources || [] };
}

function findSlugByName(name) {
  const entry = Object.entries(SAMPLE_PROFILES).find(([, v]) => v.full_name === name);
  return entry ? entry[0] : null;
}

function renderFacts(profile) {
  const facts = [
    ["Birth Date", formatDate(profile.birth_date)],
    ["Death Date", formatDate(profile.death_date)],
    ["Birthplace", profile.birth_place],
    ["Death Place", profile.death_place],
    ["Nationality", profile.nationality],
    ["Family Branch", profile.family_branch],
  ].filter(([, value]) => value);

  if (facts.length === 0) return "";

  return `
    <section class="profile-facts-section">
      <div class="container">
        <div class="profile-facts-grid">
          ${facts
            .map(
              ([label, value]) => `
            <div class="fact-item">
              <div class="fact-label">${escapeHtml(label)}</div>
              <div class="fact-value">${escapeHtml(value)}</div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderSections(profile) {
  const sections = SECTION_FIELDS.filter(([field]) => profile[field] && String(profile[field]).trim().length > 0);
  if (sections.length === 0) {
    return `<p class="profile-section-body">No biography content has been added for this profile yet.</p>`;
  }

  return sections
    .map(([field, label]) => {
      if (field === "quotes") {
        return `
          <article>
            <h2 class="profile-section-title">${escapeHtml(label)}</h2>
            <div class="profile-quote">${escapeHtml(profile[field])}</div>
          </article>
        `;
      }
      return `
        <article>
          <h2 class="profile-section-title">${escapeHtml(label)}</h2>
          <div class="profile-section-body">${paragraphsHtml(String(profile[field]))}</div>
        </article>
      `;
    })
    .join("");
}

function renderRelatives(relationships) {
  const valid = (relationships || []).filter((r) => r.full_name);
  if (valid.length === 0) return "";

  return `
    <div class="sidebar-card">
      <h3 class="sidebar-heading">Related Family Members</h3>
      <div class="relative-list">
        ${valid
          .map(
            (r) => `
          <div class="relative-item">
            <span class="relative-avatar"><img src="${escapeHtml(r.portrait_url) || "assets/images/05_archival_family_photo.jpg"}" alt="" /></span>
            <div class="relative-info">
              ${
                r.slug
                  ? `<a href="profile.html?slug=${encodeURIComponent(r.slug)}">${escapeHtml(r.full_name)}</a>`
                  : `<span>${escapeHtml(r.full_name)}</span>`
              }
              <span class="relative-role">${escapeHtml(RELATIONSHIP_LABELS[r.type] || r.type)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderGallery(gallery) {
  if (!gallery || gallery.length === 0) return "";
  return `
    <div class="sidebar-card">
      <h3 class="sidebar-heading">Photo Gallery</h3>
      <div class="gallery-grid">
        ${gallery.map((g) => `<img src="${escapeHtml(g.image_url)}" alt="${escapeHtml(g.caption || "")}" loading="lazy" />`).join("")}
      </div>
    </div>
  `;
}

function renderSources(sources) {
  if (!sources || sources.length === 0) return "";
  return `
    <div class="sidebar-card">
      <h3 class="sidebar-heading">Sources &amp; References</h3>
      <ul class="source-list">
        ${sources
          .map((s) => `<li>${s.url ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a>` : escapeHtml(s.label)}</li>`)
          .join("")}
      </ul>
    </div>
  `;
}

function renderProfile(profile) {
  document.getElementById("pageTitle").textContent = `${profile.full_name} | Rothschild Illuminati Organization`;
  document.getElementById("pageDescription").setAttribute("content", profile.short_bio || `Biography of ${profile.full_name}.`);

  const tags = [profile.occupation, profile.titles].filter(Boolean);
  const sidebarParts = [renderRelatives(profile.relationships), renderGallery(profile.gallery), renderSources(profile.sources)].filter(Boolean);

  const html = `
    <section class="profile-hero">
      <div class="container">
        <div class="profile-hero-inner">
          <div class="profile-portrait">
            <img src="${escapeHtml(profile.portrait_url) || "assets/images/05_archival_family_photo.jpg"}" alt="Portrait of ${escapeHtml(profile.full_name)}" />
          </div>
          <div>
            <p class="profile-breadcrumb"><a href="index.html">Home</a> &rsaquo; <a href="family.html">Family</a> &rsaquo; ${escapeHtml(profile.full_name)}</p>
            <h1 class="profile-name">${escapeHtml(profile.full_name)}</h1>
            ${profile.alternative_names ? `<p class="profile-alt-names">also known as ${escapeHtml(profile.alternative_names)}</p>` : ""}
            ${tags.length ? `<div class="profile-tags">${tags.map((t) => `<span class="profile-tag">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
            ${profile.facebook_url ? `<div style="margin-top: 1.2rem;"><a href="${escapeHtml(profile.facebook_url)}" target="_blank" rel="noopener noreferrer" style="color: #c9a84c; text-decoration: none; font-size: 0.95rem; display: inline-flex; align-items: center; gap: 0.5rem; letter-spacing: 0.05em;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg> Official Facebook Profile</a></div>` : ""}
          </div>
        </div>
      </div>
    </section>

    ${renderFacts(profile)}

    <section class="profile-body-section">
      <div class="container">
        <div class="profile-layout">
          <div class="profile-content">
            ${renderSections(profile)}
          </div>
          ${sidebarParts.length ? `<aside class="profile-sidebar">${sidebarParts.join("")}</aside>` : ""}
        </div>
      </div>
    </section>
  `;

  document.getElementById("profileMain").innerHTML = html;
}

function renderNotFound() {
  document.getElementById("profileMain").innerHTML = `
    <div class="profile-not-found">
      <h1>Biography Not Found</h1>
      <p>We could not find a published profile matching that address.</p>
      <a href="family.html" class="btn btn-outline-gold">Return to the Family Directory</a>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async function () {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    renderNotFound();
    return;
  }

  const profile = await fetchProfile(slug);
  if (!profile) {
    renderNotFound();
    return;
  }

  renderProfile(profile);
});
