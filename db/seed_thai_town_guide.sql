-- Transaction to ensure atomic updates
BEGIN;

-- 1. Ensure 'venues' table exists (if not already created)
CREATE TABLE IF NOT EXISTS venues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  neighborhood TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  url TEXT,
  image_url TEXT, -- NEW: Added image_url column
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure image_url column exists (safe migration)
ALTER TABLE venues ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Enable RLS on venues if new
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public venues are viewable by everyone" ON venues;
CREATE POLICY "Public venues are viewable by everyone" ON venues FOR SELECT USING (true);

-- 2. Insert Venues (Using Upsert on name/address if possible, but simplest is to specific IDs or just insert)
-- We will use a temporary table or variables to track IDs for linking.
-- Actually, let's just insert them and capture IDs, or clear old ones if we are treating this as a fresh seed for this guide.
-- For safety, we'll try to insert and use the returned IDs.

-- Let's define the Guide ID first so we can reference it
-- 'A Day in Thai Town' ID from previous seed might be random. Let's find or create it.
DO $$
DECLARE
    v_guide_id UUID;
    v_tabula_id UUID;
    v_friends_id UUID;
    v_lacha_id UUID;
    v_susuru_id UUID;
    v_obet_id UUID;
    v_haru_id UUID;
    v_thai_central_id UUID;
    v_nuad_id UUID;
BEGIN
    -- Get or Create Guide
    INSERT INTO guides (title, slug, description, cover_image, neighborhood, curator_name)
    VALUES (
        'A Day in Thai Town', 
        'thai-town-day', 
        'An immersive journey through one of Los Angeles'' most vibrant neighborhoods. From morning coffee to late-night noodles, experience the sour, sweet, salty, and spicy flavors that define Thai Town.',
        'https://images.unsplash.com/photo-1563603417937-67995c721089?q=80&w=2670&auto=format&fit=crop', -- Placeholder Thai Food / Vibe
        'Thai Town', 
        'Frequent Flyer'
    )
    ON CONFLICT (slug) DO UPDATE SET
        description = EXCLUDED.description,
        cover_image = EXCLUDED.cover_image,
        curator_name = EXCLUDED.curator_name
    RETURNING id INTO v_guide_id;

    -- Clear existing items for this guide to avoid duplicates
    DELETE FROM guide_items WHERE guide_id = v_guide_id;

    -- Insert Venues and capture IDs
    -- 1. Tabula Rasa
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Tabula Rasa', '5125 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1016, -118.3010, 'http://www.tabularasabar.com/', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2670&auto=format&fit=crop')
    ON CONFLICT (name) DO UPDATE SET 
        image_url = EXCLUDED.image_url,
        url = EXCLUDED.url,
        address = EXCLUDED.address
    RETURNING id INTO v_tabula_id;

    -- 2. Friends and Family
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Friends and Family', '5150 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1017, -118.3015, 'http://www.friendsandfamilyla.com/', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=2626&auto=format&fit=crop')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_friends_id;

    -- 3. Lacha Som Tum
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Lacha Som Tum', '5171 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1016, -118.3021, 'http://www.lachasomtum.com/', '/images/guide/papaya-salad.png')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_lacha_id;

    -- 4. Susuru Ramen Bar
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Susuru Ramen Bar', '5179 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1016, -118.3024, NULL, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?q=80&w=2670&auto=format&fit=crop')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_susuru_id;

    -- 5. Obet & Del''s Coffee
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Obet & Del''s Coffee', '5233 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1016, -118.3039, 'https://www.instagram.com/obetanddels', 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2671&auto=format&fit=crop')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_obet_id;

    -- 6. Haru Sushi & Izakaya
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Haru Sushi & Izakaya', '5259 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1016, -118.3045, NULL, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=2670&auto=format&fit=crop')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_haru_id;

    -- 7. Thai Central Cuisine
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Thai Central Cuisine', '5269 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1016, -118.3048, 'http://thaicentralcuisine.com/', '/images/guide/crispy-pork.png')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_thai_central_id;

    -- 8. Nuad Royal Thai Massage
    INSERT INTO venues (name, address, neighborhood, lat, lng, url, image_url)
    VALUES ('Nuad Royal Thai Massage', '5300 Hollywood Blvd, Los Angeles, CA 90027', 'Thai Town', 34.1018, -118.3055, NULL, '/images/guide/thai-massage.png')
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_nuad_id;


    -- Insert Guide Items (Linking)
    INSERT INTO guide_items (guide_id, venue_id, order_index, curator_note) VALUES
    (v_guide_id, v_tabula_id, 1, 'Tabula Rasa doesn’t just serve wine; it serves a specific kind of Eastside permission to relax. The patio is the perfect vantage point for watching the sun dip below the Hollywood sign while sipping a chilled orange wine that tastes like apricots and freedom. Even if you don''t know a skin-contact Pinot Gris from a Kombucha, the staff will guide you without a hint of pretension. It''s the living room you wish you had, but with better glassware.'),
    
    (v_guide_id, v_friends_id, 2, 'If you think you know croissants, Friends & Family is here to gently correct you with their Rye Croissant. It’s nutty, earthy, and shatters into a thousand buttery flakes that you will happily pick off your shirt. This isn''t just a bakery; it''s a morning ritual. The seasonal jams are bright and punchy, and the space feels like a warm hug from a very well-fed aunt.'),
    
    (v_guide_id, v_lacha_id, 3, 'There are spicy papaya salads, and then there is the Tum Lad at Lacha. This isn''t just a meal; it''s a sensory event. The heat builds slowly, a creeping burn that is immediately soothed by the crunch of pork rinds and the tang of lime. It''s unapologetically bold, funky, and loud—exactly what Thai Town is all about. Do not skip the sticky rice; you will need it as a safety raft.'),
    
    (v_guide_id, v_susuru_id, 4, 'In a neighborhood famous for boat noodles, Susuru is a brave and delicious contrarian. The tonkotsu broth here is creamy enough to paint with, yet surprisingly light on the palate. The noodles differ by broth type—a detail that proves they care. It’s the perfect palate cleanser when you need a break from the fish sauce, offering a cozy, steamy bowl of comfort in a sleek, retro-future setting.'),
    
    (v_guide_id, v_obet_id, 5, 'This Filipino-owned coffee shop is the vibrant, caffeine-fueled heart of the block. The Ube Latte—purple as a Prince song and just as smooth—is the order here. It’s sweet, earthy, and photogenic, but more importantly, it actually tastes like good coffee. The space is small, but the energy is big, making it the ideal pit stop to recharge before diving back into the boulevard.'),
    
    (v_guide_id, v_haru_id, 6, 'Hidden in plain sight, Haru is the happy hour champion of the strip. While everyone else is waiting in line for noodles, you can be here, sipping a cold Sapporo and eating crispy takoyaki. It’s unpretentious, reliable, and deeply satisfying. The fish is fresh, the tempura is light, and the vibe is "Tuesday night regular" in the best possible way.'),
    
    (v_guide_id, v_thai_central_id, 7, 'Thai Central is the quiet achiever. It doesn''t have the neon flash of the bigger names, but it has the Crispy Pork. Oh, the Crispy Pork. It’s structurally perfect—crunchy skin, melting fat, tender meat. This is home-style cooking that feels personal. It’s the place you take friends when you want to look like an insider who knows where the *real* food is.'),
    
    (v_guide_id, v_nuad_id, 8, 'After walking, eating, and eating some more, Nuad is the mandatory finale. This isn''t a spa day; it’s a restoration project. The traditional Thai massage here is rigorous, rhythmic, and incredibly effective. You will be stretched, pulled, and pressed until every knot from your stressful week surrenders. You’ll walk out feeling two inches taller and entirely at peace.');

END $$;


COMMIT;
