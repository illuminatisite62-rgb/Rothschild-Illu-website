/**
 * js/admin/membership.js
 * Admin panel: membership applications inbox.
 * Loads from Supabase `membership_applications` table; allows status updates.
 */
import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

let allApplications = [];
let currentId = null;

/* ------------------------------------------------------------------ */
/* Format helpers                                                       */
/* ------------------------------------------------------------------ */

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function badgeHtml(status) {
  return `<span class="status-badge ${status}">${status}</span>`;
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

function updateStats(apps) {
  const total    = apps.length;
  const pending  = apps.filter(a => a.status === "pending").length;
  const approved = apps.filter(a => a.status === "approved").length;
  const rejected = apps.filter(a => a.status === "rejected").length;
  document.getElementById("statTotal").textContent    = total;
  document.getElementById("statPending").textContent  = pending;
  document.getElementById("statApproved").textContent = approved;
  document.getElementById("statRejected").textContent = rejected;
}

/* ------------------------------------------------------------------ */
/* Render table                                                         */
/* ------------------------------------------------------------------ */

function renderTable(apps) {
  const tbody = document.getElementById("applicationsBody");
  if (!apps.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">No applications found.</td></tr>`;
    return;
  }
  tbody.innerHTML = apps.map(app => `
    <tr class="clickable-row" data-id="${app.id}">
      <td>${app.full_name || "—"}</td>
      <td>${app.email || "—"}</td>
      <td>${app.country || "—"}</td>
      <td>${fmtDate(app.created_at)}</td>
      <td>${badgeHtml(app.status)}</td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".clickable-row").forEach(row => {
    row.addEventListener("click", () => openDetail(row.dataset.id));
  });
}

/* ------------------------------------------------------------------ */
/* Filters                                                              */
/* ------------------------------------------------------------------ */

function applyFilters() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  let filtered = allApplications;
  if (search) {
    filtered = filtered.filter(a =>
      (a.full_name || "").toLowerCase().includes(search) ||
      (a.email     || "").toLowerCase().includes(search)
    );
  }
  if (status) filtered = filtered.filter(a => a.status === status);
  renderTable(filtered);
}

/* ------------------------------------------------------------------ */
/* Detail Modal                                                         */
/* ------------------------------------------------------------------ */

function openDetail(id) {
  currentId = id;
  const app = allApplications.find(a => a.id === id);
  if (!app) return;

  document.getElementById("modalName").textContent = app.full_name || "Application Detail";

  const photo = document.getElementById("modalPhoto");
  if (app.photo_url) {
    photo.src = app.photo_url;
    photo.alt = `Photo of ${app.full_name}`;
    photo.hidden = false;
  } else {
    photo.hidden = true;
  }

  document.getElementById("modalBody").innerHTML = `
    <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${app.email || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${app.phone || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Occupation</span><span class="detail-value">${app.occupation || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Country</span><span class="detail-value">${app.country || "—"}</span></div>
    <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${fmtDate(app.created_at)}</span></div>
    <div class="detail-row"><span class="detail-label">Reason</span></div>
    <div class="reason-text">${app.reason || "No reason provided."}</div>
  `;

  document.getElementById("modalStatusSelect").value = app.status || "pending";
  document.getElementById("detailOverlay").hidden = false;
}

function closeDetail() {
  document.getElementById("detailOverlay").hidden = true;
  currentId = null;
}

async function saveStatus() {
  if (!currentId || !supabase) return;
  const newStatus = document.getElementById("modalStatusSelect").value;
  const btn = document.getElementById("modalSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  const { error } = await supabase.from("membership_applications")
    .update({ status: newStatus })
    .eq("id", currentId);

  btn.disabled = false;
  btn.textContent = "Save Status";

  if (error) {
    alert("Failed to update status: " + error.message);
    return;
  }

  // Update local data
  const idx = allApplications.findIndex(a => a.id === currentId);
  if (idx !== -1) allApplications[idx].status = newStatus;
  applyFilters();
  updateStats(allApplications);
  closeDetail();
}

/* ------------------------------------------------------------------ */
/* Load                                                                 */
/* ------------------------------------------------------------------ */

async function loadApplications() {
  if (!supabase) {
    document.getElementById("applicationsBody").innerHTML =
      `<tr><td colspan="5" class="admin-empty">Supabase not configured.</td></tr>`;
    return;
  }

  const { data, error } = await supabase
    .from("membership_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Membership Admin] Load error:", error);
    document.getElementById("applicationsBody").innerHTML =
      `<tr><td colspan="5" class="admin-empty">Error loading applications.</td></tr>`;
    return;
  }

  allApplications = data || [];
  updateStats(allApplications);
  renderTable(allApplications);
}

/* ------------------------------------------------------------------ */
/* Init                                                                 */
/* ------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;

  await loadApplications();

  document.getElementById("searchInput").addEventListener("input", applyFilters);
  document.getElementById("statusFilter").addEventListener("change", applyFilters);
  document.getElementById("modalCloseBtn").addEventListener("click", closeDetail);
  document.getElementById("modalSaveBtn").addEventListener("click", saveStatus);
  document.getElementById("detailOverlay").addEventListener("click", e => {
    if (e.target === document.getElementById("detailOverlay")) closeDetail();
  });
});
