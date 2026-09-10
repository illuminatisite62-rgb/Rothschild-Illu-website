import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

let allEvents = [];
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
  document.getElementById("timelineForm").reset();
  document.getElementById("eventId").value = "";
  document.getElementById("eventDisplayOrder").value = allEvents.length;
  document.getElementById("timelineFormTitle").textContent = "Add Event";
  document.getElementById("timelineSubmitBtn").textContent = "Add Event";
  document.getElementById("cancelTimelineEditBtn").hidden = true;
}

async function loadEvents() {
  const { data, error } = await supabase.from("timeline_events").select("*").order("display_order", { ascending: true });
  const tbody = document.querySelector("#timelineTable tbody");

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  allEvents = data || [];
  render();
}

function render() {
  const tbody = document.querySelector("#timelineTable tbody");

  if (allEvents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">No timeline events yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = allEvents
    .map(
      (ev) => `
    <tr data-id="${ev.id}">
      <td>${ev.display_order}</td>
      <td>${escapeHtml(ev.year)}</td>
      <td>${escapeHtml(ev.title)}</td>
      <td>${escapeHtml(ev.category || "—")}</td>
      <td><span class="status-pill ${ev.status}">${escapeHtml(ev.status)}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" data-action="edit">Edit</button>
          <button type="button" data-action="toggle-status">${ev.status === "published" ? "Unpublish" : "Publish"}</button>
          <button type="button" data-action="delete" class="danger">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

function populateForEdit(ev) {
  editingId = ev.id;
  document.getElementById("eventId").value = ev.id;
  document.getElementById("eventYear").value = ev.year;
  document.getElementById("eventDate").value = ev.event_date || "";
  document.getElementById("eventCategory").value = ev.category || "";
  document.getElementById("eventTitle").value = ev.title;
  document.getElementById("eventDescription").value = ev.description || "";
  document.getElementById("eventImageUrl").value = ev.image_url || "";
  document.getElementById("eventDisplayOrder").value = ev.display_order;
  document.getElementById("eventPublished").checked = ev.status === "published";
  document.getElementById("timelineFormTitle").textContent = `Editing: ${ev.title}`;
  document.getElementById("timelineSubmitBtn").textContent = "Save Changes";
  document.getElementById("cancelTimelineEditBtn").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function toggleStatus(ev) {
  const newStatus = ev.status === "published" ? "draft" : "published";
  const { error } = await supabase.from("timeline_events").update({ status: newStatus }).eq("id", ev.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  ev.status = newStatus;
  render();
  showToast(`"${ev.title}" is now ${newStatus}.`);
}

async function deleteEvent(ev) {
  if (!window.confirm(`Delete "${ev.title}"?`)) return;
  const { error } = await supabase.from("timeline_events").delete().eq("id", ev.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  allEvents = allEvents.filter((e) => e.id !== ev.id);
  render();
  showToast(`Deleted "${ev.title}".`);
}

function initTableActions() {
  document.querySelector("#timelineTable tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("tr");
    const ev = allEvents.find((x) => x.id === row.getAttribute("data-id"));
    if (!ev) return;

    const action = btn.getAttribute("data-action");
    if (action === "edit") populateForEdit(ev);
    if (action === "toggle-status") toggleStatus(ev);
    if (action === "delete") deleteEvent(ev);
  });
}

async function handleSubmit(e) {
  e.preventDefault();

  const payload = {
    year: document.getElementById("eventYear").value.trim(),
    event_date: document.getElementById("eventDate").value || null,
    category: document.getElementById("eventCategory").value.trim() || null,
    title: document.getElementById("eventTitle").value.trim(),
    description: document.getElementById("eventDescription").value.trim() || null,
    image_url: document.getElementById("eventImageUrl").value.trim() || null,
    display_order: Number(document.getElementById("eventDisplayOrder").value) || 0,
    status: document.getElementById("eventPublished").checked ? "published" : "draft",
  };

  if (editingId) {
    const { error } = await supabase.from("timeline_events").update(payload).eq("id", editingId);
    if (error) return showToast(`Failed: ${error.message}`, true);
    showToast("Event updated.");
  } else {
    const { error } = await supabase.from("timeline_events").insert(payload);
    if (error) return showToast(`Failed: ${error.message}`, true);
    showToast("Event added.");
  }

  resetForm();
  loadEvents();
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  initTableActions();
  document.getElementById("timelineForm").addEventListener("submit", handleSubmit);
  document.getElementById("cancelTimelineEditBtn").addEventListener("click", resetForm);

  loadEvents();
});
