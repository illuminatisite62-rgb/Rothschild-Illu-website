import { supabase } from "../supabase-client.js";
import { requireAdmin } from "./auth.js";

const RELATIONSHIP_TYPES = ["father", "mother", "spouse", "son", "daughter", "sibling", "relative", "other"];

let profileId = null; // null while creating a new profile
let allProfilesForPicker = [];
let slugManuallyEdited = false;

function showToast(message, isError) {
  const toast = document.getElementById("adminToast");
  toast.textContent = message;
  toast.className = `admin-toast show${isError ? " error" : ""}`;
  setTimeout(() => toast.classList.remove("show"), 3200);
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function initTabs() {
  const tabButtons = document.querySelectorAll(".editor-tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".editor-tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`.editor-tab-panel[data-panel="${btn.getAttribute("data-tab")}"]`).classList.add("active");
    });
  });
}

function initSlugAutoFill() {
  document.getElementById("slug").addEventListener("input", () => {
    slugManuallyEdited = true;
  });
  document.getElementById("fullName").addEventListener("input", (e) => {
    if (!slugManuallyEdited && !profileId) {
      document.getElementById("slug").value = slugify(e.target.value);
    }
  });
}

async function uploadAdminPhoto(file) {
  if (!supabase || !file) return null;
  try {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("admin-uploads")
      .upload(fileName, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data: publicData } = supabase.storage.from("admin-uploads").getPublicUrl(fileName);
    return publicData?.publicUrl || null;
  } catch (err) {
    console.warn("Upload error:", err);
    showToast("Failed to upload image.", true);
    return null;
  }
}

function initUploads() {
  document.getElementById("portraitUpload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById("portraitUrl").value = "Uploading...";
    const url = await uploadAdminPhoto(file);
    if (url) {
      document.getElementById("portraitUrl").value = url;
      const preview = document.getElementById("portraitPreview");
      if (preview) {
        preview.src = url;
        preview.hidden = false;
      }
    } else {
      document.getElementById("portraitUrl").value = "";
    }
  });

  document.getElementById("coverUpload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById("coverImageUrl").value = "Uploading...";
    const url = await uploadAdminPhoto(file);
    if (url) {
      document.getElementById("coverImageUrl").value = url;
    } else {
      document.getElementById("coverImageUrl").value = "";
    }
  });
}

/* ---------------------------------------------------------------------- */
/* Repeatable row builders: relationships, gallery images, sources         */
/* ---------------------------------------------------------------------- */

function makeRow(container, html) {
  const row = document.createElement("div");
  row.className = "admin-form-row";
  row.style.alignItems = "flex-end";
  row.innerHTML = html;
  container.appendChild(row);
  row.querySelector("[data-remove]").addEventListener("click", () => row.remove());
  return row;
}

function addRelationshipRow(data = {}) {
  const container = document.getElementById("relationshipsList");
  const profileOptions = allProfilesForPicker
    .filter((p) => p.id !== profileId)
    .map((p) => `<option value="${p.id}" ${p.id === data.related_profile_id ? "selected" : ""}>${p.full_name}</option>`)
    .join("");

  makeRow(
    container,
    `
    <div class="admin-form-field" style="flex: 1;">
      <label>Relationship</label>
      <select data-field="type">
        ${RELATIONSHIP_TYPES.map((t) => `<option value="${t}" ${t === data.relationship_type ? "selected" : ""}>${t}</option>`).join("")}
      </select>
    </div>
    <div class="admin-form-field" style="flex: 2;">
      <label>Person</label>
      <select data-field="related_profile_id">
        <option value="">Select a profile&hellip;</option>
        ${profileOptions}
      </select>
    </div>
    <div class="admin-form-field" style="flex: 0;">
      <button type="button" class="btn btn-outline-gold" data-remove>Remove</button>
    </div>
  `
  );
}

function addGalleryRow(data = {}) {
  const container = document.getElementById("galleryList");
  makeRow(
    container,
    `
    <div class="admin-form-field" style="flex: 2;">
      <label>Image URL</label>
      <input type="text" data-field="image_url" value="${data.image_url ? data.image_url.replace(/"/g, "&quot;") : ""}" />
    </div>
    <div class="admin-form-field" style="flex: 2;">
      <label>Caption</label>
      <input type="text" data-field="caption" value="${data.caption ? data.caption.replace(/"/g, "&quot;") : ""}" />
    </div>
    <div class="admin-form-field" style="flex: 0;">
      <button type="button" class="btn btn-outline-gold" data-remove>Remove</button>
    </div>
  `
  );
}

function addSourceRow(data = {}) {
  const container = document.getElementById("sourcesList");
  makeRow(
    container,
    `
    <div class="admin-form-field" style="flex: 2;">
      <label>Label</label>
      <input type="text" data-field="label" value="${data.label ? data.label.replace(/"/g, "&quot;") : ""}" />
    </div>
    <div class="admin-form-field" style="flex: 2;">
      <label>URL (optional)</label>
      <input type="text" data-field="url" value="${data.url ? data.url.replace(/"/g, "&quot;") : ""}" />
    </div>
    <div class="admin-form-field" style="flex: 0;">
      <button type="button" class="btn btn-outline-gold" data-remove>Remove</button>
    </div>
  `
  );
}

function readRows(containerId, fields) {
  const rows = document.querySelectorAll(`#${containerId} > div`);
  const result = [];
  rows.forEach((row) => {
    const entry = {};
    fields.forEach((field) => {
      entry[field] = row.querySelector(`[data-field="${field}"]`).value.trim();
    });
    result.push(entry);
  });
  return result;
}

/* ---------------------------------------------------------------------- */
/* Load / populate                                                        */
/* ---------------------------------------------------------------------- */

function val(id) {
  return document.getElementById(id).value.trim();
}

function setVal(id, value) {
  document.getElementById(id).value = value || "";
}

async function loadProfilePickerList() {
  const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
  allProfilesForPicker = data || [];
}

async function loadExistingProfile(id) {
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error || !profile) {
    showToast("Could not load that profile.", true);
    return;
  }

  document.getElementById("editorTitle").textContent = `Edit: ${profile.full_name}`;
  setVal("fullName", profile.full_name);
  setVal("slug", profile.slug);
  slugManuallyEdited = true;
  setVal("alternativeNames", profile.alternative_names);
  setVal("birthDate", profile.birth_date);
  setVal("deathDate", profile.death_date);
  setVal("birthPlace", profile.birth_place);
  setVal("deathPlace", profile.death_place);
  setVal("nationality", profile.nationality);
  setVal("familyBranch", profile.family_branch);
  setVal("occupation", profile.occupation);
  setVal("titles", profile.titles);
  setVal("portraitUrl", profile.portrait_url);
  setVal("coverImageUrl", profile.cover_image_url);
  setVal("facebookUrl", profile.facebook_url);

  const portraitPreview = document.getElementById("portraitPreview");
  if (profile.portrait_url) {
    portraitPreview.src = profile.portrait_url;
    portraitPreview.hidden = false;
  }

  setVal("shortBio", profile.short_bio);
  setVal("fullBio", profile.full_bio);
  setVal("earlyLife", profile.early_life);
  setVal("familyBackground", profile.family_background);
  setVal("education", profile.education);
  setVal("career", profile.career);
  setVal("businessActivities", profile.business_activities);
  setVal("historicalContext", profile.historical_context);
  setVal("personalLife", profile.personal_life);

  setVal("achievements", profile.achievements);
  setVal("philanthropy", profile.philanthropy);
  setVal("legacy", profile.legacy);
  setVal("interestingFacts", profile.interesting_facts);
  setVal("quotes", profile.quotes);

  setVal("seoTitle", profile.seo_title);
  setVal("seoDescription", profile.seo_description);

  document.getElementById("featured").checked = Boolean(profile.featured);
  document.getElementById("statusDisplay").value = profile.status === "published" ? "Published" : "Draft";
  document.getElementById("publishedAtDisplay").value = profile.published_at
    ? new Date(profile.published_at).toLocaleString("en-US")
    : "Not yet published";

  const [{ data: relationships }, { data: gallery }, { data: sources }] = await Promise.all([
    supabase.from("family_relationships").select("relationship_type, related_profile_id").eq("profile_id", id),
    supabase.from("profile_images").select("image_url, caption").eq("profile_id", id).order("display_order"),
    supabase.from("sources").select("label, url").eq("profile_id", id),
  ]);

  (relationships || []).forEach((r) => addRelationshipRow(r));
  (gallery || []).forEach((g) => addGalleryRow(g));
  (sources || []).forEach((s) => addSourceRow(s));
}

/* ---------------------------------------------------------------------- */
/* Save                                                                    */
/* ---------------------------------------------------------------------- */

function collectProfilePayload(status) {
  return {
    full_name: val("fullName"),
    slug: val("slug"),
    alternative_names: val("alternativeNames") || null,
    birth_date: val("birthDate") || null,
    death_date: val("deathDate") || null,
    birth_place: val("birthPlace") || null,
    death_place: val("deathPlace") || null,
    nationality: val("nationality") || null,
    family_branch: val("familyBranch") || null,
    occupation: val("occupation") || null,
    titles: val("titles") || null,
    portrait_url: val("portraitUrl") || null,
    cover_image_url: val("coverImageUrl") || null,
    facebook_url: val("facebookUrl") || null,
    short_bio: val("shortBio") || null,
    full_bio: val("fullBio") || null,
    early_life: val("earlyLife") || null,
    family_background: val("familyBackground") || null,
    education: val("education") || null,
    career: val("career") || null,
    business_activities: val("businessActivities") || null,
    historical_context: val("historicalContext") || null,
    personal_life: val("personalLife") || null,
    achievements: val("achievements") || null,
    philanthropy: val("philanthropy") || null,
    legacy: val("legacy") || null,
    interesting_facts: val("interestingFacts") || null,
    quotes: val("quotes") || null,
    seo_title: val("seoTitle") || null,
    seo_description: val("seoDescription") || null,
    featured: document.getElementById("featured").checked,
    status,
  };
}

async function syncChildRows(id) {
  const relationships = readRows("relationshipsList", ["type", "related_profile_id"]).filter((r) => r.related_profile_id);
  const gallery = readRows("galleryList", ["image_url", "caption"]).filter((g) => g.image_url);
  const sources = readRows("sourcesList", ["label", "url"]).filter((s) => s.label);

  await Promise.all([
    supabase.from("family_relationships").delete().eq("profile_id", id),
    supabase.from("profile_images").delete().eq("profile_id", id),
    supabase.from("sources").delete().eq("profile_id", id),
  ]);

  const inserts = [];
  if (relationships.length) {
    inserts.push(
      supabase.from("family_relationships").insert(
        relationships.map((r) => ({ profile_id: id, related_profile_id: r.related_profile_id, relationship_type: r.type }))
      )
    );
  }
  if (gallery.length) {
    inserts.push(
      supabase.from("profile_images").insert(gallery.map((g, i) => ({ profile_id: id, image_url: g.image_url, caption: g.caption || null, display_order: i })))
    );
  }
  if (sources.length) {
    inserts.push(supabase.from("sources").insert(sources.map((s) => ({ profile_id: id, label: s.label, url: s.url || null }))));
  }

  await Promise.all(inserts);
}

async function saveProfile(status) {
  const fullName = val("fullName");
  const slug = val("slug");

  if (!fullName || !slug) {
    showToast("Full Name and Slug are required.", true);
    document.querySelector('.editor-tab-btn[data-tab="basic"]').click();
    return;
  }

  const payload = collectProfilePayload(status);

  let savedId = profileId;

  if (profileId) {
    const { error } = await supabase.from("profiles").update(payload).eq("id", profileId);
    if (error) return showToast(`Save failed: ${error.message}`, true);
  } else {
    const { data, error } = await supabase.from("profiles").insert(payload).select("id").single();
    if (error) return showToast(`Save failed: ${error.message}`, true);
    savedId = data.id;
    profileId = savedId;
    const url = new URL(window.location.href);
    url.searchParams.set("id", savedId);
    window.history.replaceState({}, "", url);
    document.getElementById("editorTitle").textContent = `Edit: ${fullName}`;
  }

  await syncChildRows(savedId);

  document.getElementById("statusDisplay").value = status === "published" ? "Published" : "Draft";
  showToast(status === "published" ? "Profile published." : "Draft saved.");
  return savedId;
}

function initButtons() {
  document.getElementById("addRelationshipBtn").addEventListener("click", () => addRelationshipRow());
  document.getElementById("addGalleryImageBtn").addEventListener("click", () => addGalleryRow());
  document.getElementById("addSourceBtn").addEventListener("click", () => addSourceRow());

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = e.submitter?.getAttribute("data-status") || "draft";
    await saveProfile(status);
  });

  document.getElementById("previewBtn").addEventListener("click", async () => {
    const id = await saveProfile(document.getElementById("statusDisplay").value === "Published" ? "published" : "draft");
    if (!id) return;
    window.open(`../profile.html?slug=${encodeURIComponent(val("slug"))}`, "_blank", "noopener");
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const admin = await requireAdmin();
  if (!admin) return;

  initTabs();
  initSlugAutoFill();
  initUploads();
  initButtons();

  await loadProfilePickerList();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    profileId = id;
    await loadExistingProfile(id);
  }
});
