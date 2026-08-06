-- Phase 2: scout state for change detection.
-- master_scout.py hashes each venue page's text (salted with the scout week
-- window) and skips the Gemini call + event processing when nothing changed
-- since the last run. Cuts API cost when the scout runs on a daily schedule.
-- Run this in the Supabase SQL editor.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS page_hash TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS last_scouted_at TIMESTAMPTZ;
