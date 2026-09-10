import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

let allProfiles = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function showToast(message, isError) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${isError ? " error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3200);
}

async function loadProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, slug, family_branch, status, featured, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    document.querySelector("#profilesTable tbody").innerHTML = `<tr><td colspan="6" class="admin-empty">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  allProfiles = data || [];
  render();
}

function render() {
  const search = document.getElementById("profileSearch").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;

  const filtered = allProfiles.filter((p) => {
    if (search && !p.full_name.toLowerCase().includes(search)) return false;
    if (status && p.status !== status) return false;
    return true;
  });

  const tbody = document.querySelector("#profilesTable tbody");

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No profiles match. <a href="profile-editor.html">Add one</a>.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (p) => `
    <tr data-id="${p.id}">
      <td>${escapeHtml(p.full_name)}</td>
      <td>${escapeHtml(p.family_branch || "—")}</td>
      <td><span class="status-pill ${p.status}">${escapeHtml(p.status)}</span></td>
      <td>${p.featured ? "&#9733;" : "—"}</td>
      <td>${formatDate(p.updated_at)}</td>
      <td>
        <div class="row-actions">
          <a href="profile-editor.html?id=${p.id}">Edit</a>
          <a href="../profile.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">Preview</a>
          <button type="button" data-action="toggle-status">${p.status === "published" ? "Unpublish" : "Publish"}</button>
          <button type="button" data-action="toggle-featured">${p.featured ? "Unfeature" : "Feature"}</button>
          <button type="button" data-action="duplicate">Duplicate</button>
          <button type="button" data-action="delete" class="danger">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

async function toggleStatus(profile) {
  const newStatus = profile.status === "published" ? "draft" : "published";
  const { error } = await supabase.from("profiles").update({ status: newStatus }).eq("id", profile.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  profile.status = newStatus;
  render();
  showToast(`${profile.full_name} is now ${newStatus}.`);
}

async function toggleFeatured(profile) {
  const { error } = await supabase.from("profiles").update({ featured: !profile.featured }).eq("id", profile.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  profile.featured = !profile.featured;
  render();
  showToast(`${profile.full_name} ${profile.featured ? "marked as featured" : "removed from featured"}.`);
}

async function duplicateProfile(profile) {
  const { data: full, error: fetchError } = await supabase.from("profiles").select("*").eq("id", profile.id).single();
  if (fetchError) return showToast(`Failed to load profile: ${fetchError.message}`, true);

  const copy = { ...full };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.published_at;
  copy.full_name = `${full.full_name} (Copy)`;
  copy.slug = `${full.slug}-copy-${Date.now().toString(36)}`;
  copy.status = "draft";
  copy.featured = false;

  const { error: insertError } = await supabase.from("profiles").insert(copy);
  if (insertError) return showToast(`Failed to duplicate: ${insertError.message}`, true);

  showToast(`Duplicated as "${copy.full_name}".`);
  loadProfiles();
}

async function deleteProfile(profile) {
  if (!window.confirm(`Delete "${profile.full_name}" permanently? This cannot be undone.`)) return;

  const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
  if (error) return showToast(`Failed to delete: ${error.message}`, true);

  allProfiles = allProfiles.filter((p) => p.id !== profile.id);
  render();
  showToast(`Deleted "${profile.full_name}".`);
}

function initTableActions() {
  document.querySelector("#profilesTable tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("tr");
    const profile = allProfiles.find((p) => p.id === row.getAttribute("data-id"));
    if (!profile) return;

    const action = btn.getAttribute("data-action");
    if (action === "toggle-status") toggleStatus(profile);
    if (action === "toggle-featured") toggleFeatured(profile);
    if (action === "duplicate") duplicateProfile(profile);
    if (action === "delete") deleteProfile(profile);
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  document.getElementById("profileSearch").addEventListener("input", render);
  document.getElementById("statusFilter").addEventListener("change", render);
  initTableActions();

  loadProfiles();
});
