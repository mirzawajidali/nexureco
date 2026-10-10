-- UI/UX audit content fixes (#21, #24, #7, #22). Safe to re-run: every statement only matches the old value.
-- Run on the VPS:
--   docker exec -i mybrand-db-1 sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < 2026-10-ux-content.sql
-- Product and listing caches expire within 10 minutes; refresh the search index afterwards (command at the bottom).

-- #21: Best Sellers in the main navigation (desktop header and mobile menu), between Men and Sale
INSERT INTO menu_items (menu_id, parent_id, title, url, link_type, open_in_new_tab, display_order, is_active)
SELECT m.id, NULL, 'Best Sellers', '/collections/best-sellers', 'collection', 0, 2, 1
FROM menus m
WHERE m.handle = 'header'
  AND NOT EXISTS (SELECT 1 FROM menu_items mi WHERE mi.menu_id = m.id AND mi.url = '/collections/best-sellers');

-- #24: "Shipping Info" and "Returns & Exchange" both opened the Shipping & Returns page; keep one link.
-- When the Refund Policy page (docs/cms-pages/refund-policy.html) is published, bring the second link back:
--   UPDATE menu_items SET url = '/page/refund-policy', is_active = 1 WHERE id = 15;
UPDATE menu_items SET title = 'Shipping & Returns' WHERE id = 14 AND title = 'Shipping Info';
UPDATE menu_items SET is_active = 0 WHERE id = 15 AND url = '/page/shipping';

-- #7: brand name in the one product title that used "Nexureco" (the URL slug stays the same)
UPDATE products
SET name = 'Nexure CO Essential 100% Cotton Jersey Embroidered Logo T-Shirt'
WHERE id = 23 AND name = 'Nexureco Essential 100% Cotton Jersey Embroidered Logo T-Shirt';

-- #22: the logos are heat-transfer prints ("heat-sealed"); "sticker" reads as low quality.
-- REPLACE is case-sensitive, so each wording is listed; most specific first.
UPDATE products
SET description =
  REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(description,
    'heat-sealed sticker application', 'heat-transfer application'),
    'heat-sealed sticker', 'heat-transfer print'),
    'sticker-application logo', 'heat-transfer logo'),
    'sticker-style logo', 'heat-transfer logo'),
    'sticker finish', 'heat-transfer finish'),
    'sticker technique', 'heat-transfer technique'),
    'Text Sticker Graphic', 'Text Graphic'),
    'Text Sticker', 'Text Print'),
    'Icon Sticker', 'Icon Print'),
    'icon sticker', 'icon print'),
    'the sticker is', 'the print is')
WHERE id IN (19, 20, 21, 22) AND description LIKE '%sticker%';

-- Check: Best Sellers is in the header, one shipping link in the footer, product 23 renamed, no "sticker" left
SELECT 'header' AS menu, title, url, is_active FROM menu_items
  WHERE menu_id = (SELECT id FROM menus WHERE handle = 'header') ORDER BY display_order;
SELECT 'footer-support' AS menu, id, title, url, is_active FROM menu_items WHERE id IN (14, 15);
SELECT id, name FROM products WHERE id = 23;
SELECT id, (LENGTH(description) - LENGTH(REPLACE(LOWER(description), 'sticker', ''))) / 7 AS sticker_left
  FROM products WHERE id IN (19, 20, 21, 22);

-- Then refresh the search index so search shows the new product name and descriptions:
--   docker exec mybrand-backend-1 python -c "import asyncio; from app.db.elasticsearch import init_elasticsearch, close_elasticsearch; from app.db.database import AsyncSessionLocal; from app.services.es_indexing_service import bulk_index_all_products
--   async def main():
--       await init_elasticsearch()
--       async with AsyncSessionLocal() as s: print('reindexed', await bulk_index_all_products(s))
--       await close_elasticsearch()
--   asyncio.run(main())"
