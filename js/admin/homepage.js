import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

function showToast(message, isError) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${isError ? " error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function setVal(id, value) {
  document.getElementById(id).value = value || "";
}

function val(id) {
  return document.getElementById(id).value.trim();
}

async function loadContent() {
  const { data, error } = await supabase.from("homepage_content").select("*").eq("id", 1).maybeSingle();

  if (error) {
    showToast(`Could not load homepage content: ${error.message}`, true);
    return;
  }
  if (!data) return;

  setVal("heroEstablishedText", data.hero_established_text);
  setVal("heroLine1", data.hero_heading_line1);
  setVal("heroLine2", data.hero_heading_line2);
  setVal("heroSubtitle", data.hero_subtitle);
  setVal("heroDescription", data.hero_description);
  setVal("btnPrimaryText", data.hero_button_primary_text);
  setVal("btnPrimaryUrl", data.hero_button_primary_url);
  setVal("btnSecondaryText", data.hero_button_secondary_text);
  setVal("btnSecondaryUrl", data.hero_button_secondary_url);
  setVal("videoUrl", data.video_url);
  setVal("archivalCaptionTop", data.archival_caption_top);
  setVal("archivalCaptionBottom", data.archival_caption_bottom);
  setVal("taglineText", data.tagline_text);
  setVal("footerAboutText", data.footer_about_text);
}

async function handleSubmit(e) {
  e.preventDefault();

  const payload = {
    hero_established_text: val("heroEstablishedText"),
    hero_heading_line1: val("heroLine1"),
    hero_heading_line2: val("heroLine2"),
    hero_subtitle: val("heroSubtitle"),
    hero_description: val("heroDescription"),
    hero_button_primary_text: val("btnPrimaryText"),
    hero_button_primary_url: val("btnPrimaryUrl"),
    hero_button_secondary_text: val("btnSecondaryText"),
    hero_button_secondary_url: val("btnSecondaryUrl"),
    video_url: val("videoUrl") || null,
    archival_caption_top: val("archivalCaptionTop"),
    archival_caption_bottom: val("archivalCaptionBottom"),
    tagline_text: val("taglineText"),
    footer_about_text: val("footerAboutText"),
  };

  const { error } = await supabase.from("homepage_content").update(payload).eq("id", 1);
  if (error) return showToast(`Save failed: ${error.message}`, true);
  showToast("Homepage content saved.");
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  document.getElementById("homepageForm").addEventListener("submit", handleSubmit);
  loadContent();
});
