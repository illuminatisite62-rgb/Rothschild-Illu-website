-- ============================================================================
-- Rothschild Illuminati Organization — Database Schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) BEFORE
-- policies.sql and storage-policies.sql. seed.sql is optional sample data.
-- ============================================================================

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ----------------------------------------------------------------------------
-- profiles
-- Biography sections are stored as plain columns (rather than a separate
-- key/value "sections" table) because the set of sections is fixed and known
-- up front, and the site's JS (js/profile.js) reads them directly by name.
-- Any field left NULL/empty is simply not rendered on the public profile page.
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),

  -- Basic information
  full_name text not null,
  slug text not null unique,
  alternative_names text,
  birth_date date,
  death_date date,
  birth_place text,
  death_place text,
  nationality text,
  family_branch text,
  occupation text,
  titles text,

  -- Media
  portrait_url text,
  cover_image_url text,

  -- Biography sections
  short_bio text,
  full_bio text,
  early_life text,
  family_background text,
  education text,
  career text,
  business_activities text,
  historical_context text,
  personal_life text,
  achievements text,
  philanthropy text,
  legacy text,
  interesting_facts text,
  quotes text,

  -- SEO
  seo_title text,
  seo_description text,

  -- Publishing
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_profiles_status on profiles (status);
create index if not exists idx_profiles_featured on profiles (featured);
create index if not exists idx_profiles_family_branch on profiles (family_branch);
create index if not exists idx_profiles_slug on profiles (slug);

-- ----------------------------------------------------------------------------
-- family_relationships
-- Directed edges between profiles. A "father" edge from A to B means B is A's
-- father. The public profile page renders these as clickable related people.
-- ----------------------------------------------------------------------------
create table if not exists family_relationships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  related_profile_id uuid not null references profiles (id) on delete cascade,
  relationship_type text not null check (
    relationship_type in ('father', 'mother', 'spouse', 'son', 'daughter', 'sibling', 'relative', 'other')
  ),
  description text,
  created_at timestamptz not null default now(),

  constraint no_self_relation check (profile_id <> related_profile_id),
  constraint unique_relationship unique (profile_id, related_profile_id, relationship_type)
);

create index if not exists idx_family_relationships_profile on family_relationships (profile_id);
create index if not exists idx_family_relationships_related on family_relationships (related_profile_id);

-- ----------------------------------------------------------------------------
-- profile_images (per-profile photo gallery)
-- ----------------------------------------------------------------------------
create table if not exists profile_images (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  image_url text not null,
  caption text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_images_profile on profile_images (profile_id);

-- ----------------------------------------------------------------------------
-- sources (per-profile citations)
-- ----------------------------------------------------------------------------
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  label text not null,
  url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_profile on sources (profile_id);

-- ----------------------------------------------------------------------------
-- media (Media Library / public Archive)
-- Files themselves live in Supabase Storage; this row is the metadata.
-- ----------------------------------------------------------------------------
create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  media_type text not null check (
    media_type in ('Photographs', 'Documents', 'Letters', 'Historical Records', 'Videos', 'Collections')
  ),
  file_url text not null,
  thumbnail_url text,
  caption text,
  alt_text text,
  credit text,
  source text,
  description text,
  date_label text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_media_status on media (status);
create index if not exists idx_media_type on media (media_type);

-- ----------------------------------------------------------------------------
-- timeline_events
-- ----------------------------------------------------------------------------
create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  year text not null,
  event_date date,
  title text not null,
  description text,
  image_url text,
  category text,
  display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_timeline_events_status on timeline_events (status);
create index if not exists idx_timeline_events_order on timeline_events (display_order);

-- ----------------------------------------------------------------------------
-- homepage_content
-- Singleton row (id is always 1) edited from admin/homepage.html.
-- ----------------------------------------------------------------------------
create table if not exists homepage_content (
  id smallint primary key default 1 check (id = 1),
  hero_established_text text not null default 'Established 1760',
  hero_heading_line1 text not null default 'The Rothschild',
  hero_heading_line2 text not null default 'Family',
  hero_subtitle text not null default 'A Legacy of Vision, Wealth & Influence',
  hero_description text not null default 'From humble beginnings in 18th-century Frankfurt to becoming one of the most influential families in banking, finance and philanthropy, the Rothschilds built a legacy that shaped the modern world.',
  hero_button_primary_text text not null default 'Join Us Today',
  hero_button_primary_url text not null default 'contact.html',
  hero_button_secondary_text text not null default 'The Illuminati',
  hero_button_secondary_url text not null default 'about.html#illuminati',
  video_url text,
  archival_caption_top text not null default 'A Family That Shaped History',
  archival_caption_bottom text not null default 'The Rothschild Family Archival Collection',
  tagline_text text not null default 'People — Ideas — Opportunities — A Stronger Tomorrow',
  footer_about_text text not null default 'An archival record of the Rothschild family — biographies, timelines and primary-source material. Historical claims are administrator-curated and referenced to sources.',
  updated_at timestamptz not null default now()
);

insert into homepage_content (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- site_settings (flexible key/value store)
-- ----------------------------------------------------------------------------
create table if not exists site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

insert into site_settings (key, value) values
  ('site_title', 'Rothschild Illuminati Organization'),
  ('site_description', 'An archival record of the Rothschild family — biographies, historical timelines and archive material.'),
  ('contact_email', '')
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- contact_messages
-- ----------------------------------------------------------------------------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_created on contact_messages (created_at desc);

-- ----------------------------------------------------------------------------
-- admin_roles
-- Marks which Supabase Auth users are administrators. Rows here are never
-- writable from client-side code (see policies.sql) — create the first admin
-- by inserting a row manually from the Supabase SQL editor after the user has
-- signed up (see README.md for the exact command).
-- ----------------------------------------------------------------------------
create table if not exists admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists trg_media_updated_at on media;
create trigger trg_media_updated_at
  before update on media
  for each row execute function set_updated_at();

drop trigger if exists trg_timeline_events_updated_at on timeline_events;
create trigger trg_timeline_events_updated_at
  before update on timeline_events
  for each row execute function set_updated_at();

drop trigger if exists trg_homepage_content_updated_at on homepage_content;
create trigger trg_homepage_content_updated_at
  before update on homepage_content
  for each row execute function set_updated_at();

drop trigger if exists trg_site_settings_updated_at on site_settings;
create trigger trg_site_settings_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- Auto-set published_at the first time a profile goes live. TG_OP is checked
-- explicitly because referencing OLD in a BEFORE INSERT trigger is an error
-- (there is no old row yet).
create or replace function set_published_at()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if new.status = 'published' then
      new.published_at = now();
    end if;
  elsif TG_OP = 'UPDATE' then
    if new.status = 'published' and (old.status is distinct from 'published') then
      new.published_at = now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_published_at on profiles;
create trigger trg_profiles_published_at
  before update on profiles
  for each row execute function set_published_at();

drop trigger if exists trg_profiles_published_at_insert on profiles;
create trigger trg_profiles_published_at_insert
  before insert on profiles
  for each row execute function set_published_at();
