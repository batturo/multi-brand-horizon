-- Starting categories. Kept in a migration (not seed.sql) so they are created
-- on the live project too. Intro text is left empty on purpose: write it in
-- the admin (80 to 120 words each) before launch.
--
-- Visible now: Apparel, Footwear, Accessories.
-- Created but hidden until stock arrives: Electronics, Home Decor, Gifts,
-- Sports and Fitness. Hidden categories, and products in them, are not
-- readable by the public at all (see RLS in the init migration).

insert into public.categories (name, slug, is_visible, sort_order) values
  ('Apparel', 'apparel', true, 10),
  ('Footwear', 'footwear', true, 20),
  ('Accessories', 'accessories', true, 30),
  ('Electronics', 'electronics', false, 40),
  ('Home Decor', 'home-decor', false, 50),
  ('Gifts', 'gifts', false, 60),
  ('Sports and Fitness', 'sports-and-fitness', false, 70)
on conflict (slug) do nothing;
