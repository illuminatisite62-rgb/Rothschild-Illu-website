import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Stats                                                                */
/* ------------------------------------------------------------------ */

async function loadStats() {
  if (!supabase) return;

  const [profiles, published, media, timeline, membership, messages] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("media").select("id", { count: "exact", head: true }),
    supabase.from("timeline_events").select("id", { count: "exact", head: true }),
    supabase.from("membership_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("read", false),
  ]);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? "0";
  };

  set("statProfiles",   profiles.count);
  set("statPublished",  published.count);
  set("statMedia",      media.count);
  set("statTimeline",   timeline.count);
  set("statMembership", membership.count);
  set("statMessages",   messages.count);
}

/* ------------------------------------------------------------------ */
/* Recent Profiles                                                      */
/* ------------------------------------------------------------------ */

async function loadRecentProfiles() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, status, updated_at")
    .order("updated_at", { ascending: false })
    .limit(6);

  const tbody = document.querySelector("#recentProfilesTable tbody");
  if (!tbody) return;

  if (error) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">Could not load profiles.</td></tr>`;
    return;
  }
  if (!data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">No profiles yet. <a href="profile-editor.html">Add the first one</a>.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${escapeHtml(p.full_name)}</td>
      <td><span class="status-pill ${p.status}">${p.status}</span></td>
      <td>${formatDate(p.updated_at)}</td>
    </tr>
  `).join("");
}

/* ------------------------------------------------------------------ */
/* Pending Membership                                                   */
/* ------------------------------------------------------------------ */

async function loadMembershipPending() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("membership_applications")
    .select("full_name, email, country, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(6);

  const tbody = document.querySelector("#membershipTable tbody");
  if (!tbody) return;

  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="admin-empty">${error ? "Could not load." : "No pending applications."}</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(m => `
    <tr style="cursor:pointer;" onclick="location.href='membership.html'">
      <td>${escapeHtml(m.full_name)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.country || "—")}</td>
      <td>${formatDate(m.created_at)}</td>
    </tr>
  `).join("");
}

/* ------------------------------------------------------------------ */
/* Unread Contact Messages                                              */
/* ------------------------------------------------------------------ */

async function loadMessages() {
  if (!supabase) return;
  const { data, error } = await supabase
    .from("contact_messages")
    .select("name, subject, created_at")
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(6);

  const tbody = document.querySelector("#messagesTable tbody");
  if (!tbody) return;

  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="admin-empty">${error ? "Could not load." : "No unread messages."}</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${escapeHtml(m.subject || "—")}</td>
      <td>${formatDate(m.created_at)}</td>
    </tr>
  `).join("");
}

/* ------------------------------------------------------------------ */
/* Init                                                                 */
/* ------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", async () => {
  const admin = await requireAdmin();
  if (!admin) return;

  await Promise.all([
    loadStats(),
    loadRecentProfiles(),
    loadMembershipPending(),
    loadMessages(),
  ]);
});
