-- Enable Row-Level Security on the tables that never had it.
--
-- Supabase flagged "Table publicly accessible" on 2026-08-23. A table in the
-- public schema with RLS off is readable, writable and deletable by anyone
-- holding the project's anon key — and every Supabase project has one whether
-- or not the app uses it.
--
-- Why these four were missed: `events` and `talent` predate this directory
-- entirely (created in the dashboard, so no migration ever covered them), and
-- `event_talent` was created in schema_capture_layer.sql alongside
-- `link_clicks` where only the latter got the ALTER. `venues`, `guides`,
-- `guide_items` and `link_clicks` are already protected.
--
-- ─────────────────────────────────────────────────────────────────────────
-- This is safe to run and needs NO application changes.
--
-- src/lib/supabase.ts is `import 'server-only'` and authenticates with
-- SUPABASE_SERVICE_KEY. The service role bypasses RLS entirely, so every
-- query the site and the scout make is unaffected. Nothing in the browser
-- talks to Supabase directly — the production bundle contains no JWT at all,
-- verified against the deployed chunks.
--
-- Deliberately NO policies. With RLS on and no policy, anon and authenticated
-- get nothing, which is correct: no client-side code reads these tables. Add
-- a policy the day something in the browser genuinely needs to, not before.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent            ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_talent      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_events  ENABLE ROW LEVEL SECURITY;

-- Worth a look later, not now: venues and guides carry
-- "viewable by everyone" SELECT policies written when the app was expected to
-- read Supabase from the browser. It never does any more, so those grants are
-- wider than anything needs. Harmless while no anon key is in circulation,
-- but they could be dropped the same way — and should be, if an anon key is
-- ever published.
