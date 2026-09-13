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
  text.textContent = isSubmitting ? "Submitting…" : "SUBMIT APPLICATION";
}

function showSuccess() {
  const form    = document.getElementById("joinForm");
  const success = document.getElementById("joinSuccess");
  const account = document.getElementById("joinAccountSection");
  if (form)    form.hidden    = true;
  if (success) success.hidden = false;
  if (account) account.hidden = false; // reveal optional account block
}

/* -------------------------------------------------------------------------- */
/* Photo upload to Supabase Storage (if Supabase is configured)               */
/* -------------------------------------------------------------------------- */

async function uploadPhoto(file) {
  if (!supabase || !file) return null;
  try {
    const ext      = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
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

  setSubmitting(true);

  try {
    // 1. Upload photo (non-blocking — if it fails, we still save the form)
    const photoUrl = await uploadPhoto(photoFile);

    // 2. Save to Supabase
    if (supabase) {
      const { error } = await supabase.from("membership_applications").insert({
        full_name:   fullName,
        phone:       phone,
        email:       email,
        photo_url:   photoUrl,
        occupation:  occupation,
        country:     country,
        reason:      reason,
        status:      "pending",
      });

      if (error) {
        console.error("[Join] Insert error:", error);
        // Still show success to user — data may have partially saved or there's a transient error
        showError("There was a problem saving your application. Please try again or contact us directly.");
        setSubmitting(false);
        return;
      }
    } else {
      // Supabase not configured — log to console for development
      console.log("[Join] Application (Supabase not configured):", { fullName, phone, email, occupation, country, reason });
    }

    showSuccess();
  } catch (err) {
    console.error("[Join] Unexpected error:", err);
    showError("An unexpected error occurred. Please try again.");
    setSubmitting(false);
  }
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
});
