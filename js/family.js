/**
 * Family Directory â€” loads profiles from Supabase (published only),
 * falls back to a small static sample set when Supabase isn't configured.
 * All search/filter/sort happens client-side over the loaded set.
 */
import { supabase } from "./supabase-client.js";

const PAGE_SIZE = 9;

const SAMPLE_PROFILES = [
  {
    slug: "mayer-amschel-rothschild",
    full_name: "Mayer Amschel Rothschild",
    birth_date: "1744-02-23",
    death_date: "1812-09-19",
    occupation: "Banker",
    family_branch: "frankfurt",
    short_bio: "Founder of the Rothschild banking dynasty, established in Frankfurt in the 18th century.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: true,
  },
  {
    slug: "nathan-mayer-rothschild",
    full_name: "Nathan Mayer Rothschild",
    birth_date: "1777-09-16",
    death_date: "1836-07-28",
    occupation: "Banker",
    family_branch: "london",
    short_bio: "Founder of N M Rothschild & Sons in London, central to 19th-century European finance.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: true,
  },
  {
    slug: "james-mayer-de-rothschild",
    full_name: "James Mayer de Rothschild",
    birth_date: "1792-05-15",
    death_date: "1868-11-15",
    occupation: "Banker",
    family_branch: "paris",
    short_bio: "Founder of the French branch of the family and de Rothschild FrÃ¨res in Paris.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: true,
  },
  {
    slug: "salomon-mayer-von-rothschild",
    full_name: "Salomon Mayer von Rothschild",
    birth_date: "1774-09-09",
    death_date: "1855-07-27",
    occupation: "Banker",
    family_branch: "vienna",
    short_bio: "Founder of the Vienna branch, S M von Rothschild, and financier of Austrian railways.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: false,
  },
  {
    slug: "carl-mayer-von-rothschild",
    full_name: "Carl Mayer von Rothschild",
    birth_date: "1788-04-24",
    death_date: "1855-03-10",
    occupation: "Banker",
    family_branch: "naples",
    short_bio: "Founder of the Naples branch of the family bank, C. M. de Rothschild e Figli.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: false,
  },
  {
    slug: "lionel-de-rothschild",
    full_name: "Lionel de Rothschild",
    birth_date: "1808-11-22",
    death_date: "1879-06-03",
    occupation: "Banker",
    family_branch: "london",
    short_bio: "Head of the London house and the first person of Jewish faith to sit in the British Parliament.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: false,
  },
  {
    slug: "james-rothschild",
    full_name: "James Rothschild",
    birth_date: "1963-04-24",
    death_date: null,
    occupation: "Philanthropist",
    family_branch: "london",
    short_bio: "A contemporary member of the family active in philanthropic and business ventures.",
    portrait_url: "assets/images/05_archival_family_photo.jpg",
    featured: false,
  },
];

let allProfiles = [];
let visibleCount = PAGE_SIZE;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function lifespanText(birth, death) {
  const b = birth ? new Date(birth).getFullYear() : "?";
  if (!death) return `b. ${b}`;
  const d = new Date(death).getFullYear();
  return `${b} â€“ ${d}`;
}

function centuryOf(dateStr) {
  if (!dateStr) return null;
  const year = new Date(dateStr).getFullYear();
  return Math.ceil(year / 100);
}

async function loadProfiles() {
  if (!supabase) {
    return SAMPLE_PROFILES;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("slug, full_name, occupation, family_branch, short_bio, portrait_url, birth_date, death_date, featured, published_at")
    .eq("status", "published")
    .order("full_name", { ascending: true });

  if (error) {
    console.warn("[Rothschild] Could not load profiles from Supabase, using sample data:", error.message);
    return SAMPLE_PROFILES;
  }

  return data && data.length > 0 ? data : SAMPLE_PROFILES;
}

function getFilters() {
  return {
    search: document.getElementById("searchInput").value.trim().toLowerCase(),
    branch: document.getElementById("branchFilter").value,
    century: document.getElementById("centuryFilter").value,
    occupation: document.getElementById("occupationFilter").value,
    lifeStatus: document.getElementById("statusFilter").value,
    featured: document.getElementById("featuredFilter").value,
    sort: document.getElementById("sortSelect").value,
  };
}

function applyFilters(profiles, filters) {
  let result = profiles.filter((p) => {
    if (filters.search && !p.full_name.toLowerCase().includes(filters.search)) return false;
    if (filters.branch && p.family_branch !== filters.branch) return false;
    if (filters.century && String(centuryOf(p.birth_date)) !== filters.century) return false;
    if (filters.occupation && (p.occupation || "").toLowerCase() !== filters.occupation) return false;
    if (filters.lifeStatus === "living" && p.death_date) return false;
    if (filters.lifeStatus === "historical" && !p.death_date) return false;
    if (filters.featured === "true" && !p.featured) return false;
    return true;
  });

  switch (filters.sort) {
    case "name-desc":
      result.sort((a, b) => b.full_name.localeCompare(a.full_name));
      break;
    case "birth-asc":
      result.sort((a, b) => new Date(a.birth_date || 0) - new Date(b.birth_date || 0));
      break;
    case "birth-desc":
      result.sort((a, b) => new Date(b.birth_date || 0) - new Date(a.birth_date || 0));
      break;
    case "recent":
      result.sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));
      break;
    default:
      result.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }

  return result;
}

function cardTemplate(p) {
  return `
    <article class="profile-card">
      <div class="profile-card-media">
        <img src="${escapeHtml(p.portrait_url) || "assets/images/05_archival_family_photo.jpg"}" alt="Portrait of ${escapeHtml(p.full_name)}" loading="lazy" />
        ${p.family_branch ? `<span class="profile-card-branch">${escapeHtml(p.family_branch)}</span>` : ""}
        ${p.featured ? `<span class="profile-card-featured" title="Featured">&#9733;</span>` : ""}
      </div>
      <div class="profile-card-body">
        <h3 class="profile-card-name">${escapeHtml(p.full_name)}</h3>
        <p class="profile-card-life">${lifespanText(p.birth_date, p.death_date)}</p>
        ${p.occupation ? `<p class="profile-card-role">${escapeHtml(p.occupation)}</p>` : ""}
        <p class="profile-card-bio">${escapeHtml(p.short_bio || "")}</p>
        <a href="/family/${encodeURIComponent(p.slug)}" class="profile-card-link">View Biography</a>
      </div>
    </article>
  `;
}

function render() {
  const filters = getFilters();
  const filtered = applyFilters(allProfiles, filters);
  const grid = document.getElementById("directoryGrid");
  const countEl = document.getElementById("resultsCount");
  const loadMoreWrap = document.getElementById("loadMoreWrap");

  countEl.textContent = `${filtered.length} profile${filtered.length === 1 ? "" : "s"} found`;

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="directory-empty">No profiles match your search. Try adjusting your filters.</p>`;
    loadMoreWrap.hidden = true;
    return;
  }

  const slice = filtered.slice(0, visibleCount);
  grid.innerHTML = slice.map(cardTemplate).join("");
  loadMoreWrap.hidden = visibleCount >= filtered.length;
}

function initToolbar() {
  const toolbar = document.getElementById("directoryToolbar");
  toolbar.addEventListener("input", () => {
    visibleCount = PAGE_SIZE;
    render();
  });
  toolbar.addEventListener("change", () => {
    visibleCount = PAGE_SIZE;
    render();
  });

  document.getElementById("toolbarReset").addEventListener("click", () => {
    toolbar.reset();
    visibleCount = PAGE_SIZE;
    render();
  });

  document.getElementById("loadMoreBtn").addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    render();
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  initToolbar();
  allProfiles = await loadProfiles();
  render();
});

