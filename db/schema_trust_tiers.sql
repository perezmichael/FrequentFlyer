-- Phase 1: trust tiers + curation levels.
-- Events scraped from 'trusted' venues auto-publish when they clear the
-- quality gate in master_scout.py; everything else (standard venues, low
-- vibe scores, user submissions) stays 'pending' for manual review in /admin.
-- Run this in the Supabase SQL editor.

-- Venues: which venues are allowed to skip the approval queue?
ALTER TABLE venues ADD COLUMN IF NOT EXISTS trust_tier TEXT NOT NULL DEFAULT 'standard'
  CHECK (trust_tier IN ('trusted', 'standard'));

-- Events: how did this event reach the feed?
--   'scraped'    scout-ingested, standard rich card
--   'ff_curated' hand-picked "FrequentFlyer Curated", elevated treatment
--   'promoted'   paid/promotional placement, distinct treatment
ALTER TABLE events ADD COLUMN IF NOT EXISTS curation_level TEXT NOT NULL DEFAULT 'scraped'
  CHECK (curation_level IN ('scraped', 'ff_curated', 'promoted'));

-- Link out to the event's own page (dedup aid + "link to the event" in the UI).
-- NOT unique: multi-day events split into rows that share one URL.
ALTER TABLE events ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Audit trail: which events skipped human review, and when they went live.
ALTER TABLE events ADD COLUMN IF NOT EXISTS auto_published BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_source_url ON events(source_url);
CREATE INDEX IF NOT EXISTS idx_events_curation_level ON events(curation_level);
CREATE INDEX IF NOT EXISTS idx_venues_trust_tier ON venues(trust_tier);

-- The venues currently in the table came from services/annex_scout/venues.json,
-- your hand-picked scrape targets, so they start as 'trusted'. Comment this out
-- if you'd rather promote venues one at a time from the Supabase dashboard:
--   UPDATE venues SET trust_tier = 'trusted' WHERE name = 'Benny Boy Brewing';
UPDATE venues SET trust_tier = 'trusted';
