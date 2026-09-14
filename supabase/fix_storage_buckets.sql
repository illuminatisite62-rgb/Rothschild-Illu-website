-- ============================================================================
-- ROTHSCHILD SITE — SUPABASE FIX SCRIPT
-- Run this ENTIRE script in your Supabase SQL Editor to fix:
--   1. "Failed to upload image" in admin profile editor
--   2. Join form not submitting (membership-photos bucket missing)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: Create the required storage buckets (safe to re-run)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('admin-uploads',    'admin-uploads',    true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
  ('membership-photos','membership-photos',true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('archive-files',    'archive-files',    true, 52428800, null),
  ('profile-images',   'profile-images',   true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('gallery-images',   'gallery-images',   true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('archive-media',    'archive-media',    true, 52428800, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- ----------------------------------------------------------------------------
-- STEP 2: Drop ALL existing storage policies (clean slate)
-- ----------------------------------------------------------------------------
drop policy if exists "storage_public_read"                 on storage.objects;
drop policy if exists "storage_admin_insert"                on storage.objects;
drop policy if exists "storage_admin_update"                on storage.objects;
drop policy if exists "storage_admin_delete"                on storage.objects;
drop policy if exists "storage_public_insert_membership"    on storage.objects;
drop policy if exists "Allow public read all buckets"       on storage.objects;
drop policy if exists "Allow admin upload"                  on storage.objects;

-- ----------------------------------------------------------------------------
-- STEP 3: Public READ — anyone can view files in public buckets
-- ----------------------------------------------------------------------------
create policy "storage_public_read"
  on storage.objects for select
  using (bucket_id in (
    'admin-uploads','membership-photos','archive-files',
    'profile-images','gallery-images','archive-media'
  ));

-- ----------------------------------------------------------------------------
-- STEP 4: Admin UPLOAD — logged-in admins can upload to admin buckets
-- Uses auth.uid() directly (more reliable than is_admin() for storage)
-- ----------------------------------------------------------------------------
create policy "storage_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id in ('admin-uploads','archive-files','profile-images','gallery-images','archive-media')
    and auth.uid() in (select user_id from public.admin_roles)
  );

create policy "storage_admin_update"
  on storage.objects for update
  using (
    bucket_id in ('admin-uploads','archive-files','profile-images','gallery-images','archive-media')
    and auth.uid() in (select user_id from public.admin_roles)
  )
  with check (
    bucket_id in ('admin-uploads','archive-files','profile-images','gallery-images','archive-media')
    and auth.uid() in (select user_id from public.admin_roles)
  );

create policy "storage_admin_delete"
  on storage.objects for delete
  using (
    bucket_id in ('admin-uploads','archive-files','profile-images','gallery-images','archive-media')
    and auth.uid() in (select user_id from public.admin_roles)
  );

-- ----------------------------------------------------------------------------
-- STEP 5: PUBLIC UPLOAD for membership photos (anyone can upload their photo)
-- ----------------------------------------------------------------------------
create policy "storage_public_insert_membership"
  on storage.objects for insert
  with check (bucket_id = 'membership-photos');

-- ----------------------------------------------------------------------------
-- STEP 6: Verify — check all buckets are created
-- ----------------------------------------------------------------------------
select id, name, public, file_size_limit
from storage.buckets
order by name;
