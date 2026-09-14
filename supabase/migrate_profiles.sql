-- ============================================================================
-- ROTHSCHILD SITE — PROFILE DATA MIGRATION
-- Run this script in your Supabase SQL Editor to insert the 4 founding 
-- members so they can be managed via the Admin Dashboard.
-- ============================================================================

INSERT INTO profiles (
  slug, 
  full_name, 
  birth_date, 
  death_date, 
  occupation, 
  family_branch, 
  short_bio, 
  portrait_url, 
  featured, 
  status,
  published_at
) VALUES 
(
  'mayer-amschel-rothschild',
  'Mayer Amschel Rothschild',
  '1744-02-23',
  '1812-09-19',
  'Founder',
  'Frankfurt',
  'Our founding patriarch — the man who established our banking dynasty in Frankfurt in the 18th century.',
  'assets/images/05_archival_family_photo.jpg',
  true,
  'published',
  now()
),
(
  'nathan-mayer-rothschild',
  'Nathan Mayer Rothschild',
  '1777-09-16',
  '1836-07-28',
  'Banker',
  'London',
  'Our London founder — Nathan established N M Rothschild & Sons, at the centre of 19th-century European finance.',
  'assets/images/05_archival_family_photo.jpg',
  true,
  'published',
  now()
),
(
  'james-mayer-de-rothschild',
  'James Mayer de Rothschild',
  '1792-05-15',
  '1868-11-15',
  'Banker',
  'Paris',
  'Our founder of the French branch — James established de Rothschild Frères in Paris.',
  'assets/images/05_archival_family_photo.jpg',
  true,
  'published',
  now()
),
(
  'salomon-mayer-rothschild',
  'Salomon Mayer Rothschild',
  '1774-09-09',
  '1855-07-27',
  'Banker',
  'Vienna',
  'Our Vienna patriarch — Salomon was central to the financing of the Austrian Empire.',
  'assets/images/05_archival_family_photo.jpg',
  true,
  'published',
  now()
)
ON CONFLICT (slug) DO UPDATE 
SET 
  full_name = EXCLUDED.full_name,
  featured = EXCLUDED.featured,
  status = EXCLUDED.status;
