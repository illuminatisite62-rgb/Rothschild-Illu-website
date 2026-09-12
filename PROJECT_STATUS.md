# Rothschild Illuminati Organization — Project Status

Last updated: 2026-09-12

## Phase Progress

- [x] 1. Inspect reference image and assets
- [x] 2. Extract and organize assets → `assets/images/`
- [x] 3. Build homepage (index.html + css/{variables,global,header,homepage,responsive}.css + js/{config,supabase-client,app,homepage}.js)
- [x] 4. Run homepage locally (npx serve via .claude/launch.json "rothschild-site", port 8080)
- [x] 5. Inspect for visual/layout errors (confirmed via tall-viewport screenshot + DOM rect checks — matches reference closely)
- [x] 6. Refine homepage until close to reference (confirmed via screenshots + DOM checks at 390/768/~941/1024/1440 widths — no horizontal overflow anywhere, nav drawer open/close verified working)
- [x] 7. Create public site pages (family, profile, history, archive, about, contact) — all built and verified working with sample/fallback data (no Supabase configured yet)
- [x] 8. Create Supabase schema — supabase/schema.sql written (profiles,
      family_relationships, profile_images, sources, media, timeline_events,
      homepage_content singleton, site_settings, contact_messages, admin_roles)
- [x] 9. Configure security/RLS — supabase/policies.sql (is_admin() helper +
      per-table policies) and supabase/storage-policies.sql (3 public-read,
      admin-write buckets) written. supabase/seed.sql has optional sample data.
      NOT YET APPLIED to a live project — see BLOCKER note below.
- [ ] 10. Connect public data — blocked on Supabase project (see below); code
      is already written to use it the moment js/config.js has real values
- [x] 11. Build admin authentication — admin/index.html + js/admin/auth.js
      (Supabase Auth email/password, admin_roles check, redirect guard used
      by every other admin page via requireAdmin())
- [x] 12. Build admin CRUD — profiles.html/profile-editor.js (full tabbed
      editor: basic info, biography, family relationships, achievements,
      gallery, sources, SEO, publishing — create/edit/duplicate/delete/
      publish/unpublish/feature)
- [x] 13. Build media uploads — media.html/media.js (drag-drop upload to
      Supabase Storage, metadata form, edit/publish/delete)
- [x] 14. Build timeline/homepage CMS — timeline.html/timeline.js (full CRUD)
      and homepage.html/homepage.js (edits the homepage_content singleton;
      public js/homepage.js now reads it and overlays onto the static hero/
      archival/footer markup — content-only, layout untouched)
- [ ] 15. Test complete system — verified as much as possible WITHOUT a live
      Supabase project: login page shows "not configured" state correctly,
      every protected admin page's requireAdmin() guard correctly redirects
      to login with no console errors or broken requests (checked via
      network tab, not just screenshots). Full round-trip (real login → CRUD
      → publish → appears publicly) still needs to be tested once Supabase
      is connected — see BLOCKER note above.
- [x] 16. Configure Git/GitHub — git initialized, .gitignore written, all
      files staged. NOT YET COMMITTED as of the last crash — committing now.
      No GitHub remote yet (gh CLI not installed) — see BLOCKER note below.
- [x] 17. Prepare Vercel deployment — vercel.json written (cleanUrls:false to
      match serve.json's local behavior, noindex header on /admin/*)
- [x] 18. Write README — README.md written (project overview, Supabase setup,
      admin auth explanation, first-admin creation, local run, GitHub connect,
      Vercel deploy, how to update later, full file structure reference)
- [x] 19. Final test and cleanup — re-verified after the second app crash:
      no file corruption (checked sizes/tails of every file touched near the
      crash), initial git commit created (74 files, see commit 185f907),
      dev server restarts cleanly, homepage screenshot-confirmed pixel-for-
      pixel identical to the pre-crash version, zero console errors.

## Remaining work (needs the user)

Everything that can be built without external accounts is done. Two things
are blocked on the user's action — see the BLOCKER note above for full detail:

1. **Supabase**: not yet connected to a real project (CLI installed but not
   logged in). Until then the site runs entirely on its built-in sample data.
2. **GitHub**: local git repo is initialized and committed, but there's no
   `gh` CLI available in this environment, so no remote/push has happened.
   The user needs to either create a GitHub repo manually and give me the
   remote URL to push to, or install+authenticate `gh` themselves.

Once both are done, remaining work is genuinely small: paste Supabase
URL/anon key into js/config.js, run the 3-4 SQL files, create the first admin
user, push to GitHub, import into Vercel.

## Homepage visual correction pass (2026-09-10, post-launch)

The user reported the homepage wasn't close enough to
`assets/images/reference-homepage.png` and asked for an iterative
screenshot-compare-correct pass at the reference's exact 941×1672 viewport.
Did several rounds of navigate → screenshot → measure via
`getBoundingClientRect()` → adjust CSS → repeat. Key findings and fixes:

- **Real pre-existing bug found**: `.container { padding: 0 24px; }` inside
  the `@media (max-width: 1024px)` block in responsive.css was using the
  `padding` shorthand, which silently zeroed out `.hero-content`'s
  `padding-top` (set in homepage.css) at any viewport ≤1024px — this is why
  the hero always looked vertically compressed compared to the reference.
  Fixed by changing those two shorthand overrides (1024px and 480px
  breakpoints) to `padding-left`/`padding-right` only. Same fix applied in
  both places. **Watch for this pattern elsewhere**: any future
  `.container { padding: ... }` override in a media query will re-introduce
  this bug for any component relying on `.container`'s default vertical
  padding being untouched.
- **Real mobile bug found**: `.photo-frame-inner` had `aspect-ratio: 4/5`
  (portrait) inside the `@media (max-width: 480px)` block, making the
  archival photo card tall/portrait-shaped on phones despite being correctly
  landscape everywhere else. Fixed to `1.75/1` (landscape), matching the base
  desktop ratio (now `1.86/1`). This was likely the actual root of "looks
  wrong on a phone."
- **Real overflow bug introduced then caught during this pass**: initially
  set `.hero-title` font-size clamp with a 94px ceiling to hit the requested
  "90-105px" size, plus `white-space: nowrap` — this overflowed and got
  visibly clipped at both very narrow (390px, text ran off-screen) and
  mid-wide (1024px, text spilled past its own container) viewports, because
  `.hero-content`'s `max-width: 860px` combined with the site's padding
  breakpoints creates a widest-case available text width of ~796-812px
  regardless of viewport, and 94px "THE ROTHSCHILD" needs ~866px. Fixed by:
  lowering the font-size ceiling to 84px (still fits comfortably everywhere,
  confirmed via rect measurement at 390/768/941/1024/1440 — always ≥40px
  margin before the container edge), and scoping `white-space: nowrap` to
  `@media (min-width: 850px)` only so it's free to wrap to 2-3 lines on
  narrow screens instead of overflowing. **If the title font is ever made
  bigger again, re-verify with `getBoundingClientRect()` at all breakpoints,
  not just a screenshot** — the overflow was clipped by `.hero { overflow:
  hidden }` so it didn't cause page-level horizontal scroll and was easy to
  miss without exact measurement.
- Header rebuilt: large plain-serif-italic "R" monogram with a small
  fleur-de-lis glyph baked in via `::after` (CSS only, no image, no HTML
  change needed — see `.site-header .monogram-letter` in header.css), scoped
  so it ONLY affects the header (footer/admin still use the original compact
  circular badge). Header height increased (clamp up to 168px), background
  gradient stops adjusted twice (first pass looked right in isolation but put
  the "History / Shapes / Tomorrow" tagline in the dark-brown transition zone
  with poor contrast — fixed by moving the light-parchment zone earlier in
  the gradient).
- Hero crest opacity/size increased substantially (0.65→0.88, wider mask) so
  it reads as "clearly visible" per the reference rather than nearly
  invisible; architecture mask/filter loosened (less dark, starts closer to
  center) to match the reference's brighter, more centrally-anchored
  building.
- Hero vertical rhythm retuned (padding-top clamps on `.hero` and
  `.hero-content`) so `ESTABLISHED 1760` and the hero's total height land
  within ~20px of the reference's target y-coordinates at 941 width
  (verified via rect measurement, not just eyeballing).
- Established-line rules, ornament-divider lines, subtitle size, description
  width, and button size/gradient/radius all adjusted to match the spec's
  approximate target measurements (verified subtitle/description hit their
  target ranges almost exactly via rect measurement).
- Button-stacking breakpoint moved from 768px down to 480px (side-by-side
  much further down before stacking, matching "stack only near phone
  width").
- Archival photo frame: aspect ratio, border-radius (20px outer / 14px
  inner), width (90%), caption styling (uppercase, 3-line top caption),
  play-button and wax-seal sizes all increased substantially per spec, using
  `clamp()` so they scale smoothly rather than jumping at breakpoints.
- Parchment section background now layers the old-script and old-map
  textures (low opacity) instead of just one texture.

Verified clean (no console errors, no horizontal overflow, nav drawer still
functional) at 390 / 768 / 941 / 1024 / 1440px after all changes.

## Homepage correction pass #2 (2026-09-10, same day)

User said the homepage still wasn't close enough and gave a much more
detailed checklist, focused entirely on header/hero/archival area (explicitly
told to leave Supabase/admin/other pages untouched). Did a full fresh asset
inventory + pixel-level investigation before changing anything:

- **Confirmed via `file` on every asset**: all supplied images are very
  low-resolution (crest 294×334, architecture 316×334, family photo
  391×263, and — important — the texture files 09/10/11/13/14 are only
  ~124-134×54px). No hidden/better logo or seal asset exists anywhere in the
  project; `01_logo_emblem*.png` remains a small triangle/pyramid mark
  unrelated to the reference's ornate "R", confirming the CSS-built monogram
  from pass #1 is genuinely the best option, not a shortcut.
- **Found the real cause of the "wax seal looks like a square sticker" bug**,
  which pass #1 had incorrectly marked as resolved. Sampled actual pixel
  alpha values of `06_red_wax_seal_transparent.png` via canvas
  `getImageData()`: corners read up to 92% opaque (not 0%) and alpha is
  noisy/high almost everywhere, not just at the edges. The file is NOT a
  clean cutout — testing it against a black page background earlier (pass 1)
  was misleading because semi-transparent dark pixels look identical to
  fully-transparent ones on black. Fixed properly: wrapped the `<img>` in a
  `.wax-seal` div, applied a clean circular `mask-image` (radial-gradient) to
  the inner `.wax-seal-img`, and kept `filter: drop-shadow(...)` on the OUTER
  wrapper only. This two-layer split is necessary because `filter` is
  computed before `mask` in the CSS rendering pipeline — masking a single
  element doesn't clean up its own drop-shadow, which would otherwise still
  be computed from the noisy pre-mask alpha and re-create a ghost square. If
  this ever regresses, check that the mask and the filter are still on two
  different nested elements, not the same one.
- **Hero/archival composition rebalanced** per detailed feedback: crest
  enlarged and mask loosened further (now shows the full crown/shield/lions
  and the "CONCORDIA…" banner, not just the top portion) with `mix-blend-mode:
  screen`; architecture layer narrowed (62%→54% width) and its mask pushed
  right so it stays fully transparent until ~58% of the hero's width and
  fully opaque past ~70%, instead of ghosting into the center like before.
- **"Huge empty gap" complaint**: measured precisely via
  `getBoundingClientRect()` at 390/941/1440 before changing anything — the
  actual gap between the buttons and the parchment section was 56-96px, not
  "hundreds of pixels" as described. Trimmed it further anyway (hero
  `padding-bottom` clamp max 96px→64px, `.archival-section` top padding
  76px→44px) since tightening it is a safe, direct response regardless of
  the exact prior measurement, and it's possible the user was viewing a
  wider real browser window or a cached version.
- **Texture "seams/blocks" bug**: found `.archival-section::before` was
  painting the old-map texture at "40% auto" sizing anchored bottom-right —
  directly overlapping the wax seal's corner and creating a hard-edged
  rectangle there (on top of, not instead of, the alpha-channel issue above).
  Replaced with: a single non-repeating `background-size: cover` parchment
  wash (`mix-blend-mode: multiply`, 0.16 opacity — cover + single instance
  means no repeat boundary is possible), plus one small script-texture accent
  confined to the bottom-LEFT corner only (away from the seal) with a radial
  mask so it fades out instead of ending in a hard edge.
- Photo frame border-radius reduced (20px/14px → 6px/3px) and box-shadow
  softened — was reading as a "modern rounded card" rather than a frame.

Re-verified no console errors and no horizontal overflow at all five
breakpoints (390/768/941/1024/1440) after this round, and that the nav
drawer still opens/closes correctly.

**Known remaining limitation, not a bug**: the hero title's font-size ceiling
is capped at 84px (spec suggested 90-105px) because anything larger causes
real text-overflow at 1024px and 390px widths, given the fixed 860px
`hero-content` max-width — see pass #1 notes above for the exact math. This
was a deliberate trade-off (no overflow > exact px target) and would need a
structural change (e.g. a viewport-aware `hero-content` max-width) to safely
increase further.

## Homepage correction pass #3 (2026-09-10 → 2026-09-12)

After the machine restart, recovered project state and continued the homepage
top-half refinement. Created `css/homepage-v3.css` (loaded last, after all
other stylesheets) as a dedicated override layer rather than editing the base
CSS files — this keeps changes safe and reversible, and avoids re-introducing
the container-padding regression from pass #1.

Key changes in homepage-v3.css:
- **Header**: switched to `position: absolute` so it floats over the hero
  artwork rather than pushing it down. Semi-transparent gradient background
  preserves artwork visibility. `border-bottom: none` removes the dividing line.
- **Hero layout**: changed to `display: block; height: auto` (removed the
  `flex / justify-content: flex-end` that created empty dark space below the
  buttons at some viewport heights). Now uses `padding-top` on `.hero-content`
  to push text below the artwork zone.
- **Hero artwork**: `min-height: 0` on `.hero` — height is now fully content-
  driven, eliminating the gap between buttons and parchment that existed before.
- **Torn parchment transition**: inline SVG `mask-image` with a custom jagged
  path (`0,68 … L1440,12 L1440,68 Z`) applied via `.hero::after`, giving a
  rough irregular torn-paper silhouette in parchment color at the hero bottom.
- **Parchment textures**: script texture now covers the full section with
  `background-size: 480px` (repeating) masked by a radial gradient — no hard
  rectangle edges; old-map texture blended at 0.28 opacity.
- **Photo frame**: `overflow: visible` propagated through both `.photo-frame`
  and `.archival-section .container` so the wax seal can overflow the frame.
  Mat padding reduced to 5px; border to 1.5px. `border-radius: 3px`.
- **Wax seal**: two-layer pattern preserved (filter on outer `.wax-seal` div,
  mask-image on inner `.wax-seal-img`) to prevent ghost-square drop-shadow
  artifact; `bottom`/`right` offsets adjusted with clamp() for scale.
- **Tagline**: letter-spacing reduced from 0.36em to 0.22em with
  `word-break: break-word` fallback — prevents overflow at narrow viewports.
- **Body**: `background: #070c17` matches the hero's deep navy so any side-
  edge bleed from the artwork layer is invisible rather than parchment-colored.

Verified (via browser subagent screenshots at 941×1800):
- No hard line between header and hero ✅
- Crest (left) and architecture (right) visible through header area ✅
- Torn jagged edge at hero/parchment boundary ✅
- Photo frame wide (~93% of viewport), wax seal extends below-right ✅
- Tagline fits on one line at 941px ✅
- No console errors; no horizontal overflow ✅
- Git commit: 2e26c1d

## Notes / Decisions

- No zip was present; individual asset files were already loose in the project
  root. They have been moved into `assets/images/` (unchanged filenames).
- The reference file was named `rothschild_family_heritage_landing_page(2).png`;
  moved to `assets/images/reference-homepage.png` for use as the visual guide.
- `01_logo_emblem_transparent.png` is a triangle/pyramid-style Illuminati emblem,
  NOT the gold "R" monogram shown in the reference header. The reference's "R"
  monogram will be built as real styled HTML/CSS text (serif "R" in a thin gold
  circular frame with a small fleur-de-lis accent) so it stays a true text
  element, not a screenshot. The pyramid emblem asset is reserved for secondary
  branding spots (favicon, footer, admin login) where an "Illuminati" mark fits.
- Historical/conspiracy content policy: no unsupported claims about actual
  Rothschild membership in secret societies will be presented as fact anywhere
  in copy. "Illuminati Organization" is used strictly as the site's own brand
  name (fictional in-world archive/society framing), with copy kept
  editorial/neutral. Admin-entered biography content should cite sources.
- IMPORTANT ASSET FINDING: only `06_red_wax_seal_transparent.png` has genuine
  alpha transparency. `07_gold_ornamental_divider_transparent.png`,
  `12_fleur_de_lis_ornament_transparent.png`, and `01_logo_emblem_transparent.png`
  all have baked-in opaque rectangular backgrounds despite the filename — using
  them as free-floating overlays shows an ugly visible box. Fix applied: the
  hero's ornamental divider is now built as real HTML/CSS (two gradient lines +
  the Unicode fleur-de-lis glyph ⚜, see `.ornament-divider` in global.css and
  the markup in index.html), not an image. The wax seal PNG is used directly
  (confirmed transparent, works correctly). Do the same CSS-based approach
  anywhere else a divider/fleur ornament is needed sitewide — do not use 07/12
  raw as overlays. The pyramid emblem (01) and fleur ornament (12) images are
  still fine to use later in a bordered/framed context where a background
  plaque is expected (e.g. admin login badge), just not as transparent overlays.
- Header monogram is a real CSS/HTML "R" letter (gold gradient text-clip inside
  a bordered circle, see `.monogram`/`.monogram-letter` in header.css), not an
  image — matches the reference well and confirmed via screenshot.
- Hero composition uses layered absolutely-positioned divs
  (`.hero-art-arch`, `.hero-art-crest`, `.hero-art-texture`, `.hero-art-overlay`)
  blended with mask-image/mix-blend-mode over a navy background. Confirmed
  visually correct via screenshot at the top of the page.
- TOOLING NOTE: the Claude Code Browser-pane preview tool has a rendering bug
  where `computer` scroll actions (wheel or JS `scrollTo`) cause subsequent
  screenshots to show stale/blank content, even though the real DOM/CSS layout
  is correct (verified independently via `elementFromPoint`/`getBoundingClientRect`
  in `javascript_tool`, which always reported correct positions). Workaround:
  set a tall custom viewport with `resize_window` (e.g. 960x2200) and do a fresh
  `navigate` before screenshotting, so the needed section is visible without
  scrolling — this renders correctly. Heights much beyond ~2200-2500 also seem
  to break (content renders squeezed at the top followed by a large blank
  area), so capture the page in ~2000px-tall chunks via repeated fresh
  navigations rather than one very tall shot or scrolling. This is a tool
  quirk, not a site bug — do not "fix" it by changing site CSS.
- Homepage sections beyond the reference crop (featured profiles, timeline
  preview, archive preview) were added per the CMS/content spec, styled
  consistently with the historical aesthetic, and read from Supabase via
  js/homepage.js with static fallback markup already in index.html (used when
  Supabase isn't configured yet, which it currently isn't — js/config.js has
  empty SUPABASE_URL/SUPABASE_ANON_KEY placeholders).
- 390 / 768 / 1024 / 1440 breakpoints and the nav drawer open/close were all
  verified (screenshots + DOM checks). No horizontal overflow anywhere.
- Public pages built: family.html (+family.css/family.js), profile.html
  (+profile.css/profile.js), history.html (+history.css/history.js),
  archive.html (+archive.css/archive.js), about.html (+about.css),
  contact.html (+contact.css/contact.js). All share the same header/nav-drawer/
  footer markup (duplicated per page, no templating available) and the new
  shared `.page-banner` component added to global.css.
- Each data-driven page (family/profile/history/archive) tries Supabase first
  via js/supabase-client.js, and falls back to a small hard-coded sample
  dataset defined at the top of its own JS file when Supabase isn't configured
  (it currently isn't) or a query errors/returns nothing. This means the whole
  site is already click-through-able end to end before Supabase is wired up.
- Family/profile sample data is intentionally cross-linked (e.g. Mayer Amschel
  Rothschild → sons Nathan and James) so the "related family members" feature
  is demonstrable without a real database.
- LOCAL DEV SERVER FIX: `npx serve` defaults to "clean URLs" and 301-redirects
  `/profile.html?slug=x` → `/profile`, DROPPING the query string — this broke
  profile.html entirely under local dev. Fixed by adding `serve.json` at the
  project root with `{"cleanUrls": false, "trailingSlash": false}`. This is a
  local-dev-only concern (plain static hosting / Vercel don't do this by
  default), but keep serve.json in place so local testing matches production.
  If profile.html?slug=... ever 404s or loses its query locally again, check
  that serve.json is still present and the dev server was restarted after it
  was added (301s are cached hard by the browser — a stale cached redirect
  can look like the bug even after the fix, requiring a hard reload or a
  differently-parameterized URL to confirm).
- TOOLING NOTE (additional): the Browser-pane preview tool's own `navigate`
  action silently strips `.html` and any `?query` string from the URL before
  navigating (confirmed independently of the server, via window.location).
  Workaround used for testing: run `window.location.href = '...full url...'`
  via `javascript_tool` instead of the `navigate` tool when the URL has a
  query string. Also, the pane sometimes reports itself "hidden"/not
  compositing (screenshot timeouts) depending on the desktop app's window
  focus — `get_page_text` / `read_page` / network+console inspection via
  `javascript_tool` still work fine in that state and were used to verify
  history/archive/about/contact pages when screenshots weren't available.
- BLOCKER (needs the user): Supabase CLI is installed locally (v2.115.0) but
  NOT authenticated (`supabase projects list` → Unauthorized). To actually
  connect this project to a real database, the user needs to either:
    (a) run `supabase login` in a terminal (opens a browser to authenticate),
        then tell me the project ref (or say "create a new project") so I can
        run `supabase link --project-ref <ref>` and apply schema.sql →
        policies.sql → storage-policies.sql → (optional) seed.sql, and fill in
        the real SUPABASE_URL/SUPABASE_ANON_KEY in js/config.js; or
    (b) create the project themselves in the Supabase dashboard, run the four
        SQL files in the Supabase SQL editor in order (schema, policies,
        storage-policies, then optionally seed), and paste me the Project URL
        and anon/public key (Settings → API) to put in js/config.js.
  Never paste a service-role key anywhere in this project — only the anon key
  belongs in js/config.js.
  Until this happens, every data-driven page keeps working off its built-in
  sample data fallback (see above), so this is not blocking visible progress —
  proceeding to build the admin UI (auth screen + dashboard + CRUD screens)
  against the same supabase-client.js, ready to go live the moment config.js
  has real values.

## How to run locally

Static site — no build step. Serve the folder root with any static server, e.g.:

    npx serve .

or Python:

    python -m http.server 8080

Then open http://localhost:8080/index.html
