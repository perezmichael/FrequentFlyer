-- Recurring events: trivia, happy hours, karaoke, bingo, etc.
-- Run this in the Supabase SQL editor.

CREATE TABLE recurring_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,       -- 0=Sun, 1=Mon ... 6=Sat (JS Date.getDay() convention)
  start_time TIME,
  end_time TIME,
  recurrence TEXT DEFAULT 'weekly',   -- 'weekly', 'biweekly', 'monthly_first', 'monthly_last'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_name, venue_id, day_of_week)
);

CREATE INDEX idx_recurring_events_day ON recurring_events(day_of_week);
CREATE INDEX idx_recurring_events_category ON recurring_events(category);
CREATE INDEX idx_recurring_events_status ON recurring_events(status);
