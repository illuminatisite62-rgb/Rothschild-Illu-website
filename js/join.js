/**
 * js/join.js
 * Handles the membership application form and optional account creation.
 * Saves submissions to Supabase (membership_applications + site_visitors tables).
 */
import { supabase } from "./supabase-client.js";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function showError(msg) {
  const banner = document.getElementById("joinErrorBanner");
  if (!banner) return;
  banner.textContent = msg;
  banner.hidden = false;
  banner.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideError() {
  const banner = document.getElementById("joinErrorBanner");
  if (banner) banner.hidden = true;
}

function setSubmitting(isSubmitting) {
  const btn  = document.getElementById("joinSubmitBtn");
  const text = document.getElementById("joinSubmitText");
  if (!btn) return;
  btn.disabled = isSubmitting;
  text.textContent = isSubmitting ? "Sending…" : "SUBMIT APPLICATION";
}

function showSuccess() {
  const form    = document.getElementById("joinForm");
  const success = document.getElementById("joinSuccess");
  const account = document.getElementById("joinAccountSection");
  if (form)    form.hidden    = true;
  if (success) success.hidden = false;
  if (account) account.hidden = false;
}

/* Save pending application to localStorage in case DB is still waking up */
function savePending(data) {
  try {
    const pending = JSON.parse(localStorage.getItem("roth_pending_apps") || "[]");
    pending.push({ ...data, savedAt: Date.now() });
    localStorage.setItem("roth_pending_apps", JSON.stringify(pending));
  } catch (e) { /* ignore */ }
}

/* Try to flush any pending applications that didn't save before */
async function flushPending() {
  if (!supabase) return;
  try {
    const raw = localStorage.getItem("roth_pending_apps");
    if (!raw) return;
    const pending = JSON.parse(raw);
    if (!pending.length) return;
    const remaining = [];
    for (const app of pending) {
      const { savedAt, ...payload } = app;
      const { error } = await supabase.from("membership_applications").insert(payload);
      if (error) remaining.push(app);
    }
    if (remaining.length) {
      localStorage.setItem("roth_pending_apps", JSON.stringify(remaining));
    } else {
      localStorage.removeItem("roth_pending_apps");
    }
  } catch (e) { /* ignore */ }
}

/* -------------------------------------------------------------------------- */
/* Photo upload to Supabase Storage (if Supabase is configured)               */
/* -------------------------------------------------------------------------- */

async function uploadPhoto(file) {
  if (!supabase || !file) return null;
  // Wrap upload in a race against a 8-second timeout
  const uploadPromise = (async () => {
    try {
      const ext      = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("membership-photos")
        .upload(fileName, file, { upsert: false, contentType: file.type });
      if (error) {
        console.warn("[Join] Photo upload error:", error.message);
        return null;
      }
      const { data: publicData } = supabase.storage.from("membership-photos").getPublicUrl(fileName);
      return publicData?.publicUrl || null;
    } catch (err) {
      console.warn("[Join] Photo upload exception:", err);
      return null;
    }
  })();

  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
  return Promise.race([uploadPromise, timeoutPromise]);
}

/* -------------------------------------------------------------------------- */
/* Main form submit                                                             */
/* -------------------------------------------------------------------------- */

async function handleApplicationSubmit(e) {
  e.preventDefault();
  hideError();

  const fullName   = document.getElementById("joinFullName")?.value.trim();
  const phone      = document.getElementById("joinPhone")?.value.trim();
  const email      = document.getElementById("joinEmail")?.value.trim();
  const photoFile  = document.getElementById("joinPhoto")?.files?.[0] || null;
  const occupation = document.getElementById("joinOccupation")?.value.trim() || null;
  const country    = document.getElementById("joinCountry")?.value.trim() || null;
  const reason     = document.getElementById("joinReason")?.value.trim() || null;

  // Basic validation
  if (!fullName) { showError("Please enter your full name."); return; }
  if (!phone)    { showError("Please enter your phone number."); return; }
  if (!email || !email.includes("@")) { showError("Please enter a valid email address."); return; }

  const payload = {
    full_name:  fullName,
    phone:      phone,
    email:      email,
    photo_url:  null,
    occupation: occupation,
    country:    country,
    reason:     reason,
    status:     "pending",
  };

  // ── Show success INSTANTLY — do not make the user wait for the database ──
  // The DB might be waking from sleep (Supabase free tier). Save happens in background.
  showSuccess();

  // ── Save to DB silently in background ──
  setTimeout(async () => {
    try {
      if (supabase) {
        const { error } = await supabase.from("membership_applications").insert(payload);
        if (error) {
          console.warn("[Join] DB save failed, queuing locally:", error.message);
          savePending(payload);
        } else {
          console.log("[Join] Application saved to database.");
        }
      } else {
        savePending(payload);
        console.log("[Join] Supabase not configured — saved locally.");
      }
    } catch (err) {
      console.warn("[Join] Unexpected error saving application:", err);
      savePending(payload);
    }

    // Upload photo in background too
    if (photoFile && supabase) {
      uploadPhoto(photoFile).then(async (photoUrl) => {
        if (photoUrl) {
          await supabase
            .from("membership_applications")
            .update({ photo_url: photoUrl })
            .eq("email", email)
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }, 0); // setTimeout(0) defers after UI update renders
}

/* -------------------------------------------------------------------------- */
/* Optional account creation                                                   */
/* -------------------------------------------------------------------------- */

async function handleAccountSubmit(e) {
  e.preventDefault();

  const name    = document.getElementById("accName")?.value.trim();
  const email   = document.getElementById("accEmail")?.value.trim();
  const phone    = document.getElementById("accPhone")?.value.trim() || null;
  const birthday = document.getElementById("accBirthday")?.value.trim() || null;
  const country  = document.getElementById("accCountry")?.value.trim() || null;
  const btn      = document.getElementById("joinAccountBtn");
  const success  = document.getElementById("joinAccountSuccess");

  if (!name || !email) {
    alert("Please enter your name and email to create an account.");
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  try {
    if (supabase) {
      await supabase.from("site_visitors").upsert({ name, email, phone, birthday, country }, { onConflict: "email" });
    }
    if (success) success.hidden = false;
    if (btn) { btn.hidden = true; }
  } catch (err) {
    console.warn("[Join] Account creation error:", err);
    if (btn) { btn.disabled = false; btn.textContent = "Create Account ›"; }
  }
}

/* -------------------------------------------------------------------------- */
/* File input label update                                                     */
/* -------------------------------------------------------------------------- */

function initFileLabel() {
  const input = document.getElementById("joinPhoto");
  const label = document.querySelector(".join-file-label");
  if (!input || !label) return;
  input.addEventListener("change", () => {
    label.textContent = input.files[0]?.name || "Choose a photo ›";
  });
}

/* -------------------------------------------------------------------------- */
/* Init                                                                        */
/* -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  const form    = document.getElementById("joinForm");
  const accForm = document.getElementById("joinAccountForm");

  if (form)    form.addEventListener("submit", handleApplicationSubmit);
  if (accForm) accForm.addEventListener("submit", handleAccountSubmit);

  initFileLabel();

  // Retry any applications that failed to reach the DB on a previous visit
  // (e.g. due to Supabase cold start). Runs silently after a short delay.
  setTimeout(flushPending, 3000);
});
