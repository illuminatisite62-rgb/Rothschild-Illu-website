/**
 * Contact form — validates input client-side and stores the message in
 * Supabase's `contact_messages` table. Row Level Security should allow
 * public INSERT only (no read/update/delete) on that table — see
 * supabase/policies.sql.
 */
import { supabase } from "./supabase-client.js";

function setError(fieldId, hasError) {
  document.getElementById(fieldId).classList.toggle("has-error", hasError);
}

function validate(values) {
  let valid = true;

  if (!values.name.trim()) {
    setError("fieldName", true);
    valid = false;
  } else {
    setError("fieldName", false);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(values.email.trim())) {
    setError("fieldEmail", true);
    valid = false;
  } else {
    setError("fieldEmail", false);
  }

  if (!values.subject.trim()) {
    setError("fieldSubject", true);
    valid = false;
  } else {
    setError("fieldSubject", false);
  }

  if (values.message.trim().length < 10) {
    setError("fieldMessage", true);
    valid = false;
  } else {
    setError("fieldMessage", false);
  }

  return valid;
}

function showStatus(message, type) {
  const el = document.getElementById("formStatus");
  el.textContent = message;
  el.className = `form-status ${type}`;
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const values = {
      name: document.getElementById("nameInput").value,
      email: document.getElementById("emailInput").value,
      subject: document.getElementById("subjectInput").value,
      message: document.getElementById("messageInput").value,
    };

    if (!validate(values)) {
      showStatus("Please correct the highlighted fields.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    if (!supabase) {
      // No backend configured yet — let the administrator know via console,
      // and tell the visitor honestly rather than pretending it was sent.
      console.warn("[Rothschild] Supabase is not configured; contact message was not stored.", values);
      showStatus("Thank you — however, this site's message storage is not yet configured. Please try again later.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Message";
      return;
    }

    const { error } = await supabase.from("contact_messages").insert({
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject.trim(),
      message: values.message.trim(),
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Send Message";

    if (error) {
      console.error("[Rothschild] Failed to submit contact message:", error.message);
      showStatus("Something went wrong sending your message. Please try again.", "error");
      return;
    }

    showStatus("Thank you — your message has been received.", "success");
    form.reset();
  });
});
