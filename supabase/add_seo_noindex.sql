-- ============================================================================
-- SEO fields migration — add seo_noindex to profiles table
-- Safe to run multiple times (uses IF NOT EXISTS pattern via DO block)
-- Run in Supabase SQL Editor
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'seo_noindex'
  ) THEN
    ALTER TABLE profiles ADD COLUMN seo_noindex boolean NOT NULL DEFAULT false;
    RAISE NOTICE 'Column seo_noindex added to profiles table.';
  ELSE
    RAISE NOTICE 'Column seo_noindex already exists — skipping.';
  END IF;
END $$;
