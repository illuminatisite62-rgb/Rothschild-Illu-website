import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

let allMedia = [];
let selectedFile = null;
let editingId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function showToast(message, isError) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${isError ? " error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function resetForm() {
  editingId = null;
  selectedFile = null;
  document.getElementById("mediaForm").reset();
  document.getElementById("mediaId").value = "";
  document.getElementById("fileNameLabel").textContent = "";
  document.getElementById("uploadPanelTitle").textContent = "Upload New File";
  document.getElementById("mediaSubmitBtn").textContent = "Upload File";
  document.getElementById("fileInput").required = true;
  document.getElementById("cancelEditBtn").hidden = true;
}

function initDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files[0] || null;
    document.getElementById("fileNameLabel").textContent = selectedFile ? selectedFile.name : "";
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.style.background = "rgba(201, 162, 75, 0.1)";
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.style.background = "";
  });
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.style.background = "";
    const file = e.dataTransfer.files[0];
    if (file) {
      selectedFile = file;
      fileInput.files = e.dataTransfer.files;
      document.getElementById("fileNameLabel").textContent = file.name;
    }
  });
}

async function loadMedia() {
  const { data, error } = await supabase.from("media").select("*").order("created_at", { ascending: false });
  const grid = document.getElementById("mediaGrid");

  if (error) {
    grid.innerHTML = `<p class="admin-empty">Error: ${escapeHtml(error.message)}</p>`;
    return;
  }

  allMedia = data || [];
  renderGrid();
}

function renderGrid() {
  const filter = document.getElementById("libraryFilter").value;
  const filtered = filter ? allMedia.filter((m) => m.media_type === filter) : allMedia;
  const grid = document.getElementById("mediaGrid");

  if (filtered.length === 0) {
    grid.innerHTML = `<p class="admin-empty">No media uploaded yet.</p>`;
    return;
  }

  grid.innerHTML = filtered
    .map(
      (m) => `
    <div class="media-tile" data-id="${m.id}">
      <div class="media-tile-img"><img src="${escapeHtml(m.file_url)}" alt="${escapeHtml(m.alt_text || m.title)}" loading="lazy" /></div>
      <div class="media-tile-body">
        <div class="media-tile-title" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</div>
        <span class="status-pill ${m.status}" style="margin-bottom:8px; display:inline-block;">${escapeHtml(m.status)}</span>
        <div class="media-tile-actions">
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="toggle-status">${m.status === "published" ? "Unpublish" : "Publish"}</button>
          <button type="button" data-action="delete">Delete</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

function populateFormForEdit(item) {
  editingId = item.id;
  document.getElementById("mediaId").value = item.id;
  document.getElementById("mediaType").value = item.media_type;
  document.getElementById("dateLabel").value = item.date_label || "";
  document.getElementById("mediaTitle").value = item.title;
  document.getElementById("mediaCaption").value = item.caption || "";
  document.getElementById("mediaAltText").value = item.alt_text || "";
  document.getElementById("mediaCredit").value = item.credit || "";
  document.getElementById("mediaSource").value = item.source || "";
  document.getElementById("mediaDescription").value = item.description || "";
  document.getElementById("mediaPublished").checked = item.status === "published";
  document.getElementById("fileInput").required = false;
  document.getElementById("uploadPanelTitle").textContent = `Editing: ${item.title}`;
  document.getElementById("mediaSubmitBtn").textContent = "Save Changes";
  document.getElementById("cancelEditBtn").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function toggleStatus(item) {
  const newStatus = item.status === "published" ? "draft" : "published";
  const { error } = await supabase.from("media").update({ status: newStatus }).eq("id", item.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  item.status = newStatus;
  renderGrid();
  showToast(`"${item.title}" is now ${newStatus}.`);
}

async function deleteItem(item) {
  if (!window.confirm(`Delete "${item.title}" permanently?`)) return;

  const { error } = await supabase.from("media").delete().eq("id", item.id);
  if (error) return showToast(`Failed to delete: ${error.message}`, true);

  // Best-effort storage cleanup — do not block on this.
  try {
    const url = new URL(item.file_url);
    const match = url.pathname.match(/\/object\/public\/([^/]+)\/(.+)$/);
    if (match) {
      await supabase.storage.from(match[1]).remove([decodeURIComponent(match[2])]);
    }
  } catch (e) {
    console.warn("[Rothschild Admin] Storage cleanup skipped:", e.message);
  }

  allMedia = allMedia.filter((m) => m.id !== item.id);
  renderGrid();
  showToast(`Deleted "${item.title}".`);
}

function initGridActions() {
  document.getElementById("mediaGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const tile = btn.closest(".media-tile");
    const item = allMedia.find((m) => m.id === tile.getAttribute("data-id"));
    if (!item) return;

    const action = btn.getAttribute("data-action");
    if (action === "edit") populateFormForEdit(item);
    if (action === "toggle-status") toggleStatus(item);
    if (action === "delete") deleteItem(item);
  });
}

async function handleSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("mediaSubmitBtn");
  submitBtn.disabled = true;

  try {
    let fileUrl = null;

    if (selectedFile) {
      const bucket = document.getElementById("mediaBucket").value;
      const ext = selectedFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, selectedFile);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      fileUrl = publicUrlData.publicUrl;
    } else if (!editingId) {
      showToast("Please choose a file to upload.", true);
      submitBtn.disabled = false;
      return;
    }

    const payload = {
      title: document.getElementById("mediaTitle").value.trim(),
      media_type: document.getElementById("mediaType").value,
      caption: document.getElementById("mediaCaption").value.trim() || null,
      alt_text: document.getElementById("mediaAltText").value.trim() || null,
      credit: document.getElementById("mediaCredit").value.trim() || null,
      source: document.getElementById("mediaSource").value.trim() || null,
      description: document.getElementById("mediaDescription").value.trim() || null,
      date_label: document.getElementById("dateLabel").value.trim() || null,
      status: document.getElementById("mediaPublished").checked ? "published" : "draft",
    };
    if (fileUrl) payload.file_url = fileUrl;

    if (editingId) {
      const { error } = await supabase.from("media").update(payload).eq("id", editingId);
      if (error) throw error;
      showToast("Media updated.");
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      payload.uploaded_by = session.user.id;
      const { error } = await supabase.from("media").insert(payload);
      if (error) throw error;
      showToast("File uploaded.");
    }

    resetForm();
    loadMedia();
  } catch (err) {
    showToast(`Failed: ${err.message}`, true);
  } finally {
    submitBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  initDropzone();
  initGridActions();
  document.getElementById("mediaForm").addEventListener("submit", handleSubmit);
  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
  document.getElementById("libraryFilter").addEventListener("change", renderGrid);

  loadMedia();
});
