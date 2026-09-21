-- Phase 3: barren-venue detection.
--
-- A venue URL can rot silently. Lyric Hyperion's /tickets page became a 2023
-- archive and The Echo's /calendar became a "still in sound check" placeholder;
-- both kept returning HTTP 200, both kept passing the thin-text guard, and both
-- produced zero events for seven months. Every run stayed green, because
-- "Gemini answered" and "we got events" are different questions and only the
-- first one was being asked.
--
-- barren_streak counts consecutive scout runs where a venue yielded no events.
-- master_scout.py resets it to 0 on any run that writes an event, and shouts
-- once a venue crosses BARREN_ALARM_RUNS. Run this in the Supabase SQL editor.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS barren_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_event_found_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_venues_barren_streak ON venues(barren_streak DESC);
