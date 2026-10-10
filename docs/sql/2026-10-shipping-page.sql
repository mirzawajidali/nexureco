-- NX-014: one free-shipping rule everywhere (Rs. 5,000 or more), no same-day delivery line
UPDATE pages
SET content = '<h2>Shipping Policy</h2>
<p>We deliver nationwide across Pakistan. All orders are Cash on Delivery: you pay when your parcel arrives.</p>
<ul>
  <li><strong>Standard Delivery:</strong> 3-5 business days, Rs. 200</li>
  <li><strong>Free Shipping:</strong> on all orders of Rs. 5,000 or more</li>
</ul>
<p>Delivery times can be longer during sales and public holidays. Once your order ships you can follow it on the <a href="/track-order">Track Order</a> page.</p>

<h2>Returns &amp; Exchanges</h2>
<p>Not satisfied? No worries!</p>
<ul>
  <li>7-day return policy from the date of delivery</li>
  <li>Items must be unworn, unwashed and in their original packaging</li>
  <li>Refunds are processed within 5-7 business days after we receive the returned item</li>
  <li>Exchanges are available for a different size or colour (subject to availability)</li>
</ul>
<p>To start a return or exchange, <a href="/contact">contact us</a> with your order number.</p>',
    meta_title = 'Shipping & Returns | Nexure CO',
    meta_description = 'Nationwide delivery across Pakistan in 3-5 business days: Rs. 200, free on orders of Rs. 5,000 or more. 7-day returns and size or colour exchanges.'
WHERE slug = 'shipping';
SELECT slug, meta_title, LENGTH(content) AS content_length,
       content LIKE '%Rs. 5,000 or more%' AS has_5000, content LIKE '%3,000%' AS has_3000
FROM pages WHERE slug = 'shipping';
