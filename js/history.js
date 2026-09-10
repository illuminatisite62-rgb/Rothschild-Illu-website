/**
 * History / Timeline page — loads published timeline events from Supabase,
 * falls back to a static sample timeline when Supabase isn't configured.
 */
import { supabase } from "./supabase-client.js";

const SAMPLE_EVENTS = [
  { year: "1760", title: "A Trading House Founded", category: "Founding", description: "Mayer Amschel Rothschild begins a coin and antiquities trading business in Frankfurt's Judengasse.", image_url: "" },
  { year: "1798", title: "Expansion to London", category: "Expansion", description: "Nathan Mayer Rothschild relocates to Manchester to trade textiles, later founding the London banking house.", image_url: "" },
  { year: "1811", title: "N M Rothschild & Sons Founded", category: "Banking", description: "Nathan Mayer Rothschild formally establishes his London merchant bank.", image_url: "" },
  { year: "1815", title: "The Napoleonic Wars", category: "Finance", description: "The family's financial network plays a documented role in financing coalition forces during the Napoleonic Wars.", image_url: "" },
  { year: "1817", title: "Vienna and Naples Branches", category: "Expansion", description: "Salomon and Carl Rothschild establish banking houses in Vienna and Naples, completing the family's five-branch network.", image_url: "" },
  { year: "1836", title: "de Rothschild Frères Grows", category: "Banking", description: "James Mayer de Rothschild builds the Paris house into a leading financier of French infrastructure.", image_url: "" },
  { year: "1875", title: "The Suez Canal Loan", category: "Finance", description: "The London house finances the British government's acquisition of Suez Canal Company shares.", image_url: "" },
  { year: "1885", title: "Natural History Museum Support", category: "Philanthropy", description: "Family members support scientific and cultural institutions across Europe through philanthropic giving.", image_url: "" },
  { year: "1917", title: "The Balfour Declaration", category: "History", description: "The Balfour Declaration is addressed to Walter Rothschild, 2nd Baron Rothschild, a documented historical event.", image_url: "" },
  { year: "1980", title: "Modern Diversification", category: "Business", description: "Family-connected financial and business ventures continue to diversify into asset management, wine and hospitality.", image_url: "" },
];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function loadEvents() {
  if (!supabase) return SAMPLE_EVENTS;

  const { data, error } = await supabase
    .from("timeline_events")
    .select("year, title, category, description, image_url")
    .eq("status", "published")
    .order("display_order", { ascending: true });

  if (error) {
    console.warn("[Rothschild] Could not load timeline events, using sample data:", error.message);
    return SAMPLE_EVENTS;
  }

  return data && data.length > 0 ? data : SAMPLE_EVENTS;
}

function eventCard(e) {
  return `
    <div class="timeline-event">
      <div class="timeline-card">
        <div class="timeline-card-year">${escapeHtml(e.year)}</div>
        ${e.category ? `<span class="timeline-card-category">${escapeHtml(e.category)}</span>` : ""}
        <h3 class="timeline-card-title">${escapeHtml(e.title)}</h3>
        ${e.image_url ? `<img src="${escapeHtml(e.image_url)}" alt="" loading="lazy" />` : ""}
        <p class="timeline-card-desc">${escapeHtml(e.description || "")}</p>
      </div>
    </div>
  `;
}

function renderFilters(events, activeCategory, onSelect) {
  const categories = ["All", ...new Set(events.map((e) => e.category).filter(Boolean))];
  const el = document.getElementById("timelineFilters");
  el.innerHTML = categories
    .map(
      (c) => `<button type="button" class="timeline-filter-btn${c === activeCategory ? " active" : ""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    )
    .join("");

  el.querySelectorAll(".timeline-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.getAttribute("data-category")));
  });
}

function renderRail(events) {
  const rail = document.getElementById("timelineRail");
  if (events.length === 0) {
    rail.innerHTML = `<p class="timeline-empty">No timeline events match this category yet.</p>`;
    return;
  }
  rail.innerHTML = events.map(eventCard).join("");
}

document.addEventListener("DOMContentLoaded", async function () {
  const allEvents = await loadEvents();
  let activeCategory = "All";

  function update() {
    renderFilters(allEvents, activeCategory, (category) => {
      activeCategory = category;
      update();
    });
    const filtered = activeCategory === "All" ? allEvents : allEvents.filter((e) => e.category === activeCategory);
    renderRail(filtered);
  }

  update();
});
