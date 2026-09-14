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

let allProfiles = [];

async function loadProfiles() {
  const { data, error } = await supabase.from("profiles").select("id, full_name, slug").eq("status", "published").order("full_name");
  if (!error && data) {
    allProfiles = data;
    const optionsHtml = data.map(p => `<option value="${p.slug}">${p.full_name}</option>`).join("");
    
    const founderSelect = document.getElementById("treeFounder");
    if (founderSelect) founderSelect.innerHTML += optionsHtml;
    
    document.querySelectorAll(".tree-child-select").forEach(select => {
      select.innerHTML += optionsHtml;
    });
  }
}

async function loadContent() {
  await loadProfiles();

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
  
  // Load Tree JSON
  if (data.tree_json) {
    setVal("treeFounder", data.tree_json.founder || "");
    const children = data.tree_json.children || [];
    for (let i = 0; i < 5; i++) {
      setVal(`treeChild${i + 1}`, children[i] || "");
    }
  }
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
    tree_json: {
      founder: val("treeFounder"),
      children: [
        val("treeChild1"),
        val("treeChild2"),
        val("treeChild3"),
        val("treeChild4"),
        val("treeChild5")
      ].filter(Boolean)
    }
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
