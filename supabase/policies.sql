-- ============================================================================
-- Rothschild Illuminati Organization — Row Level Security Policies
-- Run this AFTER schema.sql. Re-runnable: policies are dropped before create.
--
-- Model: anyone (including logged-out visitors) may READ published content.
-- Only an authenticated user whose id appears in admin_roles may write
-- anything. Nothing here trusts the browser — every check re-queries
-- admin_roles on the database side via is_admin().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the current request from a logged-in admin?
-- SECURITY DEFINER so it can read admin_roles even though admin_roles itself
-- has no public SELECT policy (see below).
-- ----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from admin_roles where user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- ============================================================================
-- profiles
-- ============================================================================
alter table profiles enable row level security;

drop policy if exists "profiles_public_read_published" on profiles;
create policy "profiles_public_read_published"
  on profiles for select
  using (status = 'published');

drop policy if exists "profiles_admin_read_all" on profiles;
create policy "profiles_admin_read_all"
  on profiles for select
  using (is_admin());

drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write"
  on profiles for insert
  with check (is_admin());

drop policy if exists "profiles_admin_update" on profiles;
create policy "profiles_admin_update"
  on profiles for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "profiles_admin_delete" on profiles;
create policy "profiles_admin_delete"
  on profiles for delete
  using (is_admin());

-- ============================================================================
-- family_relationships — readable if the *source* profile is published
-- ============================================================================
alter table family_relationships enable row level security;

drop policy if exists "relationships_public_read" on family_relationships;
create policy "relationships_public_read"
  on family_relationships for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = family_relationships.profile_id
        and profiles.status = 'published'
    )
    or is_admin()
  );

drop policy if exists "relationships_admin_write" on family_relationships;
create policy "relationships_admin_write"
  on family_relationships for insert
  with check (is_admin());

drop policy if exists "relationships_admin_update" on family_relationships;
create policy "relationships_admin_update"
  on family_relationships for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "relationships_admin_delete" on family_relationships;
create policy "relationships_admin_delete"
  on family_relationships for delete
  using (is_admin());

-- ============================================================================
-- profile_images
-- ============================================================================
alter table profile_images enable row level security;

drop policy if exists "profile_images_public_read" on profile_images;
create policy "profile_images_public_read"
  on profile_images for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = profile_images.profile_id
        and profiles.status = 'published'
    )
    or is_admin()
  );

drop policy if exists "profile_images_admin_write" on profile_images;
create policy "profile_images_admin_write"
  on profile_images for insert
  with check (is_admin());

drop policy if exists "profile_images_admin_update" on profile_images;
create policy "profile_images_admin_update"
  on profile_images for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "profile_images_admin_delete" on profile_images;
create policy "profile_images_admin_delete"
  on profile_images for delete
  using (is_admin());

-- ============================================================================
-- sources
-- ============================================================================
alter table sources enable row level security;

drop policy if exists "sources_public_read" on sources;
create policy "sources_public_read"
  on sources for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = sources.profile_id
        and profiles.status = 'published'
    )
    or is_admin()
  );

drop policy if exists "sources_admin_write" on sources;
create policy "sources_admin_write"
  on sources for insert
  with check (is_admin());

drop policy if exists "sources_admin_update" on sources;
create policy "sources_admin_update"
  on sources for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "sources_admin_delete" on sources;
create policy "sources_admin_delete"
  on sources for delete
  using (is_admin());

-- ============================================================================
-- media
-- ============================================================================
alter table media enable row level security;

drop policy if exists "media_public_read_published" on media;
create policy "media_public_read_published"
  on media for select
  using (status = 'published');

drop policy if exists "media_admin_read_all" on media;
create policy "media_admin_read_all"
  on media for select
  using (is_admin());

drop policy if exists "media_admin_write" on media;
create policy "media_admin_write"
  on media for insert
  with check (is_admin());

drop policy if exists "media_admin_update" on media;
create policy "media_admin_update"
  on media for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "media_admin_delete" on media;
create policy "media_admin_delete"
  on media for delete
  using (is_admin());

-- ============================================================================
-- timeline_events
-- ============================================================================
alter table timeline_events enable row level security;

drop policy if exists "timeline_public_read_published" on timeline_events;
create policy "timeline_public_read_published"
  on timeline_events for select
  using (status = 'published');

drop policy if exists "timeline_admin_read_all" on timeline_events;
create policy "timeline_admin_read_all"
  on timeline_events for select
  using (is_admin());

drop policy if exists "timeline_admin_write" on timeline_events;
create policy "timeline_admin_write"
  on timeline_events for insert
  with check (is_admin());

drop policy if exists "timeline_admin_update" on timeline_events;
create policy "timeline_admin_update"
  on timeline_events for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "timeline_admin_delete" on timeline_events;
create policy "timeline_admin_delete"
  on timeline_events for delete
  using (is_admin());

-- ============================================================================
-- homepage_content — public read (it's just page copy), admin-only update.
-- No insert/delete policy is defined: the single row is created by schema.sql
-- and should never be removed.
-- ============================================================================
alter table homepage_content enable row level security;

drop policy if exists "homepage_content_public_read" on homepage_content;
create policy "homepage_content_public_read"
  on homepage_content for select
  using (true);

drop policy if exists "homepage_content_admin_update" on homepage_content;
create policy "homepage_content_admin_update"
  on homepage_content for update
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- site_settings — public read, admin-only write.
-- ============================================================================
alter table site_settings enable row level security;

drop policy if exists "site_settings_public_read" on site_settings;
create policy "site_settings_public_read"
  on site_settings for select
  using (true);

drop policy if exists "site_settings_admin_write" on site_settings;
create policy "site_settings_admin_write"
  on site_settings for insert
  with check (is_admin());

drop policy if exists "site_settings_admin_update" on site_settings;
create policy "site_settings_admin_update"
  on site_settings for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "site_settings_admin_delete" on site_settings;
create policy "site_settings_admin_delete"
  on site_settings for delete
  using (is_admin());

-- ============================================================================
-- contact_messages — anyone may INSERT (submit the form). Nobody but an
-- admin may read, update or delete — a visitor cannot read other people's
-- messages back, and no read/update/delete policy exists for anon at all.
-- ============================================================================
alter table contact_messages enable row level security;

drop policy if exists "contact_messages_public_insert" on contact_messages;
create policy "contact_messages_public_insert"
  on contact_messages for insert
  with check (true);

drop policy if exists "contact_messages_admin_read" on contact_messages;
create policy "contact_messages_admin_read"
  on contact_messages for select
  using (is_admin());

drop policy if exists "contact_messages_admin_update" on contact_messages;
create policy "contact_messages_admin_update"
  on contact_messages for update
  using (is_admin())
  with check (is_admin());

drop policy if exists "contact_messages_admin_delete" on contact_messages;
create policy "contact_messages_admin_delete"
  on contact_messages for delete
  using (is_admin());

-- ============================================================================
-- admin_roles — locked down completely from the client. No insert/update/
-- delete policy exists for anon or authenticated at all, so the ONLY way to
-- grant/revoke admin access is via the Supabase SQL editor (or another
-- server-side context using the service-role key, which never runs in the
-- browser). Each admin may read their own row, which the admin dashboard
-- uses to confirm role client-side (the real enforcement is server-side,
-- via is_admin() in every policy above).
-- ============================================================================
alter table admin_roles enable row level security;

drop policy if exists "admin_roles_self_read" on admin_roles;
create policy "admin_roles_self_read"
  on admin_roles for select
  using (user_id = auth.uid());
