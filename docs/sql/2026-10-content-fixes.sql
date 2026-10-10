-- Nexure CO content fixes (audit NX-008, NX-027, NX-028, NX-029, NX-032)
-- Each UPDATE only matches the current (old) value, so re-running it changes nothing.

SELECT 'BEFORE' AS state, id, title, url FROM menu_items WHERE id IN (10, 12, 15, 16, 17);

-- NX-008 / NX-027: footer links to pages that don't exist, and the duplicate CMS About page
UPDATE menu_items SET url = '/collections/new-arrivals' WHERE id = 10 AND url = '/category/new-arrivals';
UPDATE menu_items SET url = '/page/faq'                 WHERE id = 12 AND url = '/page/help';
UPDATE menu_items SET url = '/page/shipping'            WHERE id = 15 AND url = '/page/returns';
UPDATE menu_items SET url = '/size-guide'               WHERE id = 16 AND url = '/page/size-guide';
UPDATE menu_items SET url = '/about'                    WHERE id = 17 AND url = '/page/about';

-- NX-028: Men category intro (first paragraph shows under the heading, the rest at the bottom of the page)
UPDATE categories
SET description = 'Men''s T-shirts built for everyday wear: 100% cotton jersey tees in regular and oversized fits, from clean essentials to embroidered and icon-graphic designs.\n\nEvery Nexure CO tee is cut from breathable 100% cotton jersey that feels soft from the first wear and holds its shape wash after wash. Choose the Essential regular fit for a clean, tailored look, or go oversized for a relaxed streetwear silhouette. Our signature pieces carry the Nexure icon, either embroidered on the chest or applied as a sharp, crack-resistant graphic.\n\nMost styles come in Black, Heather Grey, Red and Royal Blue, with Cream in selected designs, in sizes S to 2XL. Not sure which size to pick? Our size guide has chest and length measurements for every fit.\n\nWe deliver across Pakistan with cash on delivery, and orders over Rs. 5,000 ship free.'
WHERE slug = 'men' AND description = 'Explore our latest collection of men''s clothing, shoes and accessories.';

-- NX-032: colour names match the swatch labels ("Red", not "Crimson Red")
UPDATE products SET description = REPLACE(description, 'Crimson Red', 'Red') WHERE id IN (19, 22);

-- NX-029: one brand name in product copy
UPDATE products SET description = REPLACE(description, 'Nexureco', 'Nexure CO') WHERE id = 23;

SELECT 'AFTER' AS state, id, title, url FROM menu_items WHERE id IN (10, 12, 15, 16, 17);
SELECT 'AFTER' AS state, slug, LEFT(description, 80) AS description_start FROM categories WHERE slug = 'men';
SELECT 'AFTER' AS state, id,
       (LENGTH(description) - LENGTH(REPLACE(description, 'Crimson Red', ''))) / LENGTH('Crimson Red') AS crimson_left,
       (LENGTH(description) - LENGTH(REPLACE(description, 'Nexureco', ''))) / LENGTH('Nexureco') AS nexureco_left
FROM products WHERE id IN (19, 22, 23);
