-- UI/UX audit #13: describe the hero photos for screen readers. Run AFTER deploying the code that adds
-- banners.image_alt (the backend creates the column on startup). Only fills slides that have no description,
-- so re-running it, or running it after editing a description in Admin → Banners, changes nothing.
--   docker exec -i mybrand-db-1 sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < 2026-10-hero-alt.sql
UPDATE banners SET image_alt = 'Front and back view of a model in a black Nexure CO T-shirt with the white nexure chest logo'
WHERE id = 1 AND (image_alt IS NULL OR image_alt = '');
UPDATE banners SET image_alt = 'Three models in black, red and royal blue Nexure CO T-shirts with the white wave icon on the chest'
WHERE id = 2 AND (image_alt IS NULL OR image_alt = '');
UPDATE banners SET image_alt = 'Model in a red Nexure CO T-shirt with the white wave icon, against a dark red backdrop'
WHERE id = 3 AND (image_alt IS NULL OR image_alt = '');

SELECT id, title, image_alt FROM banners WHERE position = 'hero' ORDER BY display_order;
