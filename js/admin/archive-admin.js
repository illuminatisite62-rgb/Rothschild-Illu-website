/**
 * js/admin/archive-admin.js
 * Full CRUD for the archive `media` table in Supabase.
 * Supports document, photo, estate categories with image/file upload.
 */
import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

let allItems   = [];
let activeTab  = "all";
let deletingId = null;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function val(id) { return document.getElementById(id)?.value.trim() || ""; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v ?? ""; }

function categoryLabel(cat) {
  const map = { document: "Historical Document", photo: "Photochromatic", estate: "Estate", other: "Other" };
  return map[cat] || cat;
}

function categoryIcon(cat) {
  const map = { document: "📜", photo: "📷", estate: "🏛️", other: "📦" };
  return map[cat] || "📦";
}

/* ------------------------------------------------------------------ */
/* File upload to Supabase Storage                                      */
/* ------------------------------------------------------------------ */

async function uploadFile(file) {
  if (!supabase || !file) return null;
  const progress = document.getElementById("uploadProgress");
  if (progress) progress.textContent = "Uploading…";

  const ext      = file.name.split(".").pop();
  const fileName = `archive/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from("archive-files").upload(fileName, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    console.warn("[Archive Admin] Upload error:", error.message);
    if (progress) progress.textContent = "Upload failed.";
    return null;
  }

  const { data } = supabase.storage.from("archive-files").getPublicUrl(fileName);
  if (progress) progress.textContent = "Uploaded ✓";
  return data?.publicUrl || null;
}

/* ------------------------------------------------------------------ */
/* Render grid                                                          */
/* ------------------------------------------------------------------ */

function renderGrid() {
  const grid    = document.getElementById("archiveGrid");
  const heading = document.getElementById("gridHeading");
  const count   = document.getElementById("itemCount");

  let filtered = activeTab === "all" ? allItems : allItems.filter(i => i.category === activeTab);

  const labels = { all: "All Archive Items", document: "Historical Documents", photo: "Photochromatic Collection", estate: "Estates & Properties" };
  heading.textContent = labels[activeTab] || "Archive Items";
  count.textContent   = `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`;

  if (!filtered.length) {
    grid.innerHTML = `<div class="archive-empty-state">No ${activeTab === "all" ? "" : categoryLabel(activeTab) + " "}items yet. Add one above.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <div class="archive-card" data-id="${item.id}">
      ${item.image_url
        ? `<img class="archive-card-img" src="${item.image_url}" alt="${item.title}" loading="lazy" />`
        : `<div class="archive-card-img-placeholder">${categoryIcon(item.category)}</div>`
      }
      <div class="archive-card-body">
        <p class="archive-card-category">${categoryLabel(item.category)}</p>
        <h3 class="archive-card-title">${item.title}</h3>
        <p class="archive-card-year">${item.year || ""} ${item.location ? `· ${item.location}` : ""} <span class="status-pill ${item.status}">${item.status}</span></p>
        <div class="archive-card-actions">
          <button class="btn btn-outline-gold btn-xs edit-btn" data-id="${item.id}">Edit</button>
          <button class="btn btn-xs delete-btn" style="border:1px solid rgba(180,50,50,0.4);color:#d9534f;background:rgba(180,50,50,0.08);" data-id="${item.id}">Delete</button>
        </div>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".edit-btn").forEach(btn => btn.addEventListener("click", e => {
    e.stopPropagation();
    editItem(btn.dataset.id);
  }));

  grid.querySelectorAll(".delete-btn").forEach(btn => btn.addEventListener("click", e => {
    e.stopPropagation();
    openDeleteConfirm(btn.dataset.id);
  }));
}

/* ------------------------------------------------------------------ */
/* Save (Insert or Update)                                              */
/* ------------------------------------------------------------------ */

async function saveItem() {
  const title    = val("itemTitle");
  const category = val("itemCategory");
  if (!title) { alert("Title is required."); return; }

  const btn = document.getElementById("saveItemBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  // Try file upload first
  const fileInput = document.getElementById("itemFile");
  const file      = fileInput?.files?.[0] || null;
  let imageUrl    = val("itemImageUrl") || null;

  if (file) {
    const uploaded = await uploadFile(file);
    if (uploaded) imageUrl = uploaded;
  }

  const payload = {
    title,
    category,
    description: val("itemDesc") || null,
    year:        val("itemYear") ? parseInt(val("itemYear")) : null,
    location:    val("itemLocation") || null,
    image_url:   imageUrl,
    status:      val("itemStatus") || "published",
  };

  const editingId = val("editingId");

  let error;
  if (editingId) {
    ({ error } = await supabase.from("media").update(payload).eq("id", editingId));
  } else {
    ({ error } = await supabase.from("media").insert(payload));
  }

  btn.disabled = false;
  btn.textContent = "Save Item";

  if (error) { alert("Error saving item: " + error.message); return; }

  clearForm();
  await loadItems();
}

/* ------------------------------------------------------------------ */
/* Edit                                                                 */
/* ------------------------------------------------------------------ */

function editItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  setVal("editingId",    item.id);
  setVal("itemTitle",    item.title);
  setVal("itemCategory", item.category);
  setVal("itemYear",     item.year);
  setVal("itemLocation", item.location);
  setVal("itemDesc",     item.description);
  setVal("itemImageUrl", item.image_url);
  setVal("itemStatus",   item.status);

  document.getElementById("editorTitle").textContent = "Edit Archive Item";
  document.getElementById("cancelEditBtn").hidden = false;
  document.getElementById("archiveEditor").scrollIntoView({ behavior: "smooth" });
}

function clearForm() {
  ["editingId","itemTitle","itemYear","itemLocation","itemDesc","itemImageUrl"].forEach(id => setVal(id, ""));
  setVal("itemCategory", "document");
  setVal("itemStatus", "published");
  const fi = document.getElementById("itemFile");
  if (fi) fi.value = "";
  const pr = document.getElementById("uploadProgress");
  if (pr) pr.textContent = "";
  document.getElementById("editorTitle").textContent = "Add New Archive Item";
  document.getElementById("cancelEditBtn").hidden = true;
}

/* ------------------------------------------------------------------ */
/* Delete                                                               */
/* ------------------------------------------------------------------ */

function openDeleteConfirm(id) {
  deletingId = id;
  document.getElementById("deleteOverlay").classList.add("show");
}

function closeDeleteConfirm() {
  deletingId = null;
  document.getElementById("deleteOverlay").classList.remove("show");
}

async function confirmDelete() {
  if (!deletingId || !supabase) return;
  const { error } = await supabase.from("media").delete().eq("id", deletingId);
  closeDeleteConfirm();
  if (error) { alert("Error deleting item: " + error.message); return; }
  await loadItems();
}

/* ------------------------------------------------------------------ */
/* Load                                                                 */
/* ------------------------------------------------------------------ */

async function loadItems() {
  if (!supabase) {
    document.getElementById("archiveGrid").innerHTML =
      `<div class="archive-empty-state">Supabase not configured.</div>`;
    return;
  }

  const { data, error } = await supabase.from("media").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("[Archive Admin] Load error:", error);
    document.getElementById("archiveGrid").innerHTML =
      `<div class="archive-empty-state">Error loading items.</div>`;
    return;
  }

  allItems = data || [];
  renderGrid();
}

/* ------------------------------------------------------------------ */
/* Init                                                                 */
/* ------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;

  await loadItems();

  // Tab switching
  document.querySelectorAll(".archive-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".archive-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      activeTab = tab.dataset.cat;
      renderGrid();
    });
  });

  document.getElementById("saveItemBtn").addEventListener("click", saveItem);
  document.getElementById("cancelEditBtn").addEventListener("click", clearForm);
  document.getElementById("confirmDeleteBtn").addEventListener("click", confirmDelete);
  document.getElementById("cancelDeleteBtn").addEventListener("click", closeDeleteConfirm);
});
