import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

async function loadStats() {
  const [total, published, draft, featured, media, timeline] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("featured", true),
    supabase.from("media").select("id", { count: "exact", head: true }),
    supabase.from("timeline_events").select("id", { count: "exact", head: true }),
  ]);

  const values = [total.count, published.count, draft.count, featured.count, media.count, timeline.count];
  document.querySelectorAll("#statGrid .value").forEach((el, i) => {
    el.textContent = values[i] ?? "0";
  });
}

async function loadRecentProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(6);

  const tbody = document.querySelector("#recentProfilesTable tbody");

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">Could not load profiles: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">No profiles yet. <a href="profile-editor.html">Add the first one</a>.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (p) => `
    <tr>
      <td>${escapeHtml(p.full_name)}</td>
      <td><span class="status-pill ${p.status}">${escapeHtml(p.status)}</span></td>
      <td>${formatDateTime(p.updated_at)}</td>
    </tr>
  `
    )
    .join("");
}

async function loadMessages() {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("name, subject, created_at")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(6);

  const tbody = document.querySelector("#messagesTable tbody");

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">Could not load messages: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">No unread messages.</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (m) => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.subject)}</td>
      <td>${formatDateTime(m.created_at)}</td>
    </tr>
  `
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  loadStats();
  loadRecentProfiles();
  loadMessages();
});
