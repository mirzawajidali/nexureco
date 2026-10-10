-- Adidas-style mega menu under MEN in the header: four columns, each a child of the Men item, with links under them.
-- Edit it afterwards in Admin > Menus > Header (a column is an item whose parent is "Men"; a link's parent is a column;
-- URL "#" makes a column heading plain text). The first column is shown on the left with the campaign tiles.
-- Fit and colour links use search for now; swap them for collections (e.g. /collections/oversized-t-shirts) once those exist.
-- Safe to re-run: items that already exist (same parent and title) are skipped.

SET @menu := (SELECT id FROM menus WHERE handle = 'header');
SET @men := (SELECT id FROM menu_items WHERE menu_id = @menu AND parent_id IS NULL AND url = '/category/men' LIMIT 1);

-- Columns
INSERT INTO menu_items (menu_id, parent_id, title, url, link_type, open_in_new_tab, display_order, is_active)
SELECT @menu, @men, c.title, c.url, 'custom', 0, c.ord, 1
FROM (
  SELECT 'New & Trending' AS title, '#' AS url, 0 AS ord
  UNION ALL SELECT 'T-Shirts', '/category/men', 1
  UNION ALL SELECT 'Shop by Colour', '#', 2
  UNION ALL SELECT 'Help', '#', 3
) c
WHERE @men IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM menu_items m WHERE m.parent_id = @men AND m.title = c.title);

-- Links in each column
INSERT INTO menu_items (menu_id, parent_id, title, url, link_type, open_in_new_tab, display_order, is_active)
SELECT @menu, col.id, l.title, l.url, l.link_type, 0, l.ord, 1
FROM (
  SELECT 'New & Trending' AS col, 'New Arrivals' AS title, '/collections/new-arrivals' AS url, 'collection' AS link_type, 0 AS ord
  UNION ALL SELECT 'New & Trending', 'Best Sellers', '/collections/best-sellers', 'collection', 1
  UNION ALL SELECT 'New & Trending', 'Sale', '/collections/sale', 'collection', 2
  UNION ALL SELECT 'T-Shirts', 'Oversized T-Shirts', '/search?q=oversized', 'custom', 0
  UNION ALL SELECT 'T-Shirts', 'Essential T-Shirts', '/search?q=essential', 'custom', 1
  UNION ALL SELECT 'T-Shirts', 'Icon T-Shirts', '/search?q=icon', 'custom', 2
  UNION ALL SELECT 'T-Shirts', 'Embroidered T-Shirts', '/search?q=embroidered', 'custom', 3
  UNION ALL SELECT 'Shop by Colour', 'Black', '/search?q=black', 'custom', 0
  UNION ALL SELECT 'Shop by Colour', 'Red', '/search?q=red', 'custom', 1
  UNION ALL SELECT 'Shop by Colour', 'Royal Blue', '/search?q=royal%20blue', 'custom', 2
  UNION ALL SELECT 'Shop by Colour', 'Heather Grey', '/search?q=heather%20grey', 'custom', 3
  UNION ALL SELECT 'Help', 'Size Guide', '/size-guide', 'custom', 0
  UNION ALL SELECT 'Help', 'Shipping & Returns', '/page/shipping', 'page', 1
  UNION ALL SELECT 'Help', 'Track Order', '/track-order', 'custom', 2
  UNION ALL SELECT 'Help', 'FAQ', '/page/faq', 'page', 3
) l
JOIN menu_items col ON col.parent_id = @men AND col.title = l.col
WHERE NOT EXISTS (SELECT 1 FROM menu_items m WHERE m.parent_id = col.id AND m.title = l.title);

-- Check: the Men item with its columns and links
SELECT c.title AS col, l.title AS link, l.url
FROM menu_items c LEFT JOIN menu_items l ON l.parent_id = c.id
WHERE c.parent_id = @men
ORDER BY c.display_order, l.display_order;
