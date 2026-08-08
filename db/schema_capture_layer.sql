-- Capture layer: things worth recording now that are impossible to recover later.
-- Run this in the Supabase SQL editor.
--
-- Two problems this fixes.
--
-- 1. events.talent_id is a single FK, so a bill with four acts collapsed into
--    one talent row holding a comma-joined string —
--    "Michelle Chu, Grace Freud, Rosita Lama Muvdi, Kristi Reed," — which makes
--    "which performer played most often" unanswerable. 497 of ~1000 rows look
--    like that. A join table is the honest shape: an event has many performers.
--
-- 2. Nothing recorded whether anyone cared about an event. vibe_score is the
--    scout's prediction, not an observation. Outbound clicks are the only
--    interest signal available without user accounts, and they're also the
--    evidence base for telling a venue "I sent you 40 people last month".


-- ── Performers on a bill ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_talent (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    talent_id   UUID NOT NULL REFERENCES talent(id) ON DELETE CASCADE,
    -- 0 = headliner / first billed. Flyers list acts in order and that order
    -- carries meaning worth keeping.
    bill_order  INT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (event_id, talent_id)
);

CREATE INDEX IF NOT EXISTS event_talent_event_idx  ON event_talent(event_id);
CREATE INDEX IF NOT EXISTS event_talent_talent_idx ON event_talent(talent_id);


-- ── Outbound click tracking ────────────────────────────────────────────────
-- Deliberately stores no IP, no user agent, no cookie. The question being
-- answered is "did anyone want this event", which needs a count, not a person.
CREATE TABLE IF NOT EXISTS link_clicks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    venue_id    UUID REFERENCES venues(id) ON DELETE SET NULL,
    -- Where the click was heading, so venue-referral totals survive an event
    -- being deleted.
    destination TEXT,
    -- 'event_page' | 'detail_sheet' | 'map_popup' — which surface converted.
    surface     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS link_clicks_event_idx ON link_clicks(event_id);
CREATE INDEX IF NOT EXISTS link_clicks_venue_idx ON link_clicks(venue_id);
CREATE INDEX IF NOT EXISTS link_clicks_time_idx  ON link_clicks(created_at DESC);

-- Writes come from a server route on the service role. Nothing client-side may
-- read this table: click counts per event are competitive information, and an
-- empty count on a quiet event is not something to publish.
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;


-- ── Queries this makes possible ────────────────────────────────────────────
--
-- Which performers came back most often, last 6 months:
--   SELECT t.name, COUNT(*) AS shows
--   FROM event_talent et
--   JOIN talent t ON t.id = et.talent_id
--   JOIN events e ON e.id = et.event_id
--   WHERE e.event_date > CURRENT_DATE - INTERVAL '6 months'
--     AND e.status <> 'rejected'
--   GROUP BY t.name ORDER BY shows DESC LIMIT 25;
--
-- Which venues actually convert interest into clicks:
--   SELECT v.name, COUNT(*) AS clicks
--   FROM link_clicks lc JOIN venues v ON v.id = lc.venue_id
--   WHERE lc.created_at > NOW() - INTERVAL '30 days'
--   GROUP BY v.name ORDER BY clicks DESC;
