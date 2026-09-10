/**
 * Homepage-specific behavior: video modal, and dynamic featured profiles /
 * timeline preview loaded from Supabase (falls back to the static markup
 * already in index.html when Supabase isn't configured or has no data yet).
 */
import { supabase } from "./supabase-client.js";

function initVideoModal() {
  const playButton = document.getElementById("playButton");
  const modal = document.getElementById("videoModal");
  const closeBtn = document.getElementById("videoModalClose");
  if (!playButton || !modal) return;

  playButton.addEventListener("click", function () {
    modal.setAttribute("data-open", "true");
  });

  function close() {
    modal.setAttribute("data-open", "false");
  }

  closeBtn?.addEventListener("click", close);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) close();
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function lifespan(birth, death) {
  const b = birth ? new Date(birth).getFullYear() : "?";
  const d = death ? new Date(death).getFullYear() : "Present";
  return `${b} &ndash; ${d}`;
}

async function loadFeaturedProfiles() {
  if (!supabase) return;
  const grid = document.getElementById("featuredProfilesGrid");
  if (!grid) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("slug, full_name, occupation, short_bio, portrait_url, birth_date, death_date")
    .eq("status", "published")
    .eq("featured", true)
    .order("published_at", { ascending: false })
    .limit(3);

  if (error) {
    console.warn("[Rothschild] Could not load featured profiles:", error.message);
    return;
  }

  if (!data || data.length === 0) return;

  grid.innerHTML = data
    .map(
      (p) => `
      <article class="featured-card">
        <div class="featured-card-media">
          <img src="${escapeHtml(p.portrait_url) || "assets/images/05_archival_family_photo.jpg"}" alt="Portrait of ${escapeHtml(p.full_name)}" />
          <span class="featured-card-badge">Featured</span>
        </div>
        <div class="featured-card-body">
          <h3 class="featured-card-name">${escapeHtml(p.full_name)}</h3>
          <p class="featured-card-meta">${lifespan(p.birth_date, p.death_date)} ${p.occupation ? "&middot; " + escapeHtml(p.occupation) : ""}</p>
          <p class="featured-card-bio">${escapeHtml(p.short_bio || "")}</p>
          <a href="profile.html?slug=${encodeURIComponent(p.slug)}" class="featured-card-link">View Biography</a>
        </div>
      </article>
    `
    )
    .join("");
}

async function loadTimelinePreview() {
  if (!supabase) return;
  const track = document.getElementById("timelinePreviewTrack");
  if (!track) return;

  const { data, error } = await supabase
    .from("timeline_events")
    .select("year, title, description")
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .limit(4);

  if (error) {
    console.warn("[Rothschild] Could not load timeline preview:", error.message);
    return;
  }

  if (!data || data.length === 0) return;

  track.innerHTML = data
    .map(
      (e) => `
      <div class="timeline-preview-item">
        <div class="timeline-preview-year">${escapeHtml(e.year)}</div>
        <div class="timeline-preview-title">${escapeHtml(e.title)}</div>
        <p class="timeline-preview-desc">${escapeHtml(e.description || "")}</p>
      </div>
    `
    )
    .join("");
}

/**
 * Applies the admin-editable homepage_content row (see admin/homepage.html)
 * onto the existing static markup. Only text/href content is touched —
 * nothing here changes layout, so an administrator cannot accidentally break
 * the page structure by editing copy.
 */
async function loadHomepageContent() {
  if (!supabase) return;

  const { data, error } = await supabase.from("homepage_content").select("*").eq("id", 1).maybeSingle();

  if (error || !data) {
    if (error) console.warn("[Rothschild] Could not load homepage content:", error.message);
    return;
  }

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  };

  setText("cmsEstablishedText", data.hero_established_text);
  setText("cmsHeroLine1", data.hero_heading_line1);
  setText("cmsHeroLine2", data.hero_heading_line2);
  setText("cmsHeroSubtitle", data.hero_subtitle);
  setText("cmsHeroDescription", data.hero_description);
  setText("cmsArchivalCaptionBottom", data.archival_caption_bottom);
  setText("cmsTaglineText", data.tagline_text);
  setText("cmsFooterAboutText", data.footer_about_text);

  const captionTop = document.getElementById("cmsArchivalCaptionTop");
  if (captionTop && data.archival_caption_top) {
    captionTop.innerHTML = escapeHtml(data.archival_caption_top).replace(/\n/g, "<br />");
  }

  const primaryBtn = document.getElementById("cmsHeroBtnPrimary");
  if (primaryBtn) {
    if (data.hero_button_primary_text) primaryBtn.firstChild.textContent = `${data.hero_button_primary_text} `;
    if (data.hero_button_primary_url) primaryBtn.setAttribute("href", data.hero_button_primary_url);
  }

  const secondaryBtn = document.getElementById("cmsHeroBtnSecondary");
  if (secondaryBtn) {
    if (data.hero_button_secondary_text) secondaryBtn.firstChild.textContent = `${data.hero_button_secondary_text} `;
    if (data.hero_button_secondary_url) secondaryBtn.setAttribute("href", data.hero_button_secondary_url);
  }

  if (data.video_url) {
    const playButton = document.getElementById("playButton");
    playButton?.setAttribute("data-video-url", data.video_url);
  }
}

function initVideoModalContent() {
  const playButton = document.getElementById("playButton");
  const modalMessage = document.getElementById("videoModalMessage");
  if (!playButton || !modalMessage) return;

  playButton.addEventListener("click", () => {
    const videoUrl = playButton.getAttribute("data-video-url");
    if (videoUrl) {
      modalMessage.innerHTML = `<a href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--color-gold-bright); border-bottom: 1px solid var(--color-gold);">Watch the archival footage &rsaquo;</a>`;
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initVideoModal();
  initVideoModalContent();
  loadHomepageContent();
  loadFeaturedProfiles();
  loadTimelinePreview();
});
