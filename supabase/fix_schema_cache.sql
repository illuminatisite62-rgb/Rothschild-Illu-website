-- ============================================================================
-- ROTHSCHILD SITE — SCHEMA CACHE & COLUMN FIX
-- Run this script in your Supabase SQL Editor to fix the schema cache error.
-- ============================================================================

-- 1. Ensure ALL required columns exist in the homepage_content table
ALTER TABLE homepage_content
ADD COLUMN IF NOT EXISTS hero_established_text text,
ADD COLUMN IF NOT EXISTS hero_heading_line1 text,
ADD COLUMN IF NOT EXISTS hero_heading_line2 text,
ADD COLUMN IF NOT EXISTS hero_subtitle text,
ADD COLUMN IF NOT EXISTS hero_description text,
ADD COLUMN IF NOT EXISTS hero_button_primary_text text,
ADD COLUMN IF NOT EXISTS hero_button_primary_url text,
ADD COLUMN IF NOT EXISTS hero_button_secondary_text text,
ADD COLUMN IF NOT EXISTS hero_button_secondary_url text,
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS archival_caption_top text,
ADD COLUMN IF NOT EXISTS archival_caption_bottom text,
ADD COLUMN IF NOT EXISTS tagline_text text,
ADD COLUMN IF NOT EXISTS footer_about_text text;

-- 2. Force Supabase (PostgREST) to reload its schema cache
NOTIFY pgrst, 'reload schema';
