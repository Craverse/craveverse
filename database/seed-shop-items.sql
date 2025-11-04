-- Seed data for shop items
-- Note: This seed file can be safely executed multiple times due to ON CONFLICT clause
INSERT INTO shop_items (name, type, price_coins, description, icon, effects, tier_required)
VALUES
  ('Pause Token (1 day)', 'consumable', 50, 'Pause your streak without penalty for 1 day', '⏸️', '{"pause_days":1}', 'free'),
  ('Pause Token (3 days)', 'consumable', 120, 'Pause your streak without penalty for 3 days', '⏸️', '{"pause_days":3}', 'free'),
  ('Level Skip', 'utility', 100, 'Skip a particularly tough level once', '⏭️', '{"level_skip":1}', 'plus'),
  ('Cosmetic Theme', 'cosmetic', 75, 'Unlock a premium dashboard theme', '🎨', '{"theme":"premium"}', 'free')
ON CONFLICT (name, type) DO NOTHING;



