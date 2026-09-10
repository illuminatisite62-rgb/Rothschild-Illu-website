/**
 * Admin authentication.
 *
 * This file serves two purposes:
 *  1. On admin/index.html (the login page), it wires up the sign-in form.
 *  2. On every OTHER admin page, other admin/*.js files import
 *     `requireAdmin()` from here and call it before doing anything else —
 *     it redirects to the login page unless the current Supabase session
 *     belongs to a user listed in the `admin_roles` table.
 *
 * IMPORTANT: this client-side check is a UX convenience only (it prevents
 * flashing protected content and gives a clean redirect). The real
 * enforcement is server-side, via Postgres Row Level Security policies that
 * call is_admin() (see supabase/policies.sql) — a user cannot read or write
 * protected data just by bypassing this file.
 */
import { supabase } from "../supabase-client.js";

/**
 * Resolves to { session, isAdmin, email } for the current visitor.
 */
export async function getAdminStatus() {
  if (!supabase) {
    return { session: null, isAdmin: false, email: null };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, isAdmin: false, email: null };
  }

  const { data: roleRow, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[Rothschild Admin] Could not verify admin role:", error.message);
  }

  return { session, isAdmin: Boolean(roleRow), email: session.user.email };
}

/**
 * Call at the top of every protected admin page. Redirects to the login
 * page if the visitor isn't a signed-in admin, otherwise resolves with
 * { session, email } and reveals the page (removes [hidden] from <body>).
 */
export async function requireAdmin() {
  const { session, isAdmin, email } = await getAdminStatus();

  if (!session || !isAdmin) {
    if (session && !isAdmin) {
      // Signed in, but not an admin — sign out rather than leaving a
      // half-authenticated non-admin session sitting in the browser.
      await supabase.auth.signOut();
    }
    window.location.href = "index.html?reason=unauthorized";
    return null;
  }

  document.body.hidden = false;
  const emailEl = document.getElementById("adminUserEmail");
  if (emailEl) emailEl.textContent = email;

  const logoutBtn = document.getElementById("adminLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    });
  }

  return { session, email };
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const statusEl = document.getElementById("authStatus");
  const submitBtn = document.getElementById("loginSubmit");

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `auth-status ${type}`;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("reason") === "unauthorized") {
    showStatus("That account is not authorized as an administrator.", "error");
  }

  if (!supabase) {
    showStatus("Supabase is not configured yet — see PROJECT_STATUS.md / README.md for setup steps.", "error");
    submitBtn.disabled = true;
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Signing in…";

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showStatus(error.message, "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
      return;
    }

    const { data: roleRow } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!roleRow) {
      await supabase.auth.signOut();
      showStatus("This account is signed in, but is not authorized as an administrator.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In";
      return;
    }

    showStatus("Signed in — redirecting…", "success");
    window.location.href = "dashboard.html";
  });
}

document.addEventListener("DOMContentLoaded", initLoginForm);
