-- Add start/end times to one-off events.
-- Mirrors the start_time/end_time TIME columns on recurring_events.
-- Run this in the Supabase SQL editor.

ALTER TABLE events ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TIME;
