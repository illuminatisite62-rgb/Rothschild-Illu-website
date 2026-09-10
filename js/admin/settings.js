import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

let allMessages = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function showToast(message, isError) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${isError ? " error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3200);
}

async function loadSettings() {
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) {
    showToast(`Could not load settings: ${error.message}`, true);
    return;
  }
  const map = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
  document.getElementById("siteTitle").value = map.site_title || "";
  document.getElementById("siteDescription").value = map.site_description || "";
  document.getElementById("contactEmail").value = map.contact_email || "";
}

async function handleSettingsSubmit(e) {
  e.preventDefault();

  const updates = [
    { key: "site_title", value: document.getElementById("siteTitle").value.trim() },
    { key: "site_description", value: document.getElementById("siteDescription").value.trim() },
    { key: "contact_email", value: document.getElementById("contactEmail").value.trim() },
  ];

  const { error } = await supabase.from("site_settings").upsert(updates, { onConflict: "key" });
  if (error) return showToast(`Save failed: ${error.message}`, true);
  showToast("Settings saved.");
}

async function loadMessages() {
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  const tbody = document.querySelector("#messagesTable tbody");

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">Error: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  allMessages = data || [];
  renderMessages();
}

function renderMessages() {
  const onlyUnread = document.getElementById("messageFilter").value === "unread";
  const filtered = onlyUnread ? allMessages.filter((m) => !m.is_read) : allMessages;
  const tbody = document.querySelector("#messagesTable tbody");

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="admin-empty">No messages.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (m) => `
    <tr data-id="${m.id}" style="${m.is_read ? "" : "font-weight: 600;"}">
      <td>${escapeHtml(m.name)}<br /><span style="font-weight: normal; font-size: 12px; color: var(--text-on-parchment-muted);">${escapeHtml(m.email)}</span></td>
      <td>${escapeHtml(m.subject)}</td>
      <td style="max-width: 320px; white-space: normal;">${escapeHtml(m.message)}</td>
      <td>${formatDateTime(m.created_at)}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-action="toggle-read">${m.is_read ? "Mark Unread" : "Mark Read"}</button>
          <button type="button" data-action="delete" class="danger">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

async function toggleRead(message) {
  const { error } = await supabase.from("contact_messages").update({ is_read: !message.is_read }).eq("id", message.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  message.is_read = !message.is_read;
  renderMessages();
}

async function deleteMessage(message) {
  if (!window.confirm(`Delete this message from ${message.name}?`)) return;
  const { error } = await supabase.from("contact_messages").delete().eq("id", message.id);
  if (error) return showToast(`Failed: ${error.message}`, true);
  allMessages = allMessages.filter((m) => m.id !== message.id);
  renderMessages();
  showToast("Message deleted.");
}

function initMessageActions() {
  document.querySelector("#messagesTable tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = btn.closest("tr");
    const message = allMessages.find((m) => m.id === row.getAttribute("data-id"));
    if (!message) return;

    if (btn.getAttribute("data-action") === "toggle-read") toggleRead(message);
    if (btn.getAttribute("data-action") === "delete") deleteMessage(message);
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  document.getElementById("currentAdminEmail").textContent = `Signed in as: ${admin.email}`;
  document.getElementById("settingsForm").addEventListener("submit", handleSettingsSubmit);
  document.getElementById("messageFilter").addEventListener("change", renderMessages);
  initMessageActions();

  loadSettings();
  loadMessages();
});
