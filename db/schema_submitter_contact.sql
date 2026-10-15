-- Who sent us an event, so you can reply to them.
--
-- The public form collected nothing identifying: title, date, venue, flyer.
-- 14 events arrived that way and there is no way to thank, credit, or ask a
-- follow-up question of any of the people who sent them — including a Boulet
-- Brothers Halloween Ball submitted the same day this was written.
--
-- Columns rather than metadata keys, for the reason editor_locked moved out of
-- that blob a week earlier: metadata is rebuilt wholesale by the scout and a
-- dozen scripts, and anything living there eventually gets dropped by a writer
-- that rebuilds instead of merging.
--
-- These are personal data. Nothing public reads them: getEvents() and
-- getEventById() map metadata into named fields and never spread the row, and
-- these columns are not in that mapping. They are for /admin only.
--
-- Safe to re-run.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS submitter_email     text,
    ADD COLUMN IF NOT EXISTS submitter_instagram text;

COMMENT ON COLUMN events.submitter_email IS
    'Optional contact given by whoever submitted this through /create. Admin-only; never exposed by the public API.';
COMMENT ON COLUMN events.submitter_instagram IS
    'Optional @handle given by the submitter. Admin-only. Lets a credit or tag go in the weekly post.';

-- Finding the submissions that have someone waiting on the other end.
CREATE INDEX IF NOT EXISTS events_submitter_idx
    ON events (created_at DESC)
    WHERE submitter_email IS NOT NULL OR submitter_instagram IS NOT NULL;

SELECT
    count(*) FILTER (WHERE metadata ->> 'source' = 'public_create')              AS public_submissions,
    count(*) FILTER (WHERE submitter_email IS NOT NULL
                        OR submitter_instagram IS NOT NULL)                      AS with_contact
FROM events;
