-- Create the 'guides' table
CREATE TABLE guides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  neighborhood TEXT,
  curator_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the 'guide_items' table (join table for venues in a guide)
CREATE TABLE guide_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID REFERENCES guides(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  curator_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guide_id, venue_id) -- Optional: prevent duplicates in same guide? Maybe allow multiple stops at same place? Removing unique for flexibility but usually unique is good. Sticking to simple FK.
);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_items ENABLE ROW LEVEL SECURITY;

-- Create Policies (Public Read, Admin Write)
CREATE POLICY "Public guides are viewable by everyone"
  ON guides FOR SELECT
  USING (true);

CREATE POLICY "Public guide_items are viewable by everyone"
  ON guide_items FOR SELECT
  USING (true);

-- Assuming authenticated users can create (or restrict to service role / specific users if needed)
-- For now, allowing all authenticated to insert for 'Creator Studio' usage
CREATE POLICY "Authenticated users can insert guides"
  ON guides FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert guide_items"
  ON guide_items FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Insert some Dummy Data for Development
INSERT INTO guides (title, slug, description, cover_image, neighborhood, curator_name)
VALUES 
('A Day in Thai Town', 'thai-town-day', 'Explore the sights, tastes, and sounds of Los Angeles most authentic neighborhood with this guided culinary and cultural journey.', 'https://images.unsplash.com/photo-1563603417937-67995c721089?q=80&w=2670&auto=format&fit=crop', 'Thai Town', 'Michael P.'),
('Hidden Jazz Bars', 'hidden-jazz', 'The darkest, moodiest, and best sounding rooms in the city.', 'https://images.unsplash.com/photo-1514525253440-b39345208668?q=80&w=2670&auto=format&fit=crop', 'Hollywood', 'Frequent Flyer');
