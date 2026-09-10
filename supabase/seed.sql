-- ============================================================================
-- Rothschild Illuminati Organization — Optional Sample Seed Data
-- Run this AFTER schema.sql + policies.sql if you want to see real published
-- content immediately instead of the client-side fallback sample data.
-- The `profiles` and `family_relationships` inserts are safe to re-run (fixed
-- UUIDs / a unique constraint back them). `sources`, `timeline_events` and
-- `media` have no natural unique key, so ON CONFLICT DO NOTHING there is a
-- no-op guard, not a real dedupe — re-running this file will duplicate those
-- three tables' rows. Run it once, or truncate those tables first if re-seeding.
-- ============================================================================

insert into profiles (
  id, full_name, slug, birth_date, death_date, birth_place, death_place,
  nationality, family_branch, occupation, titles, portrait_url,
  short_bio, full_bio, early_life, family_background, career, achievements,
  legacy, featured, status
) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Mayer Amschel Rothschild', 'mayer-amschel-rothschild',
    '1744-02-23', '1812-09-19', 'Frankfurt am Main, Holy Roman Empire', 'Frankfurt am Main',
    'German', 'Frankfurt', 'Banker, Coin Dealer', 'Founder of the House of Rothschild',
    'assets/images/05_archival_family_photo.jpg',
    'Mayer Amschel Rothschild was the founder of the Rothschild banking dynasty, building a coin-trading and banking business in Frankfurt that his five sons expanded across Europe.',
    'Born in the Judengasse of Frankfurt, Mayer Amschel Rothschild began his working life as an apprentice at a bank in Hanover before returning to Frankfurt to establish his own trading house. Over several decades he built a reputation as a dealer in rare coins and, later, as a financial agent to the Landgrave of Hesse-Kassel.',
    'Mayer Amschel was born to a family of moneylenders and merchants in the Frankfurt ghetto. He was educated for the rabbinate before turning to commerce after his parents'' early deaths.',
    'The Rothschild (originally Bauer) family had lived in the Frankfurt Judengasse for generations, taking the name ''Rothschild'' from the red shield (Roth Schild) that marked their ancestral house.',
    'Mayer Amschel built his fortune as a coin dealer before becoming a court factor and financial agent, laying the groundwork for a banking network his sons would extend to London, Paris, Vienna and Naples.',
    'Established what would become one of the most influential banking houses in European history, and pioneered an early cross-border financial network operated by his five sons.',
    'His five sons, sent to the great financial centers of Europe, expanded the family enterprise into an international banking network that played a major role in 19th-century European finance.',
    true, 'published'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Nathan Mayer Rothschild', 'nathan-mayer-rothschild',
    '1777-09-16', '1836-07-28', 'Frankfurt am Main', 'Frankfurt am Main',
    'British (naturalized)', 'London', 'Banker', 'Founder, N M Rothschild & Sons',
    'assets/images/05_archival_family_photo.jpg',
    'Nathan Mayer Rothschild established the London branch of the family bank, N M Rothschild & Sons, and became one of the most prominent financiers of his era.',
    'Nathan relocated first to Manchester to trade textiles before settling in London, where he founded N M Rothschild & Sons. His firm played a documented role in financing the British government during the Napoleonic Wars and in subsequent government bond issues.',
    null, null,
    'Built the London merchant bank into a central pillar of British and European finance during the early 19th century.',
    null, null,
    true, 'published'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'James Mayer de Rothschild', 'james-mayer-de-rothschild',
    '1792-05-15', '1868-11-15', 'Frankfurt am Main', 'Paris, France',
    'French', 'Paris', 'Banker', 'Founder, de Rothschild Frères',
    'assets/images/05_archival_family_photo.jpg',
    'James Mayer de Rothschild founded the French branch of the family and built de Rothschild Frères into a leading Parisian bank.',
    null, null, null,
    'Financed French railways and government bonds, establishing the Paris house as a major force in 19th-century French finance.',
    null, null,
    true, 'published'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Salomon Mayer von Rothschild', 'salomon-mayer-von-rothschild',
    '1774-09-09', '1855-07-27', 'Frankfurt am Main', 'Vienna, Austria',
    'Austrian', 'Vienna', 'Banker', 'Founder, S M von Rothschild',
    'assets/images/05_archival_family_photo.jpg',
    'Founder of the Vienna branch, S M von Rothschild, and financier of Austrian railways.',
    null, null, null, null, null, null,
    false, 'published'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Carl Mayer von Rothschild', 'carl-mayer-von-rothschild',
    '1788-04-24', '1855-03-10', 'Frankfurt am Main', 'Naples, Italy',
    'Italian', 'Naples', 'Banker', 'Founder, C. M. de Rothschild e Figli',
    'assets/images/05_archival_family_photo.jpg',
    'Founder of the Naples branch of the family bank, C. M. de Rothschild e Figli.',
    null, null, null, null, null, null,
    false, 'published'
  )
on conflict (slug) do nothing;

insert into family_relationships (profile_id, related_profile_id, relationship_type) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'father'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'father'),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'father'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'father'),
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'son'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'son'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'sibling'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'sibling')
on conflict do nothing;

insert into sources (profile_id, label, url) values
  ('11111111-1111-1111-1111-111111111111', 'Ferguson, Niall — The House of Rothschild: Money''s Prophets, 1798–1848', null),
  ('11111111-1111-1111-1111-111111111111', 'Encyclopaedia Britannica — Mayer Amschel Rothschild', null),
  ('22222222-2222-2222-2222-222222222222', 'Ferguson, Niall — The House of Rothschild: Money''s Prophets, 1798–1848', null)
on conflict do nothing;

insert into timeline_events (year, event_date, title, description, category, display_order, status) values
  ('1760', '1760-01-01', 'A Trading House Founded', 'Mayer Amschel Rothschild begins a coin and antiquities trading business in Frankfurt''s Judengasse.', 'Founding', 1, 'published'),
  ('1798', '1798-01-01', 'Expansion to London', 'Nathan Mayer Rothschild relocates to Manchester to trade textiles, later founding the London banking house.', 'Expansion', 2, 'published'),
  ('1811', '1811-01-01', 'N M Rothschild & Sons Founded', 'Nathan Mayer Rothschild formally establishes his London merchant bank.', 'Banking', 3, 'published'),
  ('1815', '1815-06-18', 'The Napoleonic Wars', 'The family''s financial network plays a documented role in financing coalition forces during the Napoleonic Wars.', 'Finance', 4, 'published'),
  ('1817', '1817-01-01', 'Vienna and Naples Branches', 'Salomon and Carl Rothschild establish banking houses in Vienna and Naples, completing the family''s five-branch network.', 'Expansion', 5, 'published'),
  ('1836', '1836-01-01', 'de Rothschild Frères Grows', 'James Mayer de Rothschild builds the Paris house into a leading financier of French infrastructure.', 'Banking', 6, 'published'),
  ('1875', '1875-11-25', 'The Suez Canal Loan', 'The London house finances the British government''s acquisition of Suez Canal Company shares.', 'Finance', 7, 'published'),
  ('1917', '1917-11-02', 'The Balfour Declaration', 'The Balfour Declaration is addressed to Walter Rothschild, 2nd Baron Rothschild, a documented historical event.', 'History', 8, 'published')
on conflict do nothing;

insert into media (title, media_type, file_url, description, date_label, status) values
  ('Frankfurt Banking Ledger, 1804', 'Documents', 'assets/images/11_old_script_texture.jpg', 'A ledger page from the early Frankfurt trading house.', '1804', 'published'),
  ('Family Portrait, Late 19th Century', 'Photographs', 'assets/images/05_archival_family_photo.jpg', 'A formal family portrait from the archival collection.', 'c. 1890', 'published'),
  ('European Trade Map', 'Historical Records', 'assets/images/13_old_map_texture.jpg', 'A period map illustrating European trade routes.', 'c. 1820', 'published')
on conflict do nothing;
