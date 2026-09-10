-- ============================================================================
-- Rothschild Illuminati Organization — Storage Buckets & Policies
-- Run this AFTER policies.sql (it relies on the is_admin() helper function).
--
-- Creates three PUBLIC buckets (files are readable by anyone via their public
-- URL — appropriate for a public archive site) but restricts who can upload,
-- replace or delete files to admins only.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('profile-images', 'profile-images', true),
  ('gallery-images', 'gallery-images', true),
  ('archive-media', 'archive-media', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Public read access to all three buckets
-- ----------------------------------------------------------------------------
drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read"
  on storage.objects for select
  using (bucket_id in ('profile-images', 'gallery-images', 'archive-media'));

-- ----------------------------------------------------------------------------
-- Admin-only upload / replace / delete
-- ----------------------------------------------------------------------------
drop policy if exists "storage_admin_insert" on storage.objects;
create policy "storage_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id in ('profile-images', 'gallery-images', 'archive-media')
    and is_admin()
  );

drop policy if exists "storage_admin_update" on storage.objects;
create policy "storage_admin_update"
  on storage.objects for update
  using (
    bucket_id in ('profile-images', 'gallery-images', 'archive-media')
    and is_admin()
  )
  with check (
    bucket_id in ('profile-images', 'gallery-images', 'archive-media')
    and is_admin()
  );

drop policy if exists "storage_admin_delete" on storage.objects;
create policy "storage_admin_delete"
  on storage.objects for delete
  using (
    bucket_id in ('profile-images', 'gallery-images', 'archive-media')
    and is_admin()
  );
