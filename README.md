# Rothschild Illuminati Organization

A historical/archive-style website presenting Rothschild family biographies,
timelines and archive material. Built as a plain HTML5 / CSS3 / vanilla
JavaScript site with [Supabase](https://supabase.com) as the backend
(database, auth, storage) — no framework, no build step.

> **A note on the name and content policy.** "Illuminati Organization" is
> this project's own branding — a framing device for the archive, not a
> historical claim. The site does not assert that any Rothschild family
> member belonged to a secret society. All biographical and historical
> content is meant to be administrator-entered and sourced; see the
> disclaimer on the [About page](about.html).

---

## 1. How the project works

This is a **static site**: every `.html` file in the project root is a real
page, styled by the CSS files in `css/` and made interactive by the plain
`<script>` files in `js/`. There is no server-side rendering and no build
step — you can open `index.html` directly, or serve the folder with any
static file server.

```
/                     Public pages (index, family, profile, history, archive, about, contact)
/admin/               Admin dashboard (login-gated)
/css/                 One stylesheet per concern (variables, global, header, per-page, responsive, admin)
/js/                  One script per public page, plus shared config/supabase-client/app
/js/admin/            One script per admin page, plus shared auth.js
/assets/images/       All images and textures
/supabase/            SQL files that define and secure the database (see below)
```

Every data-driven page (family, profile, history, archive, and the homepage's
featured/timeline sections) tries to load real data from Supabase first. If
Supabase isn't configured yet, or a query fails, it falls back to a small
hard-coded sample dataset defined at the top of that page's JS file — so the
whole site is click-through-able even before you set up a database.

## 2. How Supabase is connected

The browser talks to Supabase using **only two public values**: your
project's URL and its "anon" (public) key. These live in
[`js/config.js`](js/config.js):

```js
window.ROTHSCHILD_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
```

[`js/supabase-client.js`](js/supabase-client.js) reads those two values and
creates a shared Supabase client that every page's script imports. The anon
key is **safe to expose in the browser** — it identifies your project, but it
cannot read or write anything by itself. What actually controls who can read
or write which rows is **Row Level Security (RLS)**, configured entirely on
the database side (see `supabase/policies.sql`). This means:

- Nobody can read draft/unpublished content, admin-only tables, or other
  visitors' contact messages, no matter what they do in the browser's
  developer console.
- Nobody can create, edit, delete, or publish anything unless their signed-in
  Supabase Auth account has a row in the `admin_roles` table.

**Never put a Supabase *service-role* key anywhere in this project.** The
service-role key bypasses RLS entirely; it belongs only in a trusted
server-side context (which this static site doesn't have, and doesn't need).

### Setting up your Supabase project

1. Create a project at [supabase.com](https://supabase.com) if you don't have
   one.
2. Open the **SQL Editor** in your Supabase project dashboard.
3. Run the four files in `supabase/` **in this exact order**, pasting each
   one's contents and clicking "Run":
   1. `schema.sql` — creates every table, index and trigger.
   2. `policies.sql` — enables Row Level Security and creates every policy
      (this is what actually protects your data).
   3. `storage-policies.sql` — creates the three storage buckets
      (`profile-images`, `gallery-images`, `archive-media`) and their upload
      policies.
   4. `seed.sql` *(optional)* — inserts a handful of real, published
      Rothschild profiles, relationships, timeline events and media items, so
      the site has real content immediately instead of the JS fallback
      samples. Safe to skip if you'd rather start empty and use the admin
      dashboard to add everything yourself.
4. In your Supabase project, go to **Settings → API** and copy:
   - **Project URL**
   - **anon / public** key (NOT the `service_role` key)
5. Paste both into `js/config.js`:
   ```js
   window.ROTHSCHILD_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
   };
   ```
6. Reload the site — the console warning "Supabase is not configured yet"
   should disappear, and pages will start reading live data.

### If you have the Supabase CLI installed

You can apply the SQL files from a terminal instead of the dashboard:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push --file supabase/schema.sql
supabase db push --file supabase/policies.sql
supabase db push --file supabase/storage-policies.sql
supabase db push --file supabase/seed.sql   # optional
```

(`supabase login` opens a browser window to authenticate — this can't be done
non-interactively, you'll need to complete it yourself.)

## 3. How admin authentication works

Admin login uses **Supabase Auth** (email + password) — there are no
hard-coded credentials anywhere in this project. Being able to log in is not
enough to manage content, though: a second table, `admin_roles`, lists which
signed-in users are actually administrators. Every admin page
(`admin/dashboard.html`, `admin/profiles.html`, etc.) calls `requireAdmin()`
from [`js/admin/auth.js`](js/admin/auth.js) before showing anything — if the
visitor isn't signed in, or is signed in but has no `admin_roles` row, they're
redirected straight back to the login page.

This client-side check is only there for a clean user experience. The real
enforcement happens in Postgres: every write policy in
`supabase/policies.sql` calls an `is_admin()` SQL function that checks
`admin_roles` directly, so a regular visitor cannot create, edit, publish or
delete anything even if they bypass the JavaScript entirely.

### Creating the first admin user

`admin_roles` is intentionally **not writable from the browser at all** —
not even by another admin — specifically so a compromised or malicious
browser session can never grant itself admin access. You create the first
(and every subsequent) admin from the Supabase dashboard:

1. In Supabase, go to **Authentication → Users → Add user**, and create a
   user with the email/password you want to log in with. (Or have the person
   sign up some other way you've set up — any Supabase Auth user works.)
2. Copy that user's **User UID** from the users list.
3. Open the **SQL Editor** and run:
   ```sql
   insert into admin_roles (user_id, role)
   values ('paste-the-user-uid-here', 'admin');
   ```
4. That user can now sign in at `/admin/index.html` and will pass the admin
   check.

To remove admin access, delete their row from `admin_roles` the same way.

## 4. Running the site locally

This is a static site, so any static file server works. From the project
folder:

```bash
npx serve .
```

Then open the URL it prints (typically `http://localhost:3000` or similar).

A `serve.json` file is included with `{"cleanUrls": false}` — this matters
because pages like `profile.html?slug=...` rely on their query string, and
`serve`'s default "clean URL" redirect mode strips query strings when it
redirects `/profile.html` → `/profile`. Keep `serve.json` in place, or make
sure whatever static server you use doesn't rewrite `.html` URLs.

You can also just open `index.html` directly in a browser (`file://`), though
a local server is recommended so relative paths and any future fetch/module
behavior work exactly like production.

## 5. How GitHub is connected

This project is a local Git repository (`git init` has been run, and
`.gitignore` excludes `node_modules/`, `.env*`, and other local-only files).
To connect it to GitHub:

**Option A — using the GitHub CLI** (if you have `gh` installed and are
logged in with `gh auth login`):
```bash
gh repo create rothschild-website --private --source=. --remote=origin
git add .
git commit -m "Initial commit"
git push -u origin main
```

**Option B — manually:**
1. Create a new empty repository on [github.com](https://github.com/new)
   (don't initialize it with a README, .gitignore, or license — this project
   already has its own).
2. Run:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git push -u origin main
   ```

## 6. Deploying to Vercel

1. Push the repository to GitHub (see above).
2. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub
   repository.
3. Vercel will detect it as a static site — no framework preset, no build
   command, and no output directory override are needed. Just click Deploy.
4. Once deployed, your site is live at the URL Vercel gives you. The
   `js/config.js` file (with your real Supabase URL/anon key) ships as part
   of the deployed static files, exactly as it does locally — there's no
   separate environment-variable step required for the anon key, since it's
   meant to be public.
5. `vercel.json` in this project disables Vercel's default clean-URL
   rewriting for the same reason as the local dev server (`profile.html?slug=`
   needs its query string preserved) and tags `/admin/*` pages as
   `noindex, nofollow` for search engines.

## 7. Updating the site later

- **Content** (profiles, timeline events, archive media, homepage copy, site
  settings) — log in at `/admin/index.html` and use the dashboard. No code
  changes or redeploys needed; content lives in Supabase.
- **Code/design changes** — edit the HTML/CSS/JS files locally, then:
  ```bash
  git add .
  git commit -m "Describe your change"
  git push
  ```
  Vercel automatically redeploys on every push to the connected branch.
- **Database changes** — if you add/modify tables or policies, update the
  relevant file in `supabase/` and re-run it in the Supabase SQL editor (or
  via the CLI), so the SQL files stay the source of truth for your schema.

## Project structure reference

```
index.html, family.html, profile.html, history.html,
archive.html, about.html, contact.html      Public pages

admin/index.html                             Admin login
admin/dashboard.html                         Stats overview
admin/profiles.html                          Profile list + actions
admin/profile-editor.html                    Tabbed create/edit form
admin/media.html                             Upload + manage archive media
admin/timeline.html                          Timeline event CRUD
admin/homepage.html                          Homepage copy CMS
admin/settings.html                          Site settings + contact inbox

css/variables.css                            Design tokens (colors, type, spacing)
css/global.css                               Resets, shared components, footer, page banner
css/header.css                               Header + nav drawer
css/homepage.css, family.css, profile.css,
css/history.css, archive.css, about.css,
css/contact.css                              Per-page styles
css/admin.css                                Admin dashboard chrome
css/responsive.css                           All breakpoints (390/768/1024/1440)

js/config.js                                 Public Supabase URL + anon key (edit this)
js/supabase-client.js                        Shared Supabase client (ES module)
js/app.js                                    Nav drawer, footer year — loaded on every public page
js/homepage.js, family.js, profile.js,
js/history.js, archive.js, contact.js        Per-page data loading + behavior

js/admin/auth.js                             Login form + requireAdmin() guard used by every other admin page
js/admin/dashboard.js, profiles.js,
js/admin/profile-editor.js, media.js,
js/admin/timeline.js, homepage.js, settings.js

supabase/schema.sql                          Tables, indexes, triggers
supabase/policies.sql                        Row Level Security policies + is_admin() helper
supabase/storage-policies.sql                Storage buckets + upload policies
supabase/seed.sql                            Optional sample published content

assets/images/                               All provided visual assets
serve.json                                   Local dev server config (see section 4)
vercel.json                                  Deployment config (see section 6)
PROJECT_STATUS.md                            Build progress log
```
