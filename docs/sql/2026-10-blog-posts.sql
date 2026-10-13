-- Blog launch: the first 8 posts (Admin → Blog). Run AFTER deploying the code that adds the blog: the
-- backend creates the blog_posts table on startup. Posts are dated now (a few minutes apart, so they list
-- in this order) and use photos already on the site; swap covers in Admin → Blog any time.
-- A post whose URL already exists is skipped, so re-running this changes nothing.
--   docker exec -i mybrand-db-1 sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < 2026-10-blog-posts.sql
SET NAMES utf8mb4;

-- 1. How to Style an Oversized T-Shirt for Men: Outfits That Work
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('How to Style an Oversized T-Shirt for Men: Outfits That Work', 'how-to-style-oversized-t-shirt-men', 'Oversized tees look sharp when the proportions are right. Here is how to wear one with jeans, cargos, shorts and joggers, when to tuck, how to layer and which shoes work.', '<p>Styling an oversized T-shirt well comes down to balance: keep the top relaxed, keep the bottom half cleaner, and wear shoes with a bit of presence. Get that right and how to style an oversized T-shirt as a man has a simple answer. Straight jeans, cargos, shorts and joggers all work, as long as the proportions do.</p>
<p>Below are the outfit formulas that hold up in real Pakistani weather and real plans, from a 9am university class to a late-night chai run, plus the tucking rules, layering ideas and mistakes worth avoiding.</p>
<h2>The Golden Rule of Styling an Oversized T-Shirt for Men</h2>
<p>An oversized tee is meant to look roomy, so everything else in the outfit has to give it some structure. If the trousers are just as baggy and the shoes are thin and flat, the whole look starts to swamp you. One relaxed piece plus one cleaner piece is the formula to remember.</p>
<p>It also helps to know what a proper oversized fit looks like. A tee cut to be oversized has dropped shoulders, so the seam sits a little way down your arm, a relaxed body that falls straight rather than clinging, and a hem that lands around the hip. That is very different from a regular tee bought two sizes too big, where the sleeves flap past the elbow and the hem hangs halfway down your thighs. If you are unsure which shape suits you, our <a href="/blog/oversized-vs-regular-fit-t-shirt" rel="noopener noreferrer">oversized vs regular fit guide</a> breaks it down.</p>
<h2>Oversized T-Shirt With Jeans</h2>
<p>Jeans are the easiest starting point because denim has enough weight to balance a loose top.</p>
<h3>Straight-leg jeans: the everyday default</h3>
<p>A straight or relaxed-straight cut in mid-blue or black is the most reliable partner for an oversized tee. Let the jeans rest on your shoes with a slight break, or turn up a single cuff if they are long. A Black tee, mid-blue straight jeans and white trainers is a complete outfit for class, a cafe or a cinema trip.</p>
<h3>Slim jeans: keep the taper, lose the skinny</h3>
<p>Skinny jeans under a big tee create a top-heavy, lollipop shape. If you prefer a slimmer leg, choose slim-straight jeans with a gentle taper, and go for a darker wash so the leg looks clean and deliberate.</p>
<h2>Cargo Pants, Joggers and Chinos</h2>
<p>Cargos and joggers bring a streetwear edge, but both need a little control at the ankle.</p>
<ul>
<li><strong>Cargo pants:</strong> pick a pair that tapers or cuffs at the ankle so the outfit does not turn into one big rectangle. Olive, khaki or black cargos with a Heather Grey or Black tee is a safe, sharp combination.</li>
<li><strong>Joggers:</strong> ideal for travel days, the long drive home for Eid or a lazy Sunday. Keep it intentional with a tonal pairing, such as a grey tee with charcoal joggers, and clean trainers rather than worn-out house slippers.</li>
<li><strong>Chinos:</strong> a straight or relaxed chino in beige, stone or navy is the smartest option here, and it suits office-casual Fridays if your workplace allows tees.</li>
</ul>
<h2>Oversized T-Shirt With Shorts</h2>
<p>When Lahore and Karachi hit their June peak, shorts are the sensible choice. The key is length: shorts that end just above or at the knee balance a loose top, while long baggy shorts plus a long tee leave you looking shapeless.</p>
<p>Chino shorts in beige or olive, or plain denim shorts, work best. A Royal Blue tee with stone shorts and white trainers looks fresh, and for a day at the beach or a trip up north, slides are perfectly fine.</p>
<h2>To Tuck or Not to Tuck</h2>
<p>Tucking changes the proportions completely, so do it on purpose rather than by habit.</p>
<ul>
<li><strong>Leave it untucked</strong> with jeans, cargos, joggers and shorts. This is the default, and the hem should sit around your hip or the very top of your thigh.</li>
<li><strong>Try a front tuck</strong>, with just the centre few inches tucked into the waistband, when wearing wide chinos or pleated trousers with a belt. It shows your waist without bunching.</li>
<li><strong>Avoid a full tuck</strong> in most cases. There is simply too much fabric, and it balloons over the belt.</li>
<li><strong>Never tuck into elasticated waists</strong> like joggers or drawstring shorts. It reads as gym kit, not an outfit.</li>
</ul>
<h2>Layering Over and Under</h2>
<p>An oversized tee is a useful layering piece for the cooler months and for evening plans.</p>
<h3>Layering over the tee</h3>
<p>An open overshirt, a denim jacket or a light bomber all sit well over an oversized tee, as long as the outer layer is roomy enough not to pull across the back. For a friend''s dholki or a relaxed family dinner, a Black tee under an open overshirt with dark trousers and loafers looks put together without trying too hard.</p>
<h3>Layering under the tee</h3>
<p>On foggy December and January mornings in Lahore, a fitted long-sleeve top or thermal underneath adds warmth and a bit of contrast at the cuffs. Keep the under layer slim and plain so it does not fight with the tee.</p>
<h2>Footwear That Works</h2>
<p>Because the top half carries a lot of visual volume, your shoes need some substance too.</p>
<ul>
<li><strong>Chunky or classic white trainers:</strong> the most versatile choice with everything above.</li>
<li><strong>High-tops:</strong> great with cuffed jeans or cargos.</li>
<li><strong>Loafers:</strong> pair them with straight trousers or chinos for a smart-casual evening.</li>
<li><strong>Slides and sandals:</strong> fine with shorts in peak summer, less so with jeans.</li>
<li><strong>Peshawari chappals:</strong> they can work with straight jeans and a Black or Heather Grey tee for a relaxed Eid afternoon.</li>
</ul>
<h2>Mistakes to Avoid</h2>
<ul>
<li>Buying a regular tee two or three sizes up and calling it oversized. The shoulders and sleeves give it away.</li>
<li>Going baggy from head to toe without any structure.</li>
<li>Wearing skinny jeans that make your legs look like pins under a wide top.</li>
<li>Letting the hem fall past mid-thigh, which shortens your legs.</li>
<li>Wearing a faded, stretched or crumpled tee. Oversized fits rely on the fabric hanging well, so follow our guide on <a href="/blog/how-to-wash-cotton-t-shirts" rel="noopener noreferrer">how to wash cotton T-shirts</a> to keep yours looking new.</li>
</ul>
<h2>FAQ</h2>
<h3>Should I size up for an oversized T-shirt?</h3>
<p>Not if the tee is designed to be oversized. The relaxed fit is built into the cut, so take your usual size. Check the <a href="/size-guide" rel="noopener noreferrer">size guide</a> if you are between sizes.</p>
<h3>Can shorter men wear oversized T-shirts?</h3>
<p>Yes. Keep the hem around the hip, choose straight rather than wide trousers, and try wearing the top and bottom in similar tones to create a longer line.</p>
<h3>Which colours are easiest to style?</h3>
<p>Black and Heather Grey go with almost everything. Royal Blue and Red make more of a statement, and our <a href="/blog/t-shirt-colour-combinations-men" rel="noopener noreferrer">T-shirt colour combinations guide</a> shows what to pair them with.</p>
<h3>Is an oversized tee okay for the office?</h3>
<p>Only where the dress code is genuinely casual. Under an overshirt with chinos it can pass, but for most offices a regular fit tee is the safer choice.</p>
<p>Ready to try the look? The <a href="/product/nexure-co-essential-oversized-100-cotton-jersey-t-shirt" rel="noopener noreferrer">Essential Oversized Tee</a> comes in Black, Red, Royal Blue and Heather Grey, cut from 100% cotton jersey with the dropped shoulders already built in.</p>', '/uploads/media/f71260e7272e4546af3618eab1616723.avif', 'Two men in black Nexure CO oversized T-shirts, seen from the front and the back', 'Style Guide', 'Nexure CO', 6, 1, 1, 'How to Style Oversized T-Shirts for Men', 'Learn how to style an oversized T-shirt for men with jeans, cargos, shorts and joggers, plus tucking rules, layering ideas and the shoes that work.', UTC_TIMESTAMP() - INTERVAL 0 MINUTE, UTC_TIMESTAMP() - INTERVAL 0 MINUTE, UTC_TIMESTAMP() - INTERVAL 0 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 2. Oversized vs Regular Fit T-Shirt: Which Fit Is Right for You?
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('Oversized vs Regular Fit T-Shirt: Which Fit Is Right for You?', 'oversized-vs-regular-fit-t-shirt', 'Not sure whether to go oversized or regular? Learn how each fit should sit at the shoulders, chest, length and sleeves, and which one suits your build and your week.', '<p>Where the seams sit and how much room the body has: that is the real difference in the oversized vs regular fit t-shirt debate. A regular fit follows your frame with a little ease, with the shoulder seam on your shoulder bone and the hem around your belt, while an oversized fit drops the shoulder, widens the body and creates a relaxed, streetwear shape. Neither is better, and the right one depends on your build, your plans for the day and how you like your clothes to feel.</p>
<h2>Oversized vs Regular Fit T-Shirt: Side by Side</h2>
<p>Here is how the two fits compare at each point that matters. Use it as a checklist when you try a tee on in front of the mirror.</p>
<table>
<thead><tr><th>Fit point</th><th>Regular fit</th><th>Oversized fit</th></tr></thead>
<tbody>
<tr><td>Shoulders</td><td>Seam sits on the edge of your shoulder bone</td><td>Seam drops a little way down the upper arm</td></tr>
<tr><td>Chest</td><td>Skims the chest with room to move, no pulling</td><td>Generous room, with fabric falling straight from the shoulders</td></tr>
<tr><td>Length</td><td>Covers the waistband, ending around the belt or just below</td><td>Longer, usually ending around the hip</td></tr>
<tr><td>Sleeves</td><td>End around mid-bicep, close but not tight</td><td>Wider and looser, sitting lower on the arm</td></tr>
<tr><td>Overall look</td><td>Clean, classic and neat</td><td>Relaxed, modern and street-led</td></tr>
<tr><td>Tucking</td><td>Full tuck or front tuck both work</td><td>Front tuck only, or leave it out</td></tr>
<tr><td>Layers well under</td><td>Blazers, fitted overshirts, bomber jackets</td><td>Open overshirts, denim jackets, roomy outerwear</td></tr>
</tbody>
</table>
<h2>How a Regular Fit T-Shirt Should Fit</h2>
<p>A regular fit is the shape most men grew up wearing, and it is the easier of the two to get right. Stand in front of a mirror and check these points.</p>
<ul>
<li><strong>Shoulders:</strong> the seam lands right on the edge of your shoulder. If it hangs down your arm, the tee is too big.</li>
<li><strong>Chest:</strong> you should be able to pinch an inch or two of fabric at each side. Horizontal pull lines across the chest mean it is too small.</li>
<li><strong>Length:</strong> the hem covers your belt and does not ride up to show skin when you lift your arms.</li>
<li><strong>Sleeves:</strong> they end around mid-bicep and sit close without squeezing.</li>
</ul>
<p>The <a href="/product/nexure-co-core-icon-100-cotton-jersey-regular-fit-t-shirt" rel="noopener noreferrer">Core Icon Regular Fit Tee</a> is a good reference point. It is a standard regular fit that runs true to size, so your usual size should sit exactly as described above.</p>
<h2>How an Oversized T-Shirt Should Fit</h2>
<p>A well-cut oversized tee looks relaxed, not borrowed. The difference is in a few details.</p>
<ul>
<li><strong>Shoulders:</strong> the dropped seam sits a little below the shoulder, not halfway to your elbow.</li>
<li><strong>Body:</strong> roomy and straight, with space for air to move, but it should not look like a tent.</li>
<li><strong>Length:</strong> around the hip or the very top of the thigh. Much longer and it starts to shorten your legs.</li>
<li><strong>Neckline:</strong> it should still sit close to the base of your neck. A wide, gaping neckline usually means the tee is simply too big.</li>
</ul>
<p>Because the relaxed shape is built into the cut, you do not need to size up. With the <a href="/product/nexure-co-essential-oversized-100-cotton-jersey-t-shirt" rel="noopener noreferrer">Essential Oversized Tee</a>, which has dropped shoulders and a relaxed body, customers normally take their usual size.</p>
<h2>Which Fit Suits Your Body Type?</h2>
<p>Every build can wear both fits. Treat these as starting points, not rules.</p>
<h3>Slim or lean build</h3>
<p>An oversized tee adds a little visual width at the shoulders, which many slimmer men like. A regular fit looks sharp too, as long as it is not so loose that it hangs off you.</p>
<h3>Athletic or broad shoulders</h3>
<p>A regular fit shows off your shape, but check that the chest and sleeves are not straining. An oversized tee gives you room to move and a more relaxed look for weekends.</p>
<h3>Bigger frame or a bit of a belly</h3>
<p>A regular fit in the correct size, not one size too small, skims the body without clinging. If you prefer oversized, keep the length around the hip so the shape stays neat rather than boxy.</p>
<h3>Shorter or taller men</h3>
<p>Shorter men usually find a regular fit easier, since an oversized tee can swallow a smaller frame unless the hem stays at the hip. Taller men carry oversized proportions naturally, and should check that a regular fit is long enough to cover the belt.</p>
<h2>Which Fit for Which Occasion</h2>
<ul>
<li><strong>University and weekends:</strong> either works. Oversized tees with cargos or straight jeans are a campus favourite.</li>
<li><strong>Office casual:</strong> a regular fit under a blazer or overshirt is the safer bet. The <a href="/product/nexureco-essential-100-cotton-jersey-embroidered-logo-t-shirt" rel="noopener noreferrer">Essential Embroidered Logo Tee</a>, with its tailored modern cut and small embroidered chest logo, sits neatly between casual and smart.</li>
<li><strong>Family dinners and dholkis:</strong> a regular fit tee with chinos, or an oversized tee under an open overshirt, both look considered.</li>
<li><strong>Travel and long days out:</strong> oversized wins on comfort, especially on a long road trip in the heat.</li>
<li><strong>Peak summer:</strong> both fits breathe well in 100% cotton, but the extra room in an oversized tee lets more air move around your body.</li>
</ul>
<h2>Sizing Tips for Both Fits</h2>
<p>For a regular fit, measure your chest and follow the chart. If you fall between two sizes, size up for a relaxed fit or down for a slimmer fit. For an oversized fit, stick to your usual size and let the cut do the work. Full measurements are on our <a href="/size-guide" rel="noopener noreferrer">size guide</a>.</p>
<h2>FAQ</h2>
<h3>Is an oversized T-shirt just a regular tee in a bigger size?</h3>
<p>No. A true oversized tee is cut with dropped shoulders and a wider body. A regular tee sized up keeps its normal shoulder shape, so the seams slide down your arms and the sleeves and hem end up too long.</p>
<h3>Should I size up in a regular fit to get the oversized look?</h3>
<p>Going up one size gives a slightly relaxed regular fit, which is fine. Going up two or more usually looks sloppy rather than oversized.</p>
<h3>Which fit is more flattering if I have a belly?</h3>
<p>A regular fit in the right size, neither tight nor baggy, is usually the most flattering. Darker colours such as Black help too.</p>
<h3>Which fit is better for Pakistani summers?</h3>
<p>Both work in 100% cotton. Oversized gives more airflow, while a regular fit looks neater for work and errands.</p>
<p>Still deciding? Browse every fit side by side in our <a href="/category/men" rel="noopener noreferrer">men''s T-shirts</a> and pick the one that suits your week.</p>', '/uploads/products/d2f12f5380254c53b74be7ad6f429cef.avif', 'Model in a heather grey Nexure CO oversized T-shirt with the nexure chest logo', 'Fit & Sizing', 'Nexure CO', 6, 1, 0, 'Oversized vs Regular Fit T-Shirt', 'Compare the oversized vs regular fit t-shirt: how each should sit at the shoulders, chest, length and sleeves, and which suits your build and plans.', UTC_TIMESTAMP() - INTERVAL 5 MINUTE, UTC_TIMESTAMP() - INTERVAL 5 MINUTE, UTC_TIMESTAMP() - INTERVAL 5 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 3. Men's T-Shirt Size Chart Pakistan: How to Measure Yourself at Home
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('Men''s T-Shirt Size Chart Pakistan: How to Measure Yourself at Home', 'mens-t-shirt-size-chart-pakistan', 'Measure your chest, shoulders and length at home in five minutes, then match them to our men''s size chart. Includes between-sizes advice and fixes for common fit problems.', '<p>Five minutes with a soft measuring tape is all it takes to choose the right size online. Measure your chest, shoulders and preferred length, then match the numbers to the t-shirt size chart Pakistan shoppers can use on our site: S fits a 36-38 inch chest, M 38-40, L 40-42, XL 42-44 and 2XL 44-46. Below you will find step-by-step instructions, the full chart and fixes for the most common fit problems.</p>
<h2>What You Need Before You Measure</h2>
<p>You do not need anything special. Most homes already have everything it takes.</p>
<ul>
<li><strong>A soft measuring tape:</strong> the cloth tape your tailor uses is perfect. If you do not have one, use a piece of string or a phone charger cable, then lay it against a ruler or steel tape.</li>
<li><strong>A mirror:</strong> to check the tape stays level all the way round.</li>
<li><strong>A friend or sibling:</strong> shoulder width is much easier to measure with a second pair of hands.</li>
<li><strong>A thin T-shirt or vest:</strong> measure over light clothing, not over a hoodie or a thick kurta.</li>
</ul>
<h2>How to Measure Yourself at Home</h2>
<p>Stand straight, relax your shoulders and breathe normally. Write each number down in inches as you go.</p>
<h3>1. Chest</h3>
<ol>
<li>Lift your arms slightly and place the tape under your armpits, around the fullest part of your chest.</li>
<li>Bring it round your back across the shoulder blades, keeping it level and parallel to the floor.</li>
<li>Lower your arms and read the number where the tape meets. It should be snug, with room to slide one finger underneath, not tight.</li>
</ol>
<h3>2. Shoulder width</h3>
<ol>
<li>Find the bony point at the outer edge of each shoulder, where the arm begins.</li>
<li>Ask your helper to measure across your upper back from one point to the other, following the natural curve.</li>
</ol>
<h3>3. Length</h3>
<p>Measure from the highest point of your shoulder, right next to the collar, straight down to where you want the hem to finish. For most men that is just below the belt. If measuring yourself is awkward, lay your best-fitting tee flat and measure it from the top of the shoulder seam to the hem instead.</p>
<h3>Measuring mistakes to avoid</h3>
<ul>
<li><strong>Pulling the tape tight:</strong> it knocks an inch off your chest and pushes you into a size that pulls.</li>
<li><strong>Letting the tape dip at the back:</strong> check in the mirror that it stays level across your shoulder blades.</li>
<li><strong>Puffing out your chest:</strong> stand naturally, the way you would on an ordinary day.</li>
<li><strong>Measuring once:</strong> take each measurement twice. If the numbers differ, use the average.</li>
</ul>
<h2>The T-Shirt Size Chart Pakistan Shoppers Can Use</h2>
<p>These are the body measurements from our <a href="/size-guide" rel="noopener noreferrer">size guide</a>, in inches. Match your chest first, then check shoulder and length.</p>
<table>
<thead><tr><th>Size</th><th>Chest (in)</th><th>Length (in)</th><th>Shoulder (in)</th></tr></thead>
<tbody>
<tr><td>S</td><td>36-38</td><td>28</td><td>17</td></tr>
<tr><td>M</td><td>38-40</td><td>29</td><td>17.5</td></tr>
<tr><td>L</td><td>40-42</td><td>30</td><td>18</td></tr>
<tr><td>XL</td><td>42-44</td><td>31</td><td>18.5</td></tr>
<tr><td>2XL</td><td>44-46</td><td>32</td><td>19</td></tr>
</tbody>
</table>
<p>Chest is the most important number, because it decides whether a tee feels comfortable or pulls across your body. Shoulder width comes next, since a seam in the wrong place is the most visible sign of a poor fit.</p>
<h2>Between Sizes? How to Choose</h2>
<p>Plenty of men land on a boundary. A 40-inch chest, for example, sits right between M and L. Here is how to decide.</p>
<ul>
<li><strong>Size up for a relaxed fit</strong> if you like room to move, have broad shoulders or plan to wear a thermal underneath in winter.</li>
<li><strong>Size down for a slim fit</strong> if you prefer a closer, sharper look and your shoulders sit within the smaller size.</li>
<li><strong>Check the length column</strong> if you are tall. The extra inch in the next size up can make a real difference.</li>
<li><strong>Take your usual size in oversized styles.</strong> The relaxed look of the <a href="/product/nexure-co-essential-oversized-100-cotton-jersey-t-shirt" rel="noopener noreferrer">Essential Oversized Tee</a> is built into the cut, so there is no need to size up.</li>
<li><strong>Trust the chart for regular fits.</strong> The Core Icon Regular Fit Tee, for instance, runs true to size.</li>
</ul>
<h2>Common Fit Problems and How to Fix Them</h2>
<ul>
<li><strong>Pull lines across the chest:</strong> the tee is too small. Go up one size.</li>
<li><strong>Shoulder seams hanging down your arms on a regular tee:</strong> it is too big. Go down a size, or choose an oversized cut if you like that relaxed shape.</li>
<li><strong>Hem rides up when you lift your arms:</strong> too short for your torso. Check the length column and consider the next size up.</li>
<li><strong>Hem covers your seat:</strong> too long. Drop a size, or switch from oversized to a regular fit.</li>
<li><strong>Tight around the biceps:</strong> common if you train at the gym. Size up, or pick an oversized tee with roomier sleeves.</li>
<li><strong>Tee shrank after washing:</strong> cotton can tighten up in hot water or a tumble dryer. Our guide on <a href="/blog/how-to-wash-cotton-t-shirts" rel="noopener noreferrer">how to wash cotton T-shirts</a> explains how to avoid it.</li>
</ul>
<h2>Buying for Someone Else</h2>
<p>Ordering an Eid gift for a brother or your father? Measuring him in secret is tricky, so borrow a tee that fits him well, note the size on its label and measure its length from shoulder to hem. That gives you a reliable starting point, and erring on the relaxed side of a size is more forgiving than going too tight.</p>
<p>If something still does not fit, exchanges for a different size or colour are available within 7 days of delivery, subject to availability, as long as the tee is unworn, unwashed and in its original packaging. Full details are on our <a href="/page/shipping" rel="noopener noreferrer">Shipping &amp; Returns</a> page.</p>
<h2>FAQ</h2>
<h3>What T-shirt size is a 40-inch chest?</h3>
<p>A 40-inch chest sits on the line between M (38-40) and L (40-42). Choose L for a relaxed fit or M for a slimmer fit.</p>
<h3>Are T-shirt sizes the same across brands in Pakistan?</h3>
<p>No. Sizing varies from brand to brand, so always check the chart for the tee you are buying rather than relying on the letter on your last one.</p>
<h3>Should I size up for an oversized T-shirt?</h3>
<p>No. Oversized tees are cut to be roomy, so take your usual size.</p>
<h3>What if the size I order does not fit?</h3>
<p>You can request an exchange for another size within 7 days of delivery, provided the tee is unworn, unwashed and in its original packaging.</p>
<p>Got your numbers? Browse our <a href="/category/men" rel="noopener noreferrer">men''s T-shirts</a> and choose your size with confidence.</p>', '/uploads/products/7d2c6765567b432c81e7713d6c2dfb2e.avif', 'Model in a heather grey regular fit T-shirt with the triple-wave icon on the chest', 'Fit & Sizing', 'Nexure CO', 6, 1, 1, 'T-Shirt Size Chart: How to Measure', 'Use this men''s t-shirt size chart Pakistan guide to measure your chest, shoulders and length at home, choose between sizes and fix common fit problems.', UTC_TIMESTAMP() - INTERVAL 10 MINUTE, UTC_TIMESTAMP() - INTERVAL 10 MINUTE, UTC_TIMESTAMP() - INTERVAL 10 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 4. How to Wash Cotton T-Shirts So They Last (and Keep Their Colour)
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('How to Wash Cotton T-Shirts So They Last (and Keep Their Colour)', 'how-to-wash-cotton-t-shirts', 'Stop your tees shrinking and fading. A simple washing routine for cotton T-shirts, plus how to keep blacks dark, cream bright and printed or embroidered logos looking new.', '<p>Turn them inside out, wash them in cold water with similar colours, and dry them in the shade rather than in a tumble dryer. That, in short, is how to wash cotton t-shirts so they last, and those habits prevent most shrinking, fading and twisted seams. The detail below covers everything else, from keeping blacks black to protecting printed and embroidered logos.</p>
<h2>How to Wash Cotton T-Shirts: The Basic Routine</h2>
<p>Whether you use a fully automatic machine, a twin-tub or a bucket, the routine is the same.</p>
<ol>
<li><strong>Check the care label.</strong> It always overrides general advice.</li>
<li><strong>Sort by colour.</strong> Keep darks such as Black and Royal Blue together, wash Red separately for the first few washes, and keep Cream and other light shades with lights only.</li>
<li><strong>Turn every tee inside out.</strong> This protects the outer surface and any logo from rubbing.</li>
<li><strong>Use cold or cool water.</strong> Heat is the main cause of both shrinking and fading.</li>
<li><strong>Choose a gentle cycle</strong> with a mild detergent, and do not overload the drum. Clothes need room to move to get clean.</li>
<li><strong>Go easy on the spin.</strong> A long, fast spin twists cotton jersey out of shape.</li>
<li><strong>Take tees out promptly,</strong> give each one a shake and pull the seams straight while damp.</li>
</ol>
<h2>Why Cotton Shrinks and How to Stop It</h2>
<p>Cotton fibres tighten when they meet heat and heavy agitation together, which is why a hot wash followed by a tumble dryer is the classic way to lose length. Cold water, a gentle cycle and air drying keep that to a minimum.</p>
<p>A few extra habits help:</p>
<ul>
<li>Never wring a cotton tee. Press the water out instead.</li>
<li>Skip the tumble dryer altogether, or use the lowest heat setting only if you must.</li>
<li>Reshape the tee while it is damp, gently easing the length and side seams back into line.</li>
</ul>
<h2>Keeping Blacks Black and Colours Bright</h2>
<h3>Black and dark colours</h3>
<p>Dark cotton fades from friction, hot water and sunlight. Wash inside out in cold water, use a detergent made for darks if you have one, and wash a little less often when you can. After a short evening out, airing a tee on a hanger overnight is often enough.</p>
<h3>Red and other strong shades</h3>
<p>Strong colours like Red can release some dye in the first few washes. Wash them alone or with similar colours until the water runs clear, and never leave a wet red tee bundled up with lighter clothes.</p>
<h3>Cream, white and light colours</h3>
<p>Light shades show sweat marks and the greyness that comes from mixed loads. Wash them only with lights, treat underarm and collar marks promptly, and avoid chlorine bleach unless the care label allows it, because it can yellow cotton over time.</p>
<h3>Heather Grey</h3>
<p>Heather Grey is forgiving with colour but shows sweat patches clearly in summer. Wash it soon after wearing rather than letting it sit in the laundry basket.</p>
<h2>Printed Logos vs Embroidered Logos</h2>
<p>Logos need slightly different care depending on how they are applied. The <a href="/product/nexure-co-essential-oversized-100-cotton-jersey-t-shirt" rel="noopener noreferrer">Essential Oversized Tee</a> has a heat-transfer text logo, the <a href="/product/nexure-co-core-icon-100-cotton-jersey-regular-fit-t-shirt" rel="noopener noreferrer">Core Icon Regular Fit Tee</a> has its triple-wave icon printed on the chest, and the <a href="/product/nexureco-essential-100-cotton-jersey-embroidered-logo-t-shirt" rel="noopener noreferrer">Essential Embroidered Logo Tee</a> has a stitched centre-chest logo.</p>
<table>
<thead><tr><th>Care step</th><th>Printed and heat-transfer logos</th><th>Embroidered logos</th></tr></thead>
<tbody>
<tr><td>Washing</td><td>Inside out, cold water, gentle cycle</td><td>Inside out, gentle cycle, away from zips and hooks that can snag threads</td></tr>
<tr><td>Drying</td><td>Line dry inside out, out of direct sun</td><td>Dry flat or on a line, smoothing the embroidery while damp</td></tr>
<tr><td>Ironing</td><td>Never iron directly on the print; iron inside out on low</td><td>Iron from the reverse with a towel underneath to protect the stitching</td></tr>
<tr><td>Watch for</td><td>Cracking or peeling from heat and harsh scrubbing</td><td>Puckering if the tee is stretched or wrung</td></tr>
</tbody>
</table>
<p>Embroidery will not fade or peel the way a print can, which makes it a good choice if you wash your tees often. Printed logos simply need you to keep heat and friction away from them.</p>
<h2>Drying in Pakistan''s Sun</h2>
<p>A rooftop washing line in May dries a tee very quickly, but strong direct sun also bleaches dark colours surprisingly fast. Dry tees inside out, in the shade or indirect light where possible, and bring them in as soon as they are dry.</p>
<ul>
<li>Hang tees by the hem or fold them over the line at the waist. Pegging by the shoulders leaves bumps and stretches the neckline.</li>
<li>For the gentlest option, dry flat on a clean towel indoors.</li>
<li>During the monsoon, humidity slows drying. Dry indoors under a fan, and never fold a tee that still feels slightly damp, or it will smell musty. Our guide to the <a href="/blog/best-t-shirt-fabric-summer-pakistan" rel="noopener noreferrer">best T-shirt fabric for summer</a> has more tips for the humid months.</li>
</ul>
<h2>Ironing and Storage</h2>
<p>Cotton jersey irons well on a medium setting. Turn the tee inside out, keep the iron moving, and never press directly on a print. If you would rather skip ironing, hang tees straight after washing and smooth them by hand, and most creases will drop out as they dry.</p>
<p>For storage, folding beats hanging. Over time, hangers stretch the shoulders and neckline of knitted fabrics. If you do hang tees, use wide hangers and slide them in from the hem, not through the neck. Keep cupboards dry during the monsoon and make sure everything is fully dry before it goes in.</p>
<h2>Quick Dos and Don''ts</h2>
<ul>
<li><strong>Do</strong> wash inside out in cold water with similar colours.</li>
<li><strong>Do</strong> air dry in the shade and reshape while damp.</li>
<li><strong>Do</strong> fold tees rather than leaving them on hangers for months.</li>
<li><strong>Don''t</strong> wash in hot water or tumble dry on high heat.</li>
<li><strong>Don''t</strong> iron directly over printed logos.</li>
<li><strong>Don''t</strong> leave sweaty tees in the laundry basket for days.</li>
</ul>
<h2>FAQ</h2>
<h3>How often should I wash a cotton T-shirt?</h3>
<p>In summer, after every wear, because sweat breaks down fabric and causes odour. In cooler months, a tee worn briefly can be aired and worn again before washing.</p>
<h3>Can I wash cotton T-shirts in hot water?</h3>
<p>It is best avoided. Hot water increases shrinking and fading, and cold or cool water cleans everyday wear perfectly well.</p>
<h3>Will a cotton tee shrink in the first wash?</h3>
<p>Cotton can shrink slightly when exposed to heat. Washing cold and air drying keeps any change to a minimum.</p>
<h3>How do I remove sweat marks from a light tee?</h3>
<p>Treat them early. Soak the area in cool water with a little detergent, rub gently and wash as normal. Older yellow marks are much harder to shift.</p>
<p>Looking after your tees properly is the cheapest wardrobe upgrade there is. When it is time for something new, browse our <a href="/collections/new-arrivals" rel="noopener noreferrer">New Arrivals</a>.</p>', '/uploads/products/baba899e78bc43fead36e1f024e580fb.avif', 'Close-up of the embroidered logo on a heather grey cotton jersey T-shirt', 'Fabric & Care', 'Nexure CO', 6, 1, 0, 'How to Wash Cotton T-Shirts Properly', 'Follow our guide on how to wash cotton t-shirts to stop shrinking and fading, keep blacks dark and cream bright, and protect printed and embroidered logos.', UTC_TIMESTAMP() - INTERVAL 15 MINUTE, UTC_TIMESTAMP() - INTERVAL 15 MINUTE, UTC_TIMESTAMP() - INTERVAL 15 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 5. Best T-Shirt Fabric for Summer in Pakistan: Why 100% Cotton Wins
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('Best T-Shirt Fabric for Summer in Pakistan: Why 100% Cotton Wins', 'best-t-shirt-fabric-summer-pakistan', 'Why 100% cotton beats polyester in Lahore''s dry heat and Karachi''s humidity, how fit and colour affect comfort, and practical tips for getting through the monsoon.', '<p>For everyday wear, the best t-shirt fabric for summer in Pakistan is 100% cotton. It breathes, absorbs sweat instead of trapping it against your skin, and still feels soft at the end of a long, sticky day. Synthetics have their place at the gym, but for university, office casual and evenings out, cotton is the most comfortable choice in our heat.</p>
<h2>Why Cotton Is the Best T-Shirt Fabric for Summer in Pakistan</h2>
<p>Pakistanis have trusted cotton in summer for generations. The lawn and cotton kurtas and shalwar kameez that take over wardrobes every spring are cotton-based for exactly the same reasons a good summer tee should be.</p>
<ul>
<li><strong>Breathability:</strong> cotton is a natural fibre that lets air pass through, so body heat can escape rather than building up.</li>
<li><strong>Absorbency:</strong> it soaks up sweat, and as that moisture evaporates it helps you feel cooler.</li>
<li><strong>Softness:</strong> cotton jersey feels gentle on skin, which matters when heat rash and prickly heat flare up.</li>
<li><strong>Less odour build-up:</strong> natural fibres generally hold on to smells less than many synthetics, which is welcome on a long day.</li>
<li><strong>Easy care:</strong> it washes well at home and comes out fresh, as long as you avoid hot water and high heat.</li>
</ul>
<h2>Dry Heat vs Humid Heat: How Cotton Copes</h2>
<p>Summer is not the same everywhere in Pakistan, and cotton behaves a little differently in each kind of heat.</p>
<h3>Dry heat in Lahore, Multan and Islamabad</h3>
<p>In dry heat, cotton is at its best. It absorbs sweat and lets it evaporate quickly, which is your body''s natural cooling system working as intended. A loose cotton tee on a dry June afternoon feels noticeably cooler than a synthetic one.</p>
<h3>Humid heat in Karachi and during the monsoon</h3>
<p>Humidity is cotton''s tougher test. Because the air is already full of moisture, sweat evaporates slowly, and a cotton tee can feel damp after a long commute. That is not a reason to switch fabrics, since synthetics often feel clammier in humid air, but it is a good reason to choose a looser fit and carry a spare tee on long days.</p>
<h2>Cotton vs Polyester vs Blends</h2>
<p>Here is an honest comparison of the three fabrics you will see most often in shops and online.</p>
<table>
<thead><tr><th>Fabric</th><th>Breathability</th><th>Sweat handling</th><th>Feel in the heat</th><th>Best for</th></tr></thead>
<tbody>
<tr><td>100% cotton</td><td>High</td><td>Absorbs sweat, dries more slowly</td><td>Soft, cool and natural</td><td>Daily wear, university, office casual, evenings</td></tr>
<tr><td>Polyester</td><td>Lower</td><td>Wicks sweat away and dries fast</td><td>Can feel clammy and hold odour</td><td>Gym sessions and sport</td></tr>
<tr><td>Cotton-polyester blend</td><td>Moderate</td><td>Somewhere in between</td><td>Smoother, less natural feel</td><td>Travel and budget basics</td></tr>
</tbody>
</table>
<p>Polyester''s quick-drying quality is genuinely useful for a cricket match or a gym session. For everything else in your day, cotton is the more comfortable fabric.</p>
<h2>How to Check What a T-Shirt Is Made Of</h2>
<p>Many tees look alike on a hanger or a product photo, so it pays to check before you buy.</p>
<ul>
<li><strong>Read the composition label:</strong> it is usually sewn into the side seam or printed at the back of the neck. "100% cotton" means exactly that, while a blend lists two fibres with percentages.</li>
<li><strong>Check the product page:</strong> a reliable online store states the fabric clearly in the description.</li>
<li><strong>Trust your hand:</strong> cotton feels soft and slightly matte, while polyester often feels slick, a little shiny and cooler to the touch at first.</li>
<li><strong>Notice how it behaves:</strong> after a hot afternoon, a synthetic tee tends to cling, while cotton feels damp but still breathes.</li>
</ul>
<h2>Fit Matters as Much as Fabric</h2>
<p>Even the best fabric struggles if it is clinging to you. Air needs space to circulate between the tee and your skin, so a tight tee will stick in humid weather no matter what it is made from.</p>
<ul>
<li>An oversized cut, like the <a href="/product/nexure-co-essential-oversized-100-cotton-jersey-t-shirt" rel="noopener noreferrer">Essential Oversized Tee</a>, gives the most airflow thanks to its relaxed body and dropped shoulders.</li>
<li>A regular fit with a little ease, such as the <a href="/product/nexure-co-essential-100-cotton-jersey-regular-fit-t-shirt" rel="noopener noreferrer">Essential Regular Fit Tee</a>, looks neater for work while still letting air move.</li>
<li>Avoid sizing down for a muscle-fit look in peak summer. That extra snugness is exactly where sweat patches start.</li>
</ul>
<h2>Choosing Colours for the Heat</h2>
<p>Colour affects how hot a tee feels in direct sun. Lighter colours reflect more sunlight, while darker colours absorb more of it.</p>
<ul>
<li><strong>Cream and Heather Grey:</strong> cooler in the midday sun. Heather Grey does show sweat patches, so it suits shorter outings and air-conditioned spaces best.</li>
<li><strong>Royal Blue and Red:</strong> mid-tones that sit in between, and they hide light sweat better than grey.</li>
<li><strong>Black:</strong> warmest in direct sun but excellent at hiding sweat. Save it for evenings, indoor plans and the after-dinner chai run.</li>
</ul>
<h2>Monsoon Tips for Cotton Tees</h2>
<p>July and August bring relief from the worst of the heat, but they bring sticky air and slow-drying laundry too.</p>
<ul>
<li>Keep a spare tee in your bag on humid days. Changing after the commute makes a real difference.</li>
<li>Wash sweaty tees within a day instead of leaving them in a damp laundry basket.</li>
<li>Dry tees indoors under a fan when it is raining, and make sure they are completely dry before folding.</li>
<li>Rotate more tees through the season, since drying takes longer and you will change more often.</li>
<li>Wash in cold water and skip the tumble dryer to stop cotton shrinking. Our guide on <a href="/blog/how-to-wash-cotton-t-shirts" rel="noopener noreferrer">how to wash cotton T-shirts</a> covers the full routine.</li>
</ul>
<h2>FAQ</h2>
<h3>Is cotton better than polyester for summer?</h3>
<p>For everyday wear, yes. Cotton breathes better and feels softer. Polyester is the better pick for intense sport, where fast drying matters most.</p>
<h3>Does 100% cotton feel hot in humid weather?</h3>
<p>It can feel damp when sweat cannot evaporate, but it is usually more comfortable than synthetics. A looser fit and a spare tee help a lot.</p>
<h3>What colour T-shirt is coolest in the sun?</h3>
<p>Lighter colours such as Cream and Heather Grey stay cooler in direct sunlight than Black.</p>
<h3>How many T-shirts do I need for summer?</h3>
<p>Enough to change daily, with a few spare while others dry. Our guide to the <a href="/blog/basic-t-shirts-every-man-needs" rel="noopener noreferrer">basic T-shirts every man needs</a> suggests a sensible number.</p>
<p>Ready for the heat? Every tee in our <a href="/collections/best-sellers" rel="noopener noreferrer">Best Sellers</a> is made from 100% cotton jersey, so you can pick your fit and colour knowing the fabric is right.</p>', '/uploads/products/6c2b2291fcc745b7a73c4ca997a3f3ed.avif', 'Cream cotton T-shirt with a small embroidered chest logo', 'Fabric & Care', 'Nexure CO', 6, 1, 0, 'Best T-Shirt Fabric for Pakistan Summer', 'Find the best t-shirt fabric for summer in Pakistan. See why 100% cotton beats polyester in heat and humidity, plus fit, colour and monsoon tips.', UTC_TIMESTAMP() - INTERVAL 20 MINUTE, UTC_TIMESTAMP() - INTERVAL 20 MINUTE, UTC_TIMESTAMP() - INTERVAL 20 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 6. T-Shirt Colour Combinations for Men: What to Wear With Each Shade
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('T-Shirt Colour Combinations for Men: What to Wear With Each Shade', 't-shirt-colour-combinations-men', 'What to wear with black, red, royal blue, heather grey and cream T-shirts, with a quick pairing table for trousers and shoes, plus simple pointers for every skin tone.', '<p>The easiest t-shirt colour combinations for men pair one coloured tee with neutral trousers and simple shoes. Black works with blue denim, beige chinos and olive cargos; Red with dark denim, black or grey; Royal Blue with white, stone, grey or black; Heather Grey with almost anything; and Cream with olive, navy, brown or dark denim. Start there and you will rarely get it wrong.</p>
<h2>The Simple Rule Behind T-Shirt Colour Combinations for Men</h2>
<p>Most good outfits have one hero colour and let everything else stay quiet. If your tee is the bright piece, keep your trousers and shoes neutral. If your tee is neutral, you have more freedom below the waist.</p>
<p>The neutrals that do most of the work in a Pakistani wardrobe are:</p>
<ul>
<li>Blue denim, from light wash to dark indigo</li>
<li>Black jeans or trousers</li>
<li>Beige, khaki and stone chinos</li>
<li>Olive cargos or chinos</li>
<li>Navy and grey trousers or joggers</li>
<li>White trainers, which go with every combination in this guide</li>
</ul>
<p>You can either contrast, with a bright tee over neutral trousers, or go tonal, with shades of the same colour from top to bottom. Contrast is easier for everyday wear, while tonal looks sharper when you get it right.</p>
<h2>Black T-Shirt</h2>
<p>Black is the most versatile tee you can own. It looks a notch smarter than lighter colours, has a slimming effect and hides sweat on a humid evening.</p>
<ul>
<li><strong>Pair with:</strong> any wash of blue jeans, beige chinos, olive cargos, grey joggers, or black jeans for an all-black look.</li>
<li><strong>Shoes:</strong> white trainers, black boots or loafers.</li>
<li><strong>Best for:</strong> evenings out, cinema trips and dholkis under an open overshirt.</li>
</ul>
<h2>Red T-Shirt</h2>
<p>Red is a statement, so let it be the only bright thing you wear. It looks confident against dark, simple bottoms.</p>
<ul>
<li><strong>Pair with:</strong> dark indigo jeans, black jeans, charcoal trousers or khaki chinos.</li>
<li><strong>Shoes:</strong> white or black trainers.</li>
<li><strong>Avoid:</strong> other bright colours such as orange, green or yellow in the same outfit.</li>
</ul>
<h2>Royal Blue T-Shirt</h2>
<p>Royal Blue is bright without being loud, and it is one of the easiest colours to wear through a Pakistani summer.</p>
<ul>
<li><strong>Pair with:</strong> white or stone chinos, grey joggers, black jeans or beige shorts.</li>
<li><strong>Blue on blue:</strong> it works with light-wash denim, as long as there is a clear contrast between the two shades.</li>
<li><strong>Shoes:</strong> white or grey trainers.</li>
</ul>
<h2>Heather Grey T-Shirt</h2>
<p>Heather Grey is the quiet all-rounder. Its soft, mixed tone works with almost every trouser colour and layers neatly under denim jackets and overshirts.</p>
<ul>
<li><strong>Pair with:</strong> navy chinos, black jeans, olive cargos or any shade of denim.</li>
<li><strong>Shoes:</strong> almost anything, from white trainers to brown loafers.</li>
<li><strong>Watch out for:</strong> sweat patches in peak summer. Wear it in the evening or in air-conditioned spaces when it is very hot.</li>
</ul>
<h2>Cream T-Shirt</h2>
<p>Cream is softer and warmer than stark white, and it looks especially good with earthy tones. It is a lovely choice for a relaxed Eid afternoon or a summer dinner with friends.</p>
<ul>
<li><strong>Pair with:</strong> olive chinos, brown or tan trousers, navy, or dark denim.</li>
<li><strong>Shoes:</strong> brown loafers, tan sandals or white trainers.</li>
<li><strong>Where to find it:</strong> the <a href="/product/nexureco-essential-100-cotton-jersey-embroidered-logo-t-shirt" rel="noopener noreferrer">Essential Embroidered Logo Tee</a> comes in Cream, with a stitched chest logo that keeps it looking neat wash after wash.</li>
</ul>
<h2>Colour Pairing Cheat Sheet</h2>
<p>Save this table for those mornings when you are standing in front of the cupboard with five minutes to spare.</p>
<table>
<thead><tr><th>Tee colour</th><th>Trousers</th><th>Shoes</th><th>Skip</th></tr></thead>
<tbody>
<tr><td>Black</td><td>Blue or black jeans, beige chinos, olive cargos</td><td>White trainers, black boots, loafers</td><td>Faded black trousers next to a deep black tee</td></tr>
<tr><td>Red</td><td>Dark denim, black jeans, khaki or charcoal</td><td>White or black trainers</td><td>Other bright colours</td></tr>
<tr><td>Royal Blue</td><td>White or stone chinos, grey joggers, black jeans, light denim</td><td>White or grey trainers</td><td>Blues so close in shade they look like a near miss</td></tr>
<tr><td>Heather Grey</td><td>Navy, black, olive, any denim</td><td>Almost any</td><td>Grey trousers in exactly the same tone</td></tr>
<tr><td>Cream</td><td>Olive, brown, navy, dark denim</td><td>Brown loafers, tan sandals, white trainers</td><td>White trousers, which wash the look out</td></tr>
</tbody>
</table>
<h2>Colours by Occasion</h2>
<p>The same five shades can cover most of your week if you match them to the plan.</p>
<ul>
<li><strong>University and errands:</strong> anything goes, but Heather Grey and Royal Blue are the easiest to throw on with jeans.</li>
<li><strong>Office casual:</strong> Black, Heather Grey or Cream with chinos look the most polished.</li>
<li><strong>Dholkis and family dinners:</strong> Black or Cream under an open overshirt feels relaxed but respectful of the occasion.</li>
<li><strong>Eid afternoons with friends:</strong> Cream or Royal Blue with clean chinos and loafers looks fresh in the heat.</li>
<li><strong>Evening chai or a night out:</strong> Black or Red with dark denim always works.</li>
</ul>
<h2>Choosing Colours for Your Skin Tone</h2>
<p>Pakistan has a wonderfully wide range of skin tones, and every one of them can wear every colour in this guide. If you want a starting point, think about contrast and undertone rather than strict rules.</p>
<ul>
<li><strong>Contrast:</strong> deeper skin tones often look striking in Cream, Royal Blue and Red, while lighter skin tones get a sharp frame from Black and Royal Blue.</li>
<li><strong>Undertone:</strong> if gold jewellery suits you, you probably have warm undertones, and Cream and Red tend to look great. If silver suits you better, Royal Blue and Heather Grey are reliable picks.</li>
<li><strong>Universal options:</strong> Black and Heather Grey work for virtually everyone.</li>
</ul>
<p>Treat this as guidance, not a rulebook. The colour you feel most confident in is usually the one that looks best on you.</p>
<h2>FAQ</h2>
<h3>What colour T-shirt goes with black jeans?</h3>
<p>Almost any. Red, Royal Blue, Heather Grey and Cream all contrast well, and a Black tee gives you a clean monochrome look.</p>
<h3>What colour T-shirt goes with beige chinos?</h3>
<p>Black, Royal Blue and Red stand out best. Heather Grey also works for a softer, low-key combination.</p>
<h3>Which T-shirt colours should I buy first?</h3>
<p>Start with Black and Heather Grey, then add one colour. Our guide to the <a href="/blog/basic-t-shirts-every-man-needs" rel="noopener noreferrer">basic T-shirts every man needs</a> explains the order.</p>
<h3>Are bright T-shirts okay for the office?</h3>
<p>On casual days, yes. Pair Royal Blue or Red with neutral chinos and smart shoes to keep it polished.</p>
<p>Found your colours? The <a href="/product/nexure-co-core-icon-100-cotton-jersey-regular-fit-t-shirt" rel="noopener noreferrer">Core Icon Regular Fit Tee</a> comes in Black, Red, Royal Blue and Heather Grey, or you can browse every shade across our <a href="/category/men" rel="noopener noreferrer">men''s T-shirts</a>.</p>', '/uploads/media/70726188f4f24a2b8b4ee3abd50862d2.avif', 'Three models in black, red and royal blue Nexure CO T-shirts', 'Style Guide', 'Nexure CO', 6, 1, 1, 'T-Shirt Colour Combinations for Men', 'Explore t-shirt colour combinations for men: what to wear with black, red, royal blue, heather grey and cream tees, with a quick pairing table.', UTC_TIMESTAMP() - INTERVAL 25 MINUTE, UTC_TIMESTAMP() - INTERVAL 25 MINUTE, UTC_TIMESTAMP() - INTERVAL 25 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 7. Basic T-Shirts Every Man Needs: Build a Simple Capsule Wardrobe
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('Basic T-Shirts Every Man Needs: Build a Simple Capsule Wardrobe', 'basic-t-shirts-every-man-needs', 'You need fewer tees than you think. Which colours and fits to buy first, how to mix oversized and regular, and a ready-made week of outfits from a small T-shirt capsule.', '<p>A useful wardrobe does not need dozens of tees. The basic t-shirts every man needs come down to five to eight well-fitting pieces in colours that work together: Black, Heather Grey, one bright such as Royal Blue or Red, and a soft light shade like Cream, split between regular and oversized fits. Add a few pairs of neutral trousers and you can dress for a full week without thinking about it.</p>
<h2>What a T-Shirt Capsule Wardrobe Actually Is</h2>
<p>A capsule wardrobe is a small set of clothes that all work with each other. Instead of a cupboard stuffed with tees you never reach for, you own fewer pieces that you actually wear, and any tee goes with any pair of trousers.</p>
<p>It makes particular sense in Pakistan, where a T-shirt is wearable for most of the year: on its own through the long summer, and under an overshirt or jacket during the short winter.</p>
<h2>How Many T-Shirts Do You Actually Need?</h2>
<ul>
<li><strong>Five:</strong> the minimum for a working or university week, if you do laundry twice a week.</li>
<li><strong>Seven to eight:</strong> the comfortable number for summer, when you may change after a sweaty commute and monsoon humidity slows drying.</li>
<li><strong>More than ten:</strong> only if you genuinely wear them all. Beyond that point, most men keep reaching for the same favourites anyway.</li>
</ul>
<p>The aim is a rotation in which every tee gets worn regularly. That also spreads the wear evenly, so no single favourite fades long before the rest.</p>
<h2>The Basic T-Shirts Every Man Needs, in Order</h2>
<p>If you are starting from scratch, buy in this order. Each addition multiplies the outfits you can put together.</p>
<ol>
<li><strong>A Black regular fit tee.</strong> The foundation, because it works with every trouser you own. The <a href="/product/nexure-co-core-icon-100-cotton-jersey-regular-fit-t-shirt" rel="noopener noreferrer">Core Icon Regular Fit Tee</a> in Black, with its triple-wave chest icon, is a strong first pick.</li>
<li><strong>A Heather Grey tee.</strong> The easy neutral for weekends, and the best layer under a denim jacket in winter.</li>
<li><strong>A smarter tee with a small logo.</strong> For office-casual days and family dinners, the <a href="/product/nexureco-essential-100-cotton-jersey-embroidered-logo-t-shirt" rel="noopener noreferrer">Essential Embroidered Logo Tee</a> has a tailored modern cut and an embroidered chest logo that will not fade or peel like a print. Cream is the most useful colour here.</li>
<li><strong>A Black oversized tee.</strong> Most men wear Black more than anything else, so a second one in a different fit earns its place. The <a href="/product/nexure-co-essential-oversized-100-cotton-jersey-t-shirt" rel="noopener noreferrer">Essential Oversized Tee</a> brings a relaxed, streetwear shape for university, travel and weekends.</li>
<li><strong>A Royal Blue tee.</strong> One bright colour adds life to the rotation without making anything harder to match.</li>
<li><strong>A Red tee.</strong> Once the rest are in place, Red gives you a confident option for evenings out.</li>
</ol>
<h2>Mixing Oversized and Regular Fits</h2>
<p>A sensible split for most men is roughly two-thirds regular fit and one-third oversized. If you work in an office, lean towards regular fits, which look neater under blazers and overshirts. If you are a student or work somewhere relaxed, you might flip that ratio.</p>
<p>The key is that both fits should work with the same trousers. Straight jeans and chinos suit both, while cargos and joggers lean more towards oversized tees. Not sure which shape you prefer? Our <a href="/blog/oversized-vs-regular-fit-t-shirt" rel="noopener noreferrer">oversized vs regular fit guide</a> breaks it down.</p>
<h2>Trousers and Shoes to Build Around</h2>
<p>Your tees only form a capsule if the rest of the wardrobe plays along. A small, neutral base is enough:</p>
<ul>
<li>Mid-blue straight jeans</li>
<li>Dark indigo jeans</li>
<li>Black jeans</li>
<li>Beige or stone chinos</li>
<li>Olive cargos and grey joggers</li>
<li>Chino shorts for peak summer</li>
<li>White trainers, one smarter shoe such as loafers, and slides for the heat</li>
</ul>
<h2>A Week of Outfits From a Small Capsule</h2>
<p>Here is how the six tees above and that neutral base cover a typical week, without wearing the same outfit twice.</p>
<table>
<thead><tr><th>Day</th><th>Tee</th><th>Bottoms</th><th>Shoes</th><th>Plan</th></tr></thead>
<tbody>
<tr><td>Monday</td><td>Black regular fit</td><td>Beige chinos</td><td>Loafers</td><td>Office casual</td></tr>
<tr><td>Tuesday</td><td>Heather Grey</td><td>Mid-blue straight jeans</td><td>White trainers</td><td>University or a long workday</td></tr>
<tr><td>Wednesday</td><td>Cream embroidered logo</td><td>Dark indigo jeans</td><td>Loafers</td><td>Lunch meeting or dinner out</td></tr>
<tr><td>Thursday</td><td>Royal Blue</td><td>Black jeans</td><td>White trainers</td><td>Chai with friends after work</td></tr>
<tr><td>Friday</td><td>Black oversized</td><td>Olive cargos</td><td>White trainers</td><td>Start of the weekend</td></tr>
<tr><td>Saturday</td><td>Heather Grey</td><td>Chino shorts</td><td>Slides</td><td>Errands in the heat</td></tr>
<tr><td>Sunday</td><td>Red</td><td>Grey joggers</td><td>White trainers</td><td>Family lunch and a lazy evening</td></tr>
</tbody>
</table>
<h2>Taking the Capsule Into Winter</h2>
<p>Lahore and Islamabad winters are short but chilly, and there is no need to pack your tees away. They simply become the base layer.</p>
<ul>
<li>Black and Heather Grey regular fit tees sit neatly under overshirts, sweaters and denim jackets without adding bulk.</li>
<li>The oversized tee works over a fitted long-sleeve top on cold mornings, or under a roomy jacket.</li>
<li>Cream under a brown or navy jacket is a warm, easy pairing for daytime family visits and relaxed wedding-season gatherings at home.</li>
<li>Keep the brighter Royal Blue and Red tees for sunny winter afternoons, when one layer is often enough.</li>
</ul>
<h2>Buying Smart</h2>
<p>Build the core first, then add colour. Every tee is currently Rs. 1,320, down from Rs. 2,199, and any 3 tees together cost Rs. 3,500 instead of Rs. 3,960, with the discount applied automatically in your bag. That makes the first three pieces of a capsule an easy single order.</p>
<p>Once they arrive, look after them so the capsule lasts: wash inside out in cold water, dry in the shade and fold rather than hang.</p>
<h2>FAQ</h2>
<h3>How many T-shirts should a man own?</h3>
<p>Five is a workable minimum, and seven to eight is comfortable for a Pakistani summer. Beyond that, only buy what you will genuinely wear.</p>
<h3>What colour T-shirts should I buy first?</h3>
<p>Black and Heather Grey, because they go with everything. Add Cream, Royal Blue or Red once the neutrals are covered.</p>
<h3>Should basic T-shirts be plain or have a logo?</h3>
<p>A small chest logo keeps a tee versatile enough for smarter days. Save bigger graphics for weekend outfits.</p>
<h3>When should I replace a T-shirt?</h3>
<p>When the neckline has stretched, the colour has faded noticeably or the fabric has lost its shape. Good washing habits push that day much further away.</p>
<p>Start your capsule with our <a href="/collections/best-sellers" rel="noopener noreferrer">Best Sellers</a>, then fill the gaps one colour at a time.</p>', '/uploads/products/b25a4c544de145238370c3324d5359a0.avif', 'Model in a black regular fit T-shirt with the triple-wave icon on the chest', 'Style Guide', 'Nexure CO', 6, 1, 0, 'Basic T-Shirts Every Man Needs', 'Discover the basic t-shirts every man needs, which colours and fits to buy first, and how to turn six tees into a full week of easy, mix-and-match outfits.', UTC_TIMESTAMP() - INTERVAL 30 MINUTE, UTC_TIMESTAMP() - INTERVAL 30 MINUTE, UTC_TIMESTAMP() - INTERVAL 30 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- 8. Cash on Delivery Clothes Online in Pakistan: A Smart Buyer's Guide
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image_url, cover_image_alt, category, author_name, reading_minutes, is_published, is_featured, meta_title, meta_description, published_at, created_at, updated_at)
VALUES ('Cash on Delivery Clothes Online in Pakistan: A Smart Buyer''s Guide', 'cash-on-delivery-clothes-online-pakistan', 'How cash on delivery works in Pakistan, what the WhatsApp confirmation is for, delivery times and costs, free shipping, returns and exchanges, and the mistakes to avoid.', '<p>Buying clothes online in Pakistan with cash on delivery comes down to three steps: you place your order, confirm it when the store gets in touch, and pay in cash only when the parcel reaches your door. The smart part is everything around those steps, from choosing the right size to knowing the delivery cost and return policy before you need them.</p>
<h2>How Cash on Delivery Works, Step by Step</h2>
<ol>
<li><strong>Choose your items.</strong> Pick the product, colour and size, then add it to your bag.</li>
<li><strong>Check out.</strong> Enter your full name, complete address and a phone number you will actually answer. With Cash on Delivery, there is nothing to pay at this stage.</li>
<li><strong>Confirm your order.</strong> You may receive a WhatsApp message asking you to confirm. A quick reply keeps things moving.</li>
<li><strong>Track it.</strong> Follow your parcel''s progress on the <a href="/track-order" rel="noopener noreferrer">Track Order</a> page.</li>
<li><strong>Pay on arrival.</strong> When the parcel arrives, you pay the amount due in cash. Keeping the exact amount ready makes the handover quick.</li>
</ol>
<h2>Why Cash on Delivery Makes Sense for Buying Clothes Online in Pakistan</h2>
<p>COD is popular for a simple reason: you do not pay a rupee until the parcel is in your hands. There are no card details to enter and no bank transfer to arrange, which suits anyone without a card or who simply prefers cash.</p>
<p>It works just as well for the rest of the family. You can order for a brother, a cousin or your father in one go, and pay once when everything arrives at your door.</p>
<h2>Choosing the Right Size Without Trying It On</h2>
<p>Getting the size right first time is the best way to avoid returns. A few minutes of preparation goes a long way.</p>
<ul>
<li>Measure your chest, shoulders and length with a soft tape, then compare them with our <a href="/size-guide" rel="noopener noreferrer">size guide</a>.</li>
<li>Check the fit type. A regular fit follows the chart, while an oversized tee is designed to be roomy, so take your usual size.</li>
<li>If you are between sizes, size up for a relaxed fit or down for a slim fit.</li>
<li>Compare against a tee you already own and love. It is the most reliable reference you have.</li>
</ul>
<p>Our <a href="/blog/mens-t-shirt-size-chart-pakistan" rel="noopener noreferrer">step-by-step measuring guide</a> walks through the whole process in detail.</p>
<h2>The WhatsApp Confirmation Explained</h2>
<p>After you order, you may get a WhatsApp message asking you to confirm. It is a quick check that the order is genuine and that your address and phone number are correct.</p>
<ul>
<li>Reply as soon as you can, since confirming quickly helps your order get moving.</li>
<li>Use the chat to fix anything you got wrong, such as a missing house number or landmark.</li>
<li>Our number is +92 316 7936302. If you ever receive a message claiming to be from us that asks for card details, bank details or a one-time code, do not share anything. A COD order never needs them.</li>
</ul>
<h2>Delivery Times and Costs</h2>
<p>Here is what to expect once your order is confirmed.</p>
<table>
<thead><tr><th>Detail</th><th>What to expect</th></tr></thead>
<tbody>
<tr><td>Coverage</td><td>Nationwide across Pakistan</td></tr>
<tr><td>Standard delivery</td><td>3-5 business days</td></tr>
<tr><td>Delivery charge</td><td>Rs. 200</td></tr>
<tr><td>Free shipping</td><td>On orders of Rs. 5,000 or more</td></tr>
<tr><td>Payment</td><td>Cash on Delivery, paid when the parcel arrives</td></tr>
<tr><td>Busy periods</td><td>Delivery can take longer during sales and public holidays</td></tr>
</tbody>
</table>
<p>If you are shopping for Eid, order early. Deliveries can slow down around public holidays, and the days just before Eid are usually the busiest of all. Ordering for the whole family in one go can also take you past the Rs. 5,000 free-shipping threshold.</p>
<h2>What to Check When Your Parcel Arrives</h2>
<p>A few seconds of checking at the door saves a lot of back and forth later.</p>
<ul>
<li>Make sure the parcel is addressed to you and the packaging looks intact.</li>
<li>Once it is open, check that the product, colour and size match your order.</li>
<li>Try the tee on the same day while the return window is fresh.</li>
<li>If anything is wrong, contact support straight away with your order number and a photo.</li>
</ul>
<h2>Returns and Exchanges</h2>
<p>A clear return policy is what makes buying clothes without trying them on feel safe. Ours works like this:</p>
<ul>
<li>You have <strong>7 days from the date of delivery</strong> to request a return.</li>
<li>Items must be <strong>unworn, unwashed and in their original packaging</strong>.</li>
<li><strong>Exchanges</strong> are available for a different size or colour, subject to availability.</li>
<li><strong>Refunds</strong> take 5-7 business days after the return is received.</li>
</ul>
<p>Practical tip: try your tee on as soon as it arrives, over a thin vest, and keep the packaging until you are sure. Washing it before checking the fit rules out a return. Full details are on our <a href="/page/shipping" rel="noopener noreferrer">Shipping &amp; Returns</a> page.</p>
<h2>Tracking and Support</h2>
<p>Keep your order number handy and check progress any time on the Track Order page. If something looks wrong, our Lahore team on Ferozepur Road is available Monday to Saturday, 10am to 8pm PKT, on WhatsApp or phone at +92 316 7936302, or by email at support@nexureco.com.</p>
<h2>Common Mistakes to Avoid</h2>
<ul>
<li><strong>An incomplete address.</strong> Add your house number, street, area and a nearby landmark such as a mosque, school or market.</li>
<li><strong>A phone you do not answer.</strong> Couriers often call before delivering, so use a number you keep with you.</li>
<li><strong>Ignoring the WhatsApp confirmation.</strong> It only takes a moment to reply.</li>
<li><strong>Guessing your size.</strong> Measure first, especially when you are trying a new fit.</li>
<li><strong>Washing before trying on.</strong> It rules out a return or exchange.</li>
<li><strong>Ordering at the last minute.</strong> Allow 3-5 business days, plus extra time around sales and holidays.</li>
</ul>
<h2>FAQ</h2>
<h3>How long does cash on delivery take in Pakistan?</h3>
<p>For our orders, standard delivery takes 3-5 business days nationwide. It can take longer during sales and public holidays.</p>
<h3>Is there a delivery charge on COD orders?</h3>
<p>Standard delivery costs Rs. 200, and shipping is free on orders of Rs. 5,000 or more.</p>
<h3>What if the size does not fit?</h3>
<p>Request an exchange for a different size within 7 days of delivery. The tee must be unworn, unwashed and in its original packaging, and exchanges depend on availability.</p>
<h3>Why did I get a WhatsApp message after ordering?</h3>
<p>It is a confirmation request to check your order details. Reply to confirm and your order can move ahead.</p>
<p>Ready to order? Browse our <a href="/category/men" rel="noopener noreferrer">men''s T-shirts</a>, pick your size and pay when it arrives.</p>', '/uploads/media/d0a5d43952e142ff8a960473d357c669.avif', 'Model in a red Nexure CO T-shirt against a dark red backdrop', 'Shopping Guide', 'Nexure CO', 6, 1, 0, 'Cash on Delivery Clothes Online Guide', 'See how buying clothes online in Pakistan with cash on delivery works: WhatsApp confirmation, delivery times and costs, sizing, returns and tracking.', UTC_TIMESTAMP() - INTERVAL 35 MINUTE, UTC_TIMESTAMP() - INTERVAL 35 MINUTE, UTC_TIMESTAMP() - INTERVAL 35 MINUTE)
ON DUPLICATE KEY UPDATE id = id;

-- Footer: a Blog link at the end of the Company menu (Admin → Menus), once
INSERT INTO menu_items (menu_id, parent_id, title, url, link_type, open_in_new_tab, display_order, is_active)
SELECT m.id, NULL, 'Blog', '/blog', 'custom', 0, COALESCE(MAX(i.display_order), 0) + 1, 1
FROM menus m LEFT JOIN menu_items i ON i.menu_id = m.id
WHERE m.handle = 'footer-company'
  AND NOT EXISTS (SELECT 1 FROM menu_items x WHERE x.menu_id = m.id AND x.url = '/blog')
GROUP BY m.id;

SELECT id, slug, category, is_featured, reading_minutes, published_at FROM blog_posts ORDER BY published_at DESC;
