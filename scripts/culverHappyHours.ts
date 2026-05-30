/**
 * Real Culver City happy hours — recurring events curated by hand.
 *
 * SEPARATE from the synthetic demo seed (scripts/seed.ts) on purpose: this is
 * real data and must NOT be wiped by `npm run seed`. Idempotency here keys off
 * recurring_events.metadata.source === 'culver_hh' (and a matching venue tag
 * for venues this script creates), so it can be re-run and extended freely
 * without touching the synthetic batch.
 *
 * Model: a happy hour is a RECURRING event with category 'Happy Hour' (the 🍸
 * card gradient). Each row holds one day_of_week, so a multi-day happy hour
 * expands to one row per day. Where a venue has both an afternoon and a
 * late-night window, we show ONE card per day: the earliest window drives the
 * card's time line, and the other window is noted in the description.
 *
 * Venues:
 *  - "Jameson's Pub" already exists in the DB (with a real url) but has null
 *    coordinates — we reuse its row and backfill lat/lng. We do NOT tag it
 *    'culver_hh' (so cleanup never deletes a pre-existing venue).
 *  - "33 Taps" is created fresh, tagged source='culver_hh' so reruns replace it.
 *
 * Run with:  npm run seed:culver
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Add them to .env.local.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SOURCE = 'culver_hh';
const CATEGORY = 'Happy Hour';

// 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
const MON_FRI = [1, 2, 3, 4, 5];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const SUN_THU = [0, 1, 2, 3, 4];

interface HHWindow {
    /** Days this window runs. */
    days: number[];
    /** HH:MM:SS local. */
    start: string;
    end: string | null;
    /** Short phrase used when this window is the *secondary* one on a day. */
    label: string;
}

interface HappyHourVenue {
    venueName: string;
    neighborhood: string;
    lat: number;
    lng: number;
    url: string;
    eventName: string;
    /** Deals blurb appended to every day's description. */
    deals: string;
    windows: HHWindow[];
}

const HAPPY_HOURS: HappyHourVenue[] = [
    {
        venueName: '33 Taps',
        neighborhood: 'Culver City',
        lat: 34.0219158,
        lng: -118.3965688,
        url: 'https://eatdrink33.com',
        eventName: '33 Taps Happy Hour',
        deals:
            'Discounted pints, house liquors, cocktails & wine (margarita, paloma, espresso & mezcal margs), ' +
            'pitchers, plus food — pizza, street tacos, banh mi fries, calamari, cheeseburger.',
        windows: [
            { days: MON_FRI, start: '15:00:00', end: '19:00:00', label: 'happy hour 3–7 PM' },
            { days: EVERY_DAY, start: '21:30:00', end: null, label: 'late-night 9:30 PM–close' },
        ],
    },
    {
        venueName: "Jameson's Pub",
        neighborhood: 'Culver City',
        lat: 34.0230593,
        lng: -118.3948470,
        url: 'https://culvercity.jamesonsirishpub.com/culver-city-jameson-s-pub-culver-city-events',
        eventName: "Jameson's Pub Happy Hour",
        deals: 'All drinks 2-for-1 prices.',
        windows: [
            { days: EVERY_DAY, start: '15:00:00', end: '19:00:00', label: 'happy hour 3–7 PM' },
            { days: SUN_THU, start: '22:30:00', end: '00:30:00', label: 'late-night 10:30 PM–12:30 AM' },
        ],
    },
];

interface RecurringRow {
    event_name: string;
    category: string;
    day_of_week: number;
    start_time: string;
    end_time: string | null;
    recurrence: string;
    description: string;
    venue_id: string;
    status: string;
    metadata: { source: string };
}

// Expand a venue's windows into one merged row per day.
function buildRows(v: HappyHourVenue, venueId: string): RecurringRow[] {
    const rows: RecurringRow[] = [];

    for (let day = 0; day <= 6; day++) {
        const active = v.windows
            .filter((w) => w.days.includes(day))
            .sort((a, b) => a.start.localeCompare(b.start));

        if (active.length === 0) continue;

        const [primary, ...secondary] = active;
        const extra = secondary.length
            ? `Also ${secondary.map((w) => w.label).join(' & ')}. `
            : '';

        rows.push({
            event_name: v.eventName,
            category: CATEGORY,
            day_of_week: day,
            start_time: primary.start,
            end_time: primary.end,
            recurrence: 'Weekly',
            description: `${extra}${v.deals}`,
            venue_id: venueId,
            status: 'approved',
            metadata: { source: SOURCE },
        });
    }

    return rows;
}

async function cleanupPrevious(): Promise<void> {
    const { error: recErr } = await supabase
        .from('recurring_events')
        .delete()
        .eq('metadata->>source', SOURCE);
    if (recErr) throw new Error('Failed to delete prior culver_hh recurring rows: ' + recErr.message);

    const { error: venErr } = await supabase
        .from('venues')
        .delete()
        .eq('metadata->>source', SOURCE);
    if (venErr) throw new Error('Failed to delete prior culver_hh venues: ' + venErr.message);

    console.log('Cleared any previous culver_hh data.');
}

// Reuse an existing venue by exact name (backfilling null coords), or create a
// new tagged venue. Returns the venue id.
async function resolveVenue(v: HappyHourVenue): Promise<string> {
    const { data: existing, error } = await supabase
        .from('venues')
        .select('id, lat, lng')
        .eq('name', v.venueName)
        .maybeSingle();
    if (error) throw new Error(`Venue lookup failed for ${v.venueName}: ${error.message}`);

    if (existing) {
        if (existing.lat == null || existing.lng == null) {
            const { error: upErr } = await supabase
                .from('venues')
                .update({ lat: v.lat, lng: v.lng })
                .eq('id', existing.id);
            if (upErr) throw new Error(`Failed to backfill coords for ${v.venueName}: ${upErr.message}`);
            console.log(`Reused existing venue "${v.venueName}" and backfilled coordinates.`);
        } else {
            console.log(`Reused existing venue "${v.venueName}".`);
        }
        return existing.id;
    }

    const { data: created, error: insErr } = await supabase
        .from('venues')
        .insert({
            name: v.venueName,
            neighborhood: v.neighborhood,
            lat: v.lat,
            lng: v.lng,
            url: v.url,
            metadata: { source: SOURCE },
        })
        .select('id')
        .single();
    if (insErr || !created) throw new Error(`Failed to create venue ${v.venueName}: ${insErr?.message}`);
    console.log(`Created venue "${v.venueName}".`);
    return created.id;
}

async function main(): Promise<void> {
    console.log('Seeding Culver City happy hours…');
    await cleanupPrevious();

    const allRows: RecurringRow[] = [];
    for (const v of HAPPY_HOURS) {
        const venueId = await resolveVenue(v);
        allRows.push(...buildRows(v, venueId));
    }

    const { error } = await supabase.from('recurring_events').insert(allRows);
    if (error) throw new Error('Failed to insert recurring rows: ' + error.message);

    console.log(`\n✅ Inserted ${allRows.length} happy-hour rows across ${HAPPY_HOURS.length} venues.`);
}

main().catch((err) => {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
});
