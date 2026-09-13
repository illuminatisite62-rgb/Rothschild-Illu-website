-- ============================================================================
-- Rothschild Illuminati Organization — Full Database Schema
-- Safe to re-run: uses IF NOT EXISTS throughout.
-- Run this BEFORE policies.sql.
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================================
-- admin_roles
-- Maps Supabase Auth user_id to a named role.
-- Inserted manually via SQL editor only (no client INSERT policy).
-- ============================================================================
create table if not exists admin_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role    text not null default 'admin',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- profiles — family member biographies
-- ============================================================================
create table if not exists profiles (
  id                 uuid primary key default gen_random_uuid(),
  full_name          text not null,
  slug               text not null unique,
  alternative_names  text,
  birth_date         date,
  death_date         date,
  birth_place        text,
  death_place        text,
  nationality        text,
  family_branch      text,
  occupation         text,
  titles             text,
  portrait_url       text,
  cover_image_url    text,
  short_bio          text,
  full_bio           text,
  early_life         text,
  family_background  text,
  education          text,
  career             text,
  business_activities text,
  historical_context text,
  personal_life      text,
  achievements       text,
  philanthropy       text,
  legacy             text,
  interesting_facts  text,
  quotes             text,
  seo_title          text,
  seo_description    text,
  facebook_url       text,
  featured           boolean not null default false,
  status             text not null default 'draft' check (status in ('draft','published')),
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists profiles_slug_idx    on profiles (slug);
create index if not exists profiles_status_idx  on profiles (status);
create index if not exists profiles_branch_idx  on profiles (family_branch);
create index if not exists profiles_featured_idx on profiles (featured);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- ============================================================================
-- family_relationships
-- ============================================================================
create table if not exists family_relationships (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null references profiles (id) on delete cascade,
  related_profile_id uuid not null references profiles (id) on delete cascade,
  relationship_type  text not null check (relationship_type in ('father','mother','spouse','son','daughter','sibling','relative','other')),
  notes              text,
  created_at         timestamptz not null default now(),
  unique (profile_id, related_profile_id, relationship_type)
);

create index if not exists frel_profile_idx  on family_relationships (profile_id);
create index if not exists frel_related_idx  on family_relationships (related_profile_id);

-- ============================================================================
-- profile_images — gallery images per profile
-- ============================================================================
create table if not exists profile_images (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles (id) on delete cascade,
  image_url     text not null,
  caption       text,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists pimages_profile_idx on profile_images (profile_id, display_order);

-- ============================================================================
-- sources — citations per profile
-- ============================================================================
create table if not exists sources (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  label      text not null,
  url        text,
  created_at timestamptz not null default now()
);

create index if not exists sources_profile_idx on sources (profile_id);

-- ============================================================================
-- media — archive items (documents, photos, estates)
-- ============================================================================
create table if not exists media (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  category    text not null default 'document' check (category in ('document','photo','estate','other')),
  year        int,
  image_url   text,
  file_url    text,
  location    text,
  tags        text[],
  status      text not null default 'draft' check (status in ('draft','published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists media_status_idx   on media (status);
create index if not exists media_category_idx on media (category);

drop trigger if exists media_updated_at on media;
create trigger media_updated_at
  before update on media
  for each row execute procedure set_updated_at();

-- ============================================================================
-- timeline_events
-- ============================================================================
create table if not exists timeline_events (
  id          uuid primary key default gen_random_uuid(),
  year        int not null,
  title       text not null,
  description text,
  category    text,
  image_url   text,
  profile_id  uuid references profiles (id) on delete set null,
  status      text not null default 'draft' check (status in ('draft','published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists timeline_year_idx   on timeline_events (year);
create index if not exists timeline_status_idx on timeline_events (status);

drop trigger if exists timeline_updated_at on timeline_events;
create trigger timeline_updated_at
  before update on timeline_events
  for each row execute procedure set_updated_at();

-- ============================================================================
-- homepage_content — single-row CMS for homepage copy
-- ============================================================================
create table if not exists homepage_content (
  id                    int primary key default 1 check (id = 1),
  established_text      text,
  hero_line1            text,
  hero_line2            text,
  hero_subtitle         text,
  hero_description      text,
  archival_caption_top  text,
  archival_caption_bottom text,
  tagline_text          text,
  updated_at            timestamptz not null default now()
);

insert into homepage_content (id) values (1) on conflict do nothing;

-- ============================================================================
-- site_settings — key/value store
-- ============================================================================
create table if not exists site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- contact_messages — contact form submissions
-- ============================================================================
create table if not exists contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  subject    text,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contact_read_idx on contact_messages (read, created_at desc);

-- ============================================================================
-- membership_applications — Join the Illuminati form submissions
-- ============================================================================
create table if not exists membership_applications (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  phone        text not null,
  email        text not null,
  photo_url    text,
  occupation   text,
  country      text,
  reason       text,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_notes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists membership_status_idx on membership_applications (status, created_at desc);

drop trigger if exists membership_updated_at on membership_applications;
create trigger membership_updated_at
  before update on membership_applications
  for each row execute procedure set_updated_at();

-- ============================================================================
-- site_visitors — optional visitor account registrations
-- ============================================================================
create table if not exists site_visitors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  phone      text,
  birthday   text,
  country    text,
  created_at timestamptz not null default now()
);

create index if not exists visitors_email_idx on site_visitors (email);
