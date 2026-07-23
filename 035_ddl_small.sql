-- 035: Ingest Kanini Haraka real-world data, replacing fictional seed
-- Generated from data/ folder xlsx files. NICE SUPERMARKET LTD linked as demo client.

BEGIN;

-- Step 1: Purge old fictional seed (migration 025)
TRUNCATE analytics_supplier_products CASCADE;
TRUNCATE analytics_fact_sales CASCADE;
TRUNCATE analytics_fact_inventory CASCADE;
TRUNCATE analytics_fact_pricing CASCADE;
TRUNCATE analytics_fact_stock_movements CASCADE;
TRUNCATE analytics_fact_branch_summary CASCADE;
TRUNCATE analytics_staging_rows CASCADE;
TRUNCATE analytics_staging_uploads CASCADE;
TRUNCATE analytics_products CASCADE;
TRUNCATE analytics_subcategories CASCADE;
TRUNCATE analytics_suppliers CASCADE;

-- Step 2: Seed branches from data
INSERT INTO analytics_branches (code, name, city, region, tier, active) VALUES
  ('ENGINEER', 'Engineer', NULL, NULL, 'standard', true),
  ('MAUA', 'Maua', NULL, NULL, 'standard', true),
  ('MERU', 'Meru', NULL, NULL, 'standard', true),
  ('NYAHURURU', 'Nyahururu', NULL, NULL, 'standard', true),
  ('THIKA CBD', 'Thika CBD', NULL, NULL, 'standard', true),
  ('KARATINA', 'Karatina', NULL, NULL, 'standard', true),
  ('NAIVASHA', 'Naivasha', NULL, NULL, 'standard', true),
  ('NAKURU', 'Nakuru', NULL, NULL, 'standard', true),
  ('THIKA STORE(NAMPAK)', 'Thika Nampak', NULL, NULL, 'standard', true),
  ('NAROK', 'Narok', NULL, NULL, 'standard', true),
  ('HQ', 'HQ', NULL, NULL, 'standard', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Step 3: Seed periods (Jan-May 2026)
INSERT INTO analytics_periods (label, start_date, end_date, year, quarter, month) VALUES
  ('Jan 2026', '2026-01-01', '2026-01-31', 2026, 1, 1),
  ('Feb 2026', '2026-02-01', '2026-02-28', 2026, 1, 2),
  ('Mar 2026', '2026-03-01', '2026-03-31', 2026, 1, 3),
  ('Apr 2026', '2026-04-01', '2026-04-30', 2026, 2, 4),
  ('May 2026', '2026-05-01', '2026-05-31', 2026, 2, 5)
ON CONFLICT DO NOTHING;

-- Step 4: Insert categories (linked canonical list)
INSERT INTO analytics_categories (id, name, description) VALUES
  (1, 'Footware', NULL),
  (2, 'Confectionery', NULL),
  (3, 'Baking Products', NULL),
  (4, 'Body Care', NULL),
  (5, 'Snacks', NULL),
  (6, 'Soap & Detergents', NULL),
  (7, 'Toiliteries', NULL),
  (8, 'Stationery', NULL),
  (9, 'Insecticide', NULL),
  (10, 'Sanitary Products', NULL),
  (11, 'Packing Materials', NULL),
  (12, 'Wrapping Materials', NULL),
  (13, 'Cereals', NULL),
  (14, 'Hot Beverage', NULL),
  (15, 'Cold Beverage', NULL),
  (16, 'Pasta & Pulses', NULL),
  (17, 'Spices', NULL),
  (18, 'Oral Care', NULL),
  (19, 'Pharmacy', NULL),
  (20, 'Household', NULL),
  (21, 'Promo', NULL),
  (22, 'Handwash & Sanitizer', NULL),
  (23, 'Sugar', NULL),
  (24, 'Lighting Products', NULL),
  (25, 'Baby Care', NULL),
  (26, 'Diaper', NULL),
  (27, 'Sauce & Paste', NULL),
  (28, 'Honey,Jam & Spreads', NULL),
  (29, 'Maize Flour', NULL),
  (30, 'Wheat Flour', NULL),
  (31, 'Cooking Oil & Fats', NULL),
  (32, 'Rice', NULL),
  (33, 'Waste Paper', NULL),
  (34, 'Poridge Flour', NULL),
  (35, 'Fertilizer', NULL),
  (36, 'Mali Mali Products', NULL),
  (37, 'Motor Vehicles', NULL),
  (38, 'Test', NULL),
  (39, 'Meat Products', NULL),
  (40, 'Animal Food', NULL)
ON CONFLICT (id) DO NOTHING;

-- Step 4b: Insert subcategories
INSERT INTO analytics_subcategories (id, name, category_id) VALUES
  (1, 'Shoes', 1),
  (2, 'Chewing Gum', 2),
  (3, 'Yeast', 3),
  (4, 'Lotion', 4),
  (5, 'Bites And Ringos', 5),
  (6, 'Biscuits', 5),
  (7, 'Fabric Softener', 6),
  (8, 'Gumboots', 1),
  (9, 'Toilet Cleaner', 7),
  (10, 'Hard Sweets', 2),
  (11, 'Snacks', 5),
  (12, 'Jellies', 4),
  (13, 'Lollipops', 2),
  (14, 'Pens', 8),
  (15, 'Mathematical Set', 8),
  (16, 'Sprays', 9),
  (17, 'Cbc Materials', 8),
  (18, 'Box & Spring File', 8),
  (19, 'Printing Papers', 8),
  (20, 'Pads', 10),
  (21, 'Packing Materials', 11),
  (22, 'Aluminium Foil', 12),
  (23, 'Breakfast Cereals', 13),
  (24, 'Serviettes', 7),
  (25, 'Cocoa', 14),
  (26, 'Milk', 15),
  (27, 'Cotton Wool', 7),
  (28, 'Soft Drinks', 15),
  (29, 'Sossi', 16),
  (30, 'Noodles', 16),
  (31, 'Spices', 17),
  (32, 'Coffee', 14),
  (33, 'Tea Leaves', 14),
  (34, 'Spreads', 14),
  (35, 'Powder Juice', 15),
  (36, 'Energy Drink', 15),
  (37, 'Tooth Picks', 18),
  (38, 'Shoe Polish & Cream', 1),
  (39, 'Razor', 10),
  (40, 'Disinfectants(Dettol)', 6),
  (41, 'Bathing Soap', 6),
  (42, 'Liquid Detergents', 6),
  (43, 'Bleach', 6),
  (44, 'Cold Beverage', 15),
  (45, 'Dish Washing Liquid', 6),
  (46, 'Scouring Powder', 6),
  (47, 'Hard Sweets', 14),
  (48, 'Chocolate', 14),
  (49, 'Condoms', 19),
  (50, 'Condoms', 10),
  (51, 'Milo', 14),
  (52, 'Plastic', 20),
  (53, 'Printing Material', 8),
  (54, 'Hair Food', 4),
  (55, 'Promotion', 21),
  (56, 'Brooms', 20),
  (57, 'Hand Wash', 22),
  (58, 'Washing Powder', 6),
  (59, 'Glycerine', 4),
  (60, 'Dish Washing Paste', 6),
  (61, 'Window Cleaner', 6),
  (62, 'Pencil', 8),
  (63, 'Dental Floss', 18),
  (64, 'Lubricants', 20),
  (65, 'Twine', 11),
  (66, 'Local Sugar', 23),
  (67, 'Mouth Wash', 18),
  (68, 'Icing Sugar', 23),
  (69, 'Toilet Cleaner', 6),
  (70, 'Air Freshner', 7),
  (71, 'Fuel Gel', 20),
  (72, 'Shower Gel', 6),
  (73, 'Methylated Spirit', 22),
  (74, 'Icepop', 15),
  (75, 'Tampons', 10),
  (76, 'Condom', 10),
  (77, 'Imported Sugar', 23),
  (78, 'Tissues', 7),
  (79, 'Cotton Wool', 10),
  (80, 'Bar Soap', 6),
  (81, 'Cling Film', 12),
  (82, 'Kitchen Towel', 7),
  (83, 'Confectionery', 2),
  (84, 'Stationery', 8),
  (85, 'Soap & Detergents', 6),
  (86, 'Waste Paper', 11),
  (87, 'Air Freshner', 6),
  (88, 'Hand Wash', 6),
  (89, 'Methylated Spirit', 20),
  (90, 'Bulbs', 24),
  (91, 'Batteries', 24),
  (92, 'Glucose', 5),
  (93, 'Books', 8),
  (94, 'Water Guard', 19),
  (95, 'Coils', 9),
  (96, 'Twine', 20),
  (97, 'Wipes', 25),
  (98, 'Hot Beverage', 14),
  (99, 'Disinfectants(Dettol)', 22),
  (100, 'Pegs', 20),
  (101, 'Steel Wool', 20),
  (102, 'Scouring Pad', 20),
  (103, 'Baby Diaper', 26),
  (104, 'Diaper', 26),
  (105, 'Spreads', 20),
  (106, 'Sauces', 27),
  (107, 'Spreads', 28),
  (108, 'Maize Flour', 29),
  (109, 'Wheat Flour', 30),
  (110, 'Green Grams', 16),
  (111, 'Foot Ware', 20),
  (112, 'Oral Care', 18),
  (113, 'Sauce', 27),
  (114, 'Tooth Paste', 18),
  (115, 'Adult Diaper', 26),
  (116, 'White Fats', 31),
  (117, 'Cooking Oil & Fats', 31),
  (118, 'Jellies', 13),
  (119, 'Cooking Oil', 31),
  (120, 'Scouring Pad', 6),
  (121, 'Spaghetti', 16),
  (122, 'Matchbox', 24),
  (123, 'Green Grams', 13),
  (124, 'Medicine', 19),
  (125, 'Dry Beans', 13),
  (126, 'Honey,Jam & Spreads', 28),
  (127, 'Body Care', 4),
  (128, 'Sugar', 23),
  (129, 'Pharmacy', 19),
  (130, 'Wheat Flour', 29),
  (131, 'Baking Powder', 3),
  (132, 'Local Rice', 32),
  (133, 'Wafers', 5),
  (134, 'Tomato Paste', 27),
  (135, 'Honey', 28),
  (136, 'Peanut Butter', 28),
  (137, 'Jellies', 25),
  (138, 'Jam', 28),
  (139, 'Tooth Brushes', 18),
  (140, 'Imported Rice', 32),
  (141, 'Macaroni', 16),
  (142, 'Yogurt', 15),
  (143, 'Yellow Fats', 31),
  (144, 'Candles', 24),
  (145, 'Wick', 20),
  (146, 'Slipppers', 1),
  (147, 'Spreads', 22),
  (148, 'Waste Paper', 33),
  (149, 'Porridge Flour', 34),
  (150, 'Water', 15),
  (151, 'Brooms', 35),
  (152, 'Chocolate', 2),
  (153, 'Foot Ware', 1),
  (154, 'Bodywash', 6),
  (155, 'Toiliteries', 7),
  (156, 'Hard Sweets', 15),
  (157, 'Salt', 17),
  (158, 'Jellies', 20),
  (159, 'Face Towel', 20),
  (160, 'Umbrella', 36),
  (161, 'Straws', 20),
  (162, 'Motor Vehicles', 37),
  (163, 'Lentils(Kamande)', 13),
  (164, 'Packed Rice', 32),
  (165, 'Kitchen Towel', 20),
  (166, 'Crisps', 5),
  (167, 'Hand Sanitizer', 22),
  (168, 'Ear Buds', 4),
  (169, 'Sanitary Products', 10),
  (170, 'Baby Care', 25),
  (171, 'Aluminium Foil', 13),
  (172, 'Rat Trap', 9),
  (173, 'Testing', 38),
  (174, 'Cbc Materials', 2),
  (175, 'Razor', 4),
  (176, 'Hand Sanitizer', 6),
  (177, 'Hard Sweets', 31),
  (178, 'Tea Leaves', 18),
  (179, 'Porridge Flour', 29),
  (180, 'Household', 20),
  (181, 'Batteries', 38),
  (182, 'Sausages', 39),
  (183, 'Dap', 35),
  (184, 'Can', 35),
  (185, 'Urea', 35),
  (186, '23-23', 35),
  (187, '17-17', 35),
  (188, 'Fertilizer', 35),
  (189, 'Imported Sugar', 32),
  (190, 'Printing Material', 20),
  (191, 'Jellies', 6),
  (192, 'Bulbs', 20),
  (193, 'Rice', 32),
  (194, 'Testing', 20),
  (195, 'Chicken Food', 40),
  (196, 'Party Items', 36),
  (197, 'Toys', 36),
  (198, 'Brushes', 36),
  (199, 'Towel', 36),
  (200, 'Handkerchief', 36),
  (201, 'Key Holders', 36),
  (202, 'Yogurt', 36),
  (203, 'Water Bottles', 36),
  (204, 'Flask Mug', 36),
  (205, 'Chicken Meat', 39)
ON CONFLICT (id) DO NOTHING;


-- Step 11: Backfill default_supplier_id on products (one supplier per product)
UPDATE analytics_products p
SET default_supplier_id = (SELECT supplier_id FROM analytics_supplier_products sp WHERE sp.product_id = p.id ORDER BY sp.created_at LIMIT 1)
WHERE p.default_supplier_id IS NULL;

-- Step 12 (Option B): Mark manufacturers table deprecated - queries use suppliers going forward.
-- analytics_manufacturers may remain empty; analytics_products.manufacturer_id stays NULL.
-- Code-side queries (query/route.ts, /api/portal/analytics) group by analytics_suppliers through the junction.

-- Step 13: Add linked_supplier_id column to clients (links a portal client to their supplier record)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS linked_supplier_id uuid REFERENCES public.analytics_suppliers(id) ON DELETE SET NULL;

-- Step 14: Create NICE SUPERMARKET LTD as demo client for portal
INSERT INTO clients (name, email, company, industry, status, notification_prefs)
VALUES ('NICE SUPERMARKET LTD', 'demo@nicesupermarket.co.ke', 'NICE SUPERMARKET LTD', 'FMCG Manufacturing', 'active', '{}'::jsonb)
ON CONFLICT DO NOTHING;

-- Step 15: Link the NICE supplier record to the NICE client record
UPDATE clients c
  SET linked_supplier_id = s.id
  FROM analytics_suppliers s
  WHERE UPPER(s.name) = 'NICE SUPERMARKET LTD'
    AND UPPER(c.company) = 'NICE SUPERMARKET LTD'
    AND c.linked_supplier_id IS NULL;

-- Step 16: Mark all NICE-supplied products with their supplier_id on fact_sales (updates existing rows where supplier_id was null)
UPDATE analytics_fact_sales fs
  SET supplier_id = sp.supplier_id
  FROM analytics_supplier_products sp
  JOIN analytics_suppliers s ON s.id = sp.supplier_id
  WHERE sp.product_id = fs.product_id
    AND UPPER(s.name) = 'NICE SUPERMARKET LTD'
    AND fs.supplier_id IS NULL;

-- Step 17: Auto-seed portal_analytics_sharing for NICE client - share MAIZE FLOUR category × all branches × all monthly periods
-- This gives the demo client visibility into all maize meal sales across branches (including competitors in same category)
INSERT INTO portal_analytics_sharing (client_id, period_id, branch_id, category_id, visible)
SELECT
  c.id,
  per.id,
  b.id,
  cat.id,
  true
FROM clients c
CROSS JOIN analytics_periods per
CROSS JOIN analytics_branches b
CROSS JOIN analytics_categories cat
WHERE UPPER(c.company) = 'NICE SUPERMARKET LTD'
  AND UPPER(cat.name) = 'MAIZE FLOUR'
ON CONFLICT (client_id, period_id, branch_id, category_id) DO NOTHING;


COMMIT;

-- End of migration 035