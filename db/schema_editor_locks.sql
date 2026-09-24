-- Move an editor's decisions out of the metadata blob and into columns.
--
-- Why: metadata is a JSON blob that the scout, the flyer importer and a dozen
-- maintenance scripts all rewrite. editor_locked lived inside it, so any writer
-- that rebuilt the blob — rather than merging into it — silently dropped the
-- lock list. Once the list is gone the scout is behaving correctly when it
-- overwrites a hand-edited title, which makes the damage look like a scout bug
-- when it is really a bookkeeping one.
--
-- Measured before this migration: of 2,890 events only 16 still carried
-- editor_locked, and two FF Picks (Tinlicker, Seun Kuti & Egypt 80) had been
-- reverted to their scraped titles, times, descriptions and venue-shared
-- images twice in ten days.
--
-- pick_note moves for the same reason. It is the one piece of genuinely
-- editorial writing in the row — why *you* picked the event — and it was
-- living in the same blob, unprotected.
--
-- Safe to re-run.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS editor_locked text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pick_note     text,
    ADD COLUMN IF NOT EXISTS pick_noted_at timestamptz;

COMMENT ON COLUMN events.editor_locked IS
    'Field names a human has set by hand. Scrapers must never overwrite these. '
    'A column, not a metadata key, so a writer that rebuilds metadata cannot drop it.';
COMMENT ON COLUMN events.pick_note IS
    'The editor''s own reason for making this an FF Pick. Not the scout''s justification.';

-- Backfill from whatever survives in metadata.
UPDATE events
SET editor_locked = ARRAY(
        SELECT jsonb_array_elements_text(metadata -> 'editor_locked')
    )
WHERE jsonb_typeof(metadata -> 'editor_locked') = 'array'
  AND cardinality(editor_locked) = 0;

UPDATE events
SET pick_note = metadata ->> 'pick_note'
WHERE metadata ? 'pick_note'
  AND nullif(metadata ->> 'pick_note', '') IS NOT NULL
  AND pick_note IS NULL;

UPDATE events
SET pick_noted_at = (metadata ->> 'pick_noted_at')::timestamptz
WHERE metadata ? 'pick_noted_at'
  AND nullif(metadata ->> 'pick_noted_at', '') IS NOT NULL
  AND pick_noted_at IS NULL;

-- Finding a locked event should not mean scanning 2,900 rows.
CREATE INDEX IF NOT EXISTS events_editor_locked_idx
    ON events USING gin (editor_locked);

-- What moved.
SELECT
    count(*) FILTER (WHERE cardinality(editor_locked) > 0) AS events_with_locks,
    count(*) FILTER (WHERE pick_note IS NOT NULL)          AS events_with_pick_notes
FROM events;
