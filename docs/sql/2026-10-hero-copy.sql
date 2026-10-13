-- Hero redesign: shorter, more specific slide copy for the white label boxes (title on one line,
-- subtitle on two). Each UPDATE only applies while the slide still has the old title, so re-running it,
-- or running it after editing a slide in Admin → Banners, changes nothing.
-- The homepage caches banners for up to 5 minutes, so the new copy can take that long to show.
--   docker exec -i mybrand-db-1 sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < 2026-10-hero-copy.sql
UPDATE banners
SET title = 'New Arrivals',
    subtitle = 'Fresh oversized tees in soft 100% cotton jersey, made for everyday wear.',
    button_text = 'Shop Now'
WHERE id = 1 AND position = 'hero' AND title = 'New Season, New Style';

UPDATE banners
SET subtitle = 'Cotton tees in black, red and royal blue. Cash on delivery across Pakistan.'
WHERE id = 2 AND position = 'hero' AND title = 'Up to 40% Off';

UPDATE banners
SET title = 'The Essential Tee',
    subtitle = 'Our best seller: 100% cotton jersey with an embroidered logo. Any 3 tees for Rs 3,500.',
    button_text = 'Shop Now'
WHERE id = 3 AND position = 'hero' AND title = 'Best Sellers';

SELECT id, title, subtitle, button_text FROM banners WHERE position = 'hero' ORDER BY display_order;
