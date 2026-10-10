-- Adidas-style SEO meta for admin-managed content (titles "[keywords] | Nexure CO Pakistan" under 60 chars,
-- descriptions 140-160 chars starting with a verb). Categories and CMS pages store the full title;
-- products store only the keyword part (the site appends " | Nexure CO Pakistan").

UPDATE categories SET meta_title = 'Men''s T-Shirts and Cotton Tees | Nexure CO Pakistan', meta_description = 'Shop men''s T-shirts at Nexure CO: oversized, regular fit and embroidered tees in 100% cotton jersey, sizes S to 2XL. Cash on delivery across Pakistan.' WHERE slug = 'men';

UPDATE pages SET meta_title = 'FAQ and Help Centre | Nexure CO Pakistan', meta_description = 'Find answers about Nexure CO orders: cash on delivery, delivery times and charges, returns and exchanges, sizing and caring for your cotton T-shirts.' WHERE slug = 'faq';
UPDATE pages SET meta_title = 'Privacy Policy and Your Data | Nexure CO Pakistan', meta_description = 'Read how Nexure CO collects, uses and protects your personal data when you shop for T-shirts with us, including cookies, analytics and your privacy rights.' WHERE slug = 'privacy';
UPDATE pages SET meta_title = 'Terms of Service and Conditions | Nexure CO Pakistan', meta_description = 'Read the terms of service for shopping at Nexure CO: orders and cash on delivery, pricing, shipping, returns and exchanges, and use of our website.' WHERE slug = 'terms';
UPDATE pages SET meta_title = 'Careers and Jobs | Nexure CO Pakistan', meta_description = 'Explore careers at Nexure CO, a growing Lahore T-shirt brand. See open roles in design, operations and ecommerce, and find out how to apply to join our team.' WHERE slug = 'careers';
UPDATE pages SET meta_title = 'Shipping and Returns | Nexure CO Pakistan', meta_description = 'Check Nexure CO delivery across Pakistan: 3-5 business days for Rs. 200, free on orders of Rs. 5,000 or more. 7-day returns and size or colour exchanges.' WHERE slug = 'shipping';

UPDATE products SET meta_title = 'Men''s Essential Regular Fit T-Shirt', meta_description = 'Shop the Nexure CO Essential regular fit T-shirt in 100% cotton jersey: Black, Heather Grey, Red and Royal Blue, sizes S to 2XL. Cash on delivery in Pakistan.' WHERE id = 19;
UPDATE products SET meta_title = 'Men''s Signature Icon Regular Fit Tee', meta_description = 'Shop the Nexure CO Signature Icon T-shirt: regular fit 100% cotton jersey with the full Nexure brand mark, in four colours and sizes S to 2XL. Cash on delivery.' WHERE id = 20;
UPDATE products SET meta_title = 'Men''s Core Icon Regular Fit T-Shirt', meta_description = 'Shop the Nexure CO Core Icon T-shirt: regular fit 100% cotton jersey with the Nexure icon, in Black, Red, Royal Blue and Heather Grey. Cash on delivery.' WHERE id = 21;
UPDATE products SET meta_title = 'Men''s Essential Oversized T-Shirt', meta_description = 'Shop the Nexure CO Essential oversized T-shirt in 100% cotton jersey: a relaxed fit in Black, Red, Royal Blue and Heather Grey. Cash on delivery in Pakistan.' WHERE id = 22;
UPDATE products SET meta_title = 'Men''s Embroidered Logo Essential Tee', meta_description = 'Shop the Nexure CO Essential tee with an embroidered chest logo, in 100% cotton jersey and five colours including Cream, sizes S to 2XL. Cash on delivery.' WHERE id = 23;

SELECT 'category' AS kind, slug AS id, meta_title, CHAR_LENGTH(meta_description) AS desc_len FROM categories WHERE slug = 'men'
UNION ALL SELECT 'page', slug, meta_title, CHAR_LENGTH(meta_description) FROM pages WHERE slug IN ('faq','privacy','terms','careers','shipping')
UNION ALL SELECT 'product', id, meta_title, CHAR_LENGTH(meta_description) FROM products WHERE id IN (19,20,21,22,23);
