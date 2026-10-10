-- Site audit (Oct 2026) content fixes: #2 same-day delivery claim, #4/#6 hero banner copy, #5 empty Summer collection.
-- #1 (Rs. 3,000 on the Shipping & Returns page) is docs/sql/2026-10-shipping-page.sql: run that too.
-- Each statement only matches the old text, so re-running it, or running it after an edit in the admin, changes nothing.
-- Afterwards clear the cached banners and collections (command at the bottom).

-- #2: the FAQ promised same-day delivery, which checkout doesn't offer. Same questions, plus the shipping fee and
-- free-shipping rule, and tracking by order number without an account.
UPDATE pages SET content = '<h2>Frequently Asked Questions</h2>

<h3>How long does delivery take?</h3>
<p>Standard delivery takes 3-5 business days anywhere in Pakistan.</p>

<h3>How much is shipping?</h3>
<p>Shipping is Rs. 200, and free on orders of Rs. 5,000 or more.</p>

<h3>What payment methods do you accept?</h3>
<p>We currently accept Cash on Delivery (COD) nationwide.</p>

<h3>Can I return or exchange an item?</h3>
<p>Yes! We offer a 7-day return policy. Items must be unworn, unwashed and in their original packaging. Exchanges for a different size or colour are subject to availability. See <a href="/page/shipping">Shipping &amp; Returns</a> for details.</p>

<h3>How do I track my order?</h3>
<p>Enter your order number on the <a href="/track-order">Track Order</a> page. If you have an account, you can also see your orders in your account dashboard.</p>

<h3>Do you offer international shipping?</h3>
<p>Currently, we only ship within Pakistan.</p>'
WHERE slug = 'faq' AND content LIKE '%Same-day delivery%';

-- #4: hero slide 2 sold "tees, shorts and sneakers, up to 30% off" (the store sells tees and the sale is 40%)
-- and linked to the empty Summer collection. The photo shows black, red and royal blue tees.
UPDATE banners
SET title = 'Up to 40% Off',
    subtitle = 'Cotton tees in Black, Red and Royal Blue, now up to 40% off. Cash on delivery across Pakistan.',
    link_url = '/collections/sale',
    button_text = 'Shop the Sale'
WHERE id = 2 AND title = 'Summer Essentials';

-- #6: hero slide 3 claimed "chosen by thousands of customers" while no product has reviews yet.
-- It links to the Essential embroidered-logo tee, so describe that instead.
UPDATE banners
SET subtitle = 'Our Essential tee with an embroidered chest logo, in soft 100% cotton jersey.'
WHERE id = 3 AND subtitle LIKE '%thousands%';

-- #5: the Summer collection has no products. Take it off the site until it's restocked
-- (Admin > Collections: tick Active and Featured again to bring it back).
UPDATE collections
SET is_active = 0, is_featured = 0
WHERE slug = 'summer-collection'
  AND NOT EXISTS (SELECT 1 FROM collection_products cp WHERE cp.collection_id = collections.id);

-- Check: FAQ has no same-day line, the hero copy, Summer collection inactive
SELECT slug, content LIKE '%Same-day%' AS still_same_day FROM pages WHERE slug = 'faq';
SELECT id, title, subtitle, link_url, button_text FROM banners WHERE position = 'hero' ORDER BY display_order;
SELECT slug, is_active, is_featured FROM collections WHERE slug = 'summer-collection';

-- Then clear the cached banners and collections:
--   docker exec mybrand-redis-1 sh -c "redis-cli --scan --pattern 'mybrand:banners*' | xargs -r redis-cli del; redis-cli --scan --pattern 'mybrand:collections*' | xargs -r redis-cli del"
