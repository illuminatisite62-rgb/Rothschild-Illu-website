-- ============================================================================
-- ROTHSCHILD SITE — ADD DYNAMIC FAMILY TREE
-- Run this script in your Supabase SQL Editor to add the tree configuration
-- column to the homepage_content table.
-- ============================================================================

ALTER TABLE homepage_content
ADD COLUMN IF NOT EXISTS tree_json jsonb DEFAULT '{"founder": null, "children": []}'::jsonb;
