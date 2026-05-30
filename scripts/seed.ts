/**
 * Synthetic seed batch for Frequent Flyer.
 *
 * Generates a spread of plausible LA events (one-off + recurring) across
 * neighborhoods, days, and vibes to stress-test the filters, map, and cards.
 *
 * - Idempotent: every row it writes is tagged via a seeded venue whose
 *   metadata.source = 'seed_script'. On re-run it deletes events +
 *   recurring_events that reference those venues, then the venues themselves,
 *   before re-inserting. Safe to run repeatedly.
 * - Dates are computed relative to "today" so the current Mon–Sun week (home
 *   page) is populated, plus some future (upcoming) and past (archive) events.
 * - flyer_url is left null so cards render the polished vibe-gradient
 *   placeholder — no image upload required.
 *
 * Run with:  npm run seed
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Add them to .env.local before seeding.'
    );
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEED_SOURCE = 'seed_script';

// Vibe keys, mirrored from src/features/frequent-flyer/data/vibes.ts. Kept
// inline so the script stays a standalone CJS module under ts-node.
const VIBE_KEYS = [
    'Music',
    'Markets & Flea Markets',
    'Food & Drink',
    'Wellness',
    'Art & Cultural',
    'Workshops & Classes',
    'Community',
    'Charity & Benefit',
    'Holiday & Seasonal',
    'Film Screenings & Movie Nights',
    'Nightlife',
    'Sports',
    'Educational',
    'Kids & Family',
    'Pop-Up',
    'Cultural Celebrations',
    'Gaming',
    'Networking',
    'Outdoor Adventures',
    'Book Clubs & Literary',
    'Improv & Comedy',
] as const;

// ---------------------------------------------------------------------------
// Venues — real LA neighborhoods with plausible coordinates.
// ---------------------------------------------------------------------------
interface VenueSeed {
    name: string;
    neighborhood: string;
    lat: number;
    lng: number;
    url: string;
}

const VENUES: VenueSeed[] = [
    { name: 'Taix French Restaurant', neighborhood: 'Echo Park', lat: 34.0760, lng: -118.2615, url: 'https://taixfrench.com' },
    { name: 'Tenants of the Trees', neighborhood: 'Silver Lake', lat: 34.0869, lng: -118.2702, url: 'https://tenantsofthetrees.com' },
    { name: 'Hermosillo', neighborhood: 'Highland Park', lat: 34.1158, lng: -118.1935, url: 'https://thehermosillo.com' },
    { name: 'Clifton’s Republic', neighborhood: 'Downtown LA', lat: 34.0476, lng: -118.2503, url: 'https://cliftonsrepublic.com' },
    { name: 'Townhouse', neighborhood: 'Venice', lat: 33.9905, lng: -118.4695, url: 'https://townhousevenice.com' },
    { name: 'The Prince', neighborhood: 'Koreatown', lat: 34.0618, lng: -118.3009, url: 'https://theprincela.com' },
    { name: 'Vista Theater', neighborhood: 'Los Feliz', lat: 34.1014, lng: -118.2851, url: 'https://vintagecinemas.com' },
    { name: 'The Culver Hotel', neighborhood: 'Culver City', lat: 34.0211, lng: -118.3965, url: 'https://culverhotel.com' },
    { name: 'The Broad Stage', neighborhood: 'Santa Monica', lat: 34.0195, lng: -118.4762, url: 'https://thebroadstage.org' },
    { name: 'The Troubadour', neighborhood: 'West Hollywood', lat: 34.0817, lng: -118.3893, url: 'https://troubadour.com' },
    { name: 'Found Coffee', neighborhood: 'Eagle Rock', lat: 34.1397, lng: -118.2087, url: 'https://foundcoffee.net' },
    { name: 'Hauser & Wirth', neighborhood: 'Arts District', lat: 34.0407, lng: -118.2330, url: 'https://hauserwirth.com' },
];

// ---------------------------------------------------------------------------
// One-off events. dayOffset is relative to today (negative = archive).
// time is HH:MM:SS or null. venueIndex points into VENUES above.
// ---------------------------------------------------------------------------
interface EventSeed {
    title: string;
    vibe: (typeof VIBE_KEYS)[number];
    venueIndex: number;
    dayOffset: number;
    start: string | null;
    end: string | null;
    description: string;
}

const EVENTS: EventSeed[] = [
    // --- Past (archive tab) ---
    { title: 'Sunset Synth Showcase', vibe: 'Music', venueIndex: 0, dayOffset: -9, start: '20:00:00', end: '23:30:00', description: 'A retrospective night of analog synth acts that already happened — here to test the archive.' },
    { title: 'Vintage Vinyl Swap', vibe: 'Markets & Flea Markets', venueIndex: 2, dayOffset: -5, start: '11:00:00', end: '16:00:00', description: 'Crate-diggers traded rare pressings all afternoon.' },
    { title: 'Last Week’s Comedy Roast', vibe: 'Improv & Comedy', venueIndex: 9, dayOffset: -2, start: '21:00:00', end: '23:00:00', description: 'A roast battle that lives only in the archive now.' },

    // --- Current week (home page Mon–Sun) ---
    { title: 'Morning Flow Yoga in the Park', vibe: 'Wellness', venueIndex: 10, dayOffset: 0, start: '08:00:00', end: '09:15:00', description: 'Start the day with a gentle vinyasa flow and free cold brew.' },
    { title: 'Taco Tuesday Block Party', vibe: 'Food & Drink', venueIndex: 5, dayOffset: 1, start: '17:00:00', end: '22:00:00', description: 'Eight taquerias, one street, unlimited salsa flights.' },
    { title: 'Open Studio: Risograph Printing', vibe: 'Workshops & Classes', venueIndex: 11, dayOffset: 2, start: '13:00:00', end: '17:00:00', description: 'Drop in and pull your own two-color riso print.' },
    { title: 'Neighborhood Cleanup & Picnic', vibe: 'Community', venueIndex: 1, dayOffset: 2, start: '10:00:00', end: '13:00:00', description: 'Bring gloves; we provide bags, bagels, and good company.' },
    { title: 'Indie Film Premiere: “Concrete Tides”', vibe: 'Film Screenings & Movie Nights', venueIndex: 6, dayOffset: 3, start: '19:30:00', end: '22:00:00', description: 'A local director’s debut feature, with a Q&A to follow.' },
    { title: 'Rooftop DJ Sundown Session', vibe: 'Nightlife', venueIndex: 3, dayOffset: 4, start: '21:00:00', end: '02:00:00', description: 'House and disco until late, skyline included.' },
    { title: 'Saturday Flea & Makers Market', vibe: 'Markets & Flea Markets', venueIndex: 4, dayOffset: 5, start: '09:00:00', end: '15:00:00', description: 'Ceramics, secondhand denim, and small-batch hot sauce.' },
    { title: 'Live Jazz Brunch', vibe: 'Music', venueIndex: 7, dayOffset: 6, start: '11:00:00', end: '14:00:00', description: 'A quartet, bottomless coffee, and shakshuka.' },
    { title: 'All-Ages Skate Jam', vibe: 'Sports', venueIndex: 4, dayOffset: 5, start: null, end: null, description: 'Open session, mini-ramp comp, and a beginner clinic. (No set time — tests the no-time card layout.)' },
    { title: 'Community Potluck & Story Circle', vibe: 'Community', venueIndex: 10, dayOffset: 3, start: '18:00:00', end: '21:00:00', description: 'Bring a dish and a five-minute story.' },

    // --- Upcoming (next 1–3 weeks) ---
    { title: 'A Genuinely Very Long Event Title That Keeps Going To Test How The Card Handles Multi-Line Overflow Gracefully', vibe: 'Art & Cultural', venueIndex: 11, dayOffset: 8, start: '18:00:00', end: '21:00:00', description: 'A gallery opening with an intentionally unwieldy title to verify text wrapping and clamping in the card and flyer.' },
    { title: 'Late Night Ramen Pop-Up', vibe: 'Pop-Up', venueIndex: 5, dayOffset: 9, start: '22:00:00', end: '01:00:00', description: 'A one-night-only tonkotsu residency.' },
    { title: 'Sound Bath & Meditation', vibe: 'Wellness', venueIndex: 1, dayOffset: 10, start: '19:00:00', end: '20:30:00', description: 'Crystal bowls, no experience needed.' },
    { title: 'Founders & Coffee Networking', vibe: 'Networking', venueIndex: 10, dayOffset: 11, start: '08:30:00', end: '10:00:00', description: 'Casual founder meetup; first coffee on us.' },
    { title: 'Kids’ Science Saturday', vibe: 'Kids & Family', venueIndex: 8, dayOffset: 12, start: '10:00:00', end: '12:00:00', description: 'Slime, volcanoes, and questionable physics.' },
    { title: 'Used Book Fair & Poetry Reading', vibe: 'Book Clubs & Literary', venueIndex: 2, dayOffset: 13, start: '12:00:00', end: '17:00:00', description: 'Stacks of secondhand titles and an open-mic stanza or two.' },
    { title: 'Charity Gala: Feed the City', vibe: 'Charity & Benefit', venueIndex: 7, dayOffset: 14, start: '18:30:00', end: '23:00:00', description: 'Black-tie benefit for the local food bank.' },
    { title: 'Retro Arcade Tournament', vibe: 'Gaming', venueIndex: 3, dayOffset: 15, start: '16:00:00', end: '23:00:00', description: 'Bring quarters; bracket starts at 6.' },
    { title: 'Sunrise Hike & Trail Coffee', vibe: 'Outdoor Adventures', venueIndex: 10, dayOffset: 16, start: '06:00:00', end: '09:00:00', description: 'Moderate 4-mile loop, coffee at the summit.' },
    { title: 'Lunar New Year Lantern Festival', vibe: 'Cultural Celebrations', venueIndex: 5, dayOffset: 17, start: '17:00:00', end: '22:00:00', description: 'Lantern walk, lion dance, and night-market eats.' },
    { title: 'Intro to Screen Printing', vibe: 'Workshops & Classes', venueIndex: 11, dayOffset: 18, start: '14:00:00', end: '17:00:00', description: 'Leave with a printed tote of your own design.' },
    { title: 'History of LA Walking Tour', vibe: 'Educational', venueIndex: 3, dayOffset: 19, start: '10:00:00', end: '12:30:00', description: 'A two-hour guided walk through downtown’s past.' },
    { title: 'Holiday Craft Bazaar', vibe: 'Holiday & Seasonal', venueIndex: 4, dayOffset: 20, start: '11:00:00', end: '18:00:00', description: 'Handmade gifts, mulled cider, and carols.' },
    { title: 'Underground Comedy Showcase', vibe: 'Improv & Comedy', venueIndex: 9, dayOffset: 21, start: '20:30:00', end: '22:30:00', description: 'Six comics, one cramped basement, zero filter.' },
    { title: 'Gallery Walk: Emerging Painters', vibe: 'Art & Cultural', venueIndex: 11, dayOffset: 7, start: '17:00:00', end: '20:00:00', description: 'A self-guided tour across four pop-up gallery spaces.' },
];

// ---------------------------------------------------------------------------
// Recurring events. day_of_week: 0=Sun ... 6=Sat. category drives the card
// gradient (see vibePlaceholders.ts).
// ---------------------------------------------------------------------------
interface RecurringSeed {
    event_name: string;
    category: string;
    day_of_week: number;
    start: string | null;
    end: string | null;
    recurrence: string;
    description: string;
    venueIndex: number;
}

const RECURRING: RecurringSeed[] = [
    { event_name: 'Monday Industry Night', category: 'Industry Night', day_of_week: 1, start: '22:00:00', end: '02:00:00', recurrence: 'Weekly', description: 'Service-industry discounts and a rotating guest DJ.', venueIndex: 5 },
    { event_name: 'Tuesday Trivia Throwdown', category: 'Trivia', day_of_week: 2, start: '19:30:00', end: '21:30:00', recurrence: 'Weekly', description: 'Six rounds, bar-tab prizes, no phones.', venueIndex: 2 },
    { event_name: 'Wine-Down Wednesday Happy Hour', category: 'Happy Hour', day_of_week: 3, start: '16:00:00', end: '19:00:00', recurrence: 'Weekly', description: 'Half-off natural wine and small plates.', venueIndex: 7 },
    { event_name: 'Thursday Open Mic', category: 'Open Mic', day_of_week: 4, start: '20:00:00', end: '23:00:00', recurrence: 'Weekly', description: 'Sign-ups at 7:30 — music, poetry, whatever you’ve got.', venueIndex: 0 },
    { event_name: 'Friday Vinyl Night', category: 'Vinyl Night', day_of_week: 5, start: '21:00:00', end: '01:00:00', recurrence: 'Weekly', description: 'All-vinyl sets from local selectors.', venueIndex: 1 },
    { event_name: 'Saturday Late-Night Karaoke', category: 'Karaoke', day_of_week: 6, start: '22:00:00', end: '02:00:00', recurrence: 'Weekly', description: 'Private rooms and a main stage for the brave.', venueIndex: 5 },
    { event_name: 'Sunday Comedy Night', category: 'Comedy Night', day_of_week: 0, start: '19:00:00', end: '21:00:00', recurrence: 'Weekly', description: 'A relaxed end-of-weekend stand-up lineup.', venueIndex: 9 },
];

// ---------------------------------------------------------------------------
function toISODate(dayOffset: number): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

async function cleanupPreviousSeed(): Promise<void> {
    const { data: seededVenues, error } = await supabase
        .from('venues')
        .select('id')
        .eq('metadata->>source', SEED_SOURCE);

    if (error) throw new Error('Failed to read seeded venues: ' + error.message);

    const ids = (seededVenues || []).map((v: { id: string }) => v.id);
    if (ids.length === 0) {
        console.log('No previous seed data found — fresh insert.');
        return;
    }

    console.log(`Found ${ids.length} previously-seeded venues. Removing their events…`);

    const { error: evErr } = await supabase.from('events').delete().in('venue_id', ids);
    if (evErr) throw new Error('Failed to delete seeded events: ' + evErr.message);

    const { error: recErr } = await supabase.from('recurring_events').delete().in('venue_id', ids);
    if (recErr) throw new Error('Failed to delete seeded recurring events: ' + recErr.message);

    const { error: venErr } = await supabase.from('venues').delete().in('id', ids);
    if (venErr) throw new Error('Failed to delete seeded venues: ' + venErr.message);

    console.log('Previous seed data removed.');
}

async function seedVenues(): Promise<string[]> {
    const rows = VENUES.map((v) => ({
        name: v.name,
        neighborhood: v.neighborhood,
        lat: v.lat,
        lng: v.lng,
        url: v.url,
        metadata: { source: SEED_SOURCE },
    }));

    const { data, error } = await supabase.from('venues').insert(rows).select('id');
    if (error) throw new Error('Failed to insert venues: ' + error.message);
    if (!data || data.length !== VENUES.length) {
        throw new Error(`Expected ${VENUES.length} venues, inserted ${data?.length ?? 0}.`);
    }
    console.log(`Inserted ${data.length} venues.`);
    return data.map((d: { id: string }) => d.id);
}

async function seedEvents(venueIds: string[]): Promise<void> {
    const rows = EVENTS.map((e) => ({
        event_name: e.title,
        event_date: toISODate(e.dayOffset),
        start_time: e.start,
        end_time: e.end,
        event_vibe: e.vibe,
        venue_id: venueIds[e.venueIndex],
        flyer_url: null,
        status: 'approved',
        metadata: { justification: e.description, source: SEED_SOURCE },
    }));

    const { error } = await supabase.from('events').insert(rows);
    if (error) throw new Error('Failed to insert events: ' + error.message);
    console.log(`Inserted ${rows.length} one-off events.`);
}

async function seedRecurring(venueIds: string[]): Promise<void> {
    const rows = RECURRING.map((r) => ({
        event_name: r.event_name,
        category: r.category,
        day_of_week: r.day_of_week,
        start_time: r.start,
        end_time: r.end,
        recurrence: r.recurrence,
        description: r.description,
        venue_id: venueIds[r.venueIndex],
        status: 'approved',
    }));

    const { error } = await supabase.from('recurring_events').insert(rows);
    if (error) throw new Error('Failed to insert recurring events: ' + error.message);
    console.log(`Inserted ${rows.length} recurring events.`);
}

async function main(): Promise<void> {
    console.log(`Seeding Frequent Flyer (${SUPABASE_URL.replace(/https?:\/\//, '').split('.')[0]})…`);

    // Sanity: every vibe used must be a valid key.
    for (const e of EVENTS) {
        if (!VIBE_KEYS.includes(e.vibe)) throw new Error(`Invalid vibe: ${e.vibe}`);
    }

    await cleanupPreviousSeed();
    const venueIds = await seedVenues();
    await seedEvents(venueIds);
    await seedRecurring(venueIds);

    console.log('\n✅ Seed complete.');
    console.log(`   ${VENUES.length} venues · ${EVENTS.length} events · ${RECURRING.length} recurring`);
}

main().catch((err) => {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
});
