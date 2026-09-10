/**
 * Archive page — loads published media items from Supabase, falls back to a
 * static sample set when Supabase isn't configured.
 */
import { supabase } from "./supabase-client.js";

const SAMPLE_ITEMS = [
  { title: "Frankfurt Banking Ledger, 1804", media_type: "Documents", date_label: "1804", description: "A ledger page from the early Frankfurt trading house.", file_url: "assets/images/11_old_script_texture.jpg" },
  { title: "Family Portrait, Late 19th Century", media_type: "Photographs", date_label: "c. 1890", description: "A formal family portrait from the archival collection.", file_url: "assets/images/05_archival_family_photo.jpg" },
  { title: "Correspondence Fragment", media_type: "Letters", date_label: "1815", description: "A fragment of period correspondence relating to wartime finance.", file_url: "assets/images/11_old_script_texture.jpg" },
  { title: "European Trade Map", media_type: "Historical Records", date_label: "c. 1820", description: "A period map illustrating European trade routes.", file_url: "assets/images/13_old_map_texture.jpg" },
  { title: "Family Crest Engraving", media_type: "Collections", date_label: "Undated", description: "An engraved rendering of the family coat of arms.", file_url: "assets/images/03_hero_crest_engraving.png" },
  { title: "Archival Reading Room", media_type: "Collections", date_label: "Undated", description: "Bound volumes and reference material held in the archive.", file_url: "assets/images/08_archive_books_globe.jpg" },
  { title: "Classical Architecture Study", media_type: "Photographs", date_label: "c. 1900", description: "A study of period European architecture associated with the family's holdings.", file_url: "assets/images/04_hero_classical_architecture.jpg" },
  { title: "Wax Seal Impression", media_type: "Documents", date_label: "Undated", description: "A wax seal impression used on formal correspondence.", file_url: "assets/images/06_red_wax_seal_transparent.png" },
];

const CATEGORIES = ["All", "Photographs", "Documents", "Letters", "Historical Records", "Videos", "Collections"];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadItems() {
  if (!supabase) return SAMPLE_ITEMS;

  const { data, error } = await supabase
    .from("media")
    .select("title, media_type, date_label, description, file_url")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[Rothschild] Could not load archive media, using sample data:", error.message);
    return SAMPLE_ITEMS;
  }

  return data && data.length > 0 ? data : SAMPLE_ITEMS;
}

function itemCard(item, index) {
  return `
    <article class="archive-item" data-index="${index}" tabindex="0" role="button" aria-label="View ${escapeHtml(item.title)}">
      <div class="archive-item-media">
        <img src="${escapeHtml(item.file_url)}" alt="${escapeHtml(item.title)}" loading="lazy" />
        <span class="archive-item-type">${escapeHtml(item.media_type)}</span>
      </div>
      <div class="archive-item-body">
        <h3 class="archive-item-title">${escapeHtml(item.title)}</h3>
        <p class="archive-item-date">${escapeHtml(item.date_label || "")}</p>
        <p class="archive-item-desc">${escapeHtml(item.description || "")}</p>
      </div>
    </article>
  `;
}

function renderFilters(activeCategory, onSelect) {
  const el = document.getElementById("archiveFilters");
  el.innerHTML = CATEGORIES.map(
    (c) => `<button type="button" class="archive-filter-btn${c === activeCategory ? " active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
  ).join("");

  el.querySelectorAll(".archive-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.getAttribute("data-category")));
  });
}

function initLightboxChrome() {
  const lightbox = document.getElementById("lightbox");
  document.getElementById("lightboxClose").addEventListener("click", () => lightbox.setAttribute("data-open", "false"));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.setAttribute("data-open", "false");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") lightbox.setAttribute("data-open", "false");
  });
}

function openLightbox(item) {
  document.getElementById("lightboxImage").src = item.file_url;
  document.getElementById("lightboxImage").alt = item.title;
  document.getElementById("lightboxTitle").textContent = item.title;
  document.getElementById("lightboxDesc").textContent = item.description || "";
  document.getElementById("lightbox").setAttribute("data-open", "true");
}

document.addEventListener("DOMContentLoaded", async function () {
  const allItems = await loadItems();
  let activeCategory = "All";
  let currentFiltered = allItems;

  function update() {
    renderFilters(activeCategory, (category) => {
      activeCategory = category;
      update();
    });
    currentFiltered = activeCategory === "All" ? allItems : allItems.filter((i) => i.media_type === activeCategory);
    const grid = document.getElementById("archiveGrid");
    grid.innerHTML = currentFiltered.length
      ? currentFiltered.map(itemCard).join("")
      : `<p class="archive-empty">No items in this category yet.</p>`;
  }

  update();
  initLightboxChrome();

  document.getElementById("archiveGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".archive-item");
    if (!card) return;
    const item = currentFiltered[Number(card.getAttribute("data-index"))];
    if (item) openLightbox(item);
  });
});
