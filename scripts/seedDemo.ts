/**
 * Demo seed for Frequent Flyer — investor/user-demo quality data.
 *
 * Unlike scripts/seed.ts (a QA stress-test batch with intentionally awkward
 * titles), every event here is written to read like a real listing on a
 * Gen-Z LA events app: real venues, plausible nights, Partiful-energy copy.
 *
 * - Idempotent: rows are tagged via seeded venues whose
 *   metadata.source = 'seed_demo'. Re-running deletes and re-inserts.
 * - Coexists with seed.ts (different source tag, no venue-name collisions).
 * - Dates are relative to "today" so the current week is always full.
 *
 * Run with:  npm run seed:demo
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const SEED_SOURCE = 'seed_demo';

// ---------------------------------------------------------------------------
// Venues — real LA spots with the right cultural register. Names chosen not
// to collide with seed.ts or the Culver City happy-hour seed.
// ---------------------------------------------------------------------------
interface VenueSeed {
    name: string;
    neighborhood: string;
    lat: number;
    lng: number;
    url: string;
}

const VENUES: VenueSeed[] = [
    { name: 'Zebulon', neighborhood: 'Frogtown', lat: 34.1066, lng: -118.2363, url: 'https://zebulon.la' },
    { name: 'Gold-Diggers', neighborhood: 'East Hollywood', lat: 34.0916, lng: -118.3057, url: 'https://gold-diggers.com' },
    { name: '2220 Arts + Archives', neighborhood: 'Historic Filipinotown', lat: 34.0651, lng: -118.2733, url: 'https://2220arts.org' },
    { name: 'The Virgil', neighborhood: 'East Hollywood', lat: 34.0869, lng: -118.2868, url: 'https://thevirgil.com' },
    { name: 'El Cid', neighborhood: 'Silver Lake', lat: 34.0903, lng: -118.2748, url: 'https://elcidsunset.com' },
    { name: 'Stories Books & Cafe', neighborhood: 'Echo Park', lat: 34.0778, lng: -118.2606, url: 'https://storiesla.com' },
    { name: 'Junior High', neighborhood: 'Glassell Park', lat: 34.1156, lng: -118.2266, url: 'https://juniorhigh.la' },
    { name: 'Catch One', neighborhood: 'Mid-City', lat: 34.0480, lng: -118.3230, url: 'https://catchone.com' },
    { name: 'Permanent Records Roadhouse', neighborhood: 'Cypress Park', lat: 34.0938, lng: -118.2249, url: 'https://permanentrecordsla.com' },
    { name: 'The Paramount', neighborhood: 'Boyle Heights', lat: 34.0438, lng: -118.2129, url: 'https://theparamount.la' },
    { name: 'Heavy Manners Library', neighborhood: 'Echo Park', lat: 34.0782, lng: -118.2566, url: 'https://heavymanners.org' },
    { name: 'Now Serving', neighborhood: 'Chinatown', lat: 34.0617, lng: -118.2390, url: 'https://nowservingla.com' },
];

// ---------------------------------------------------------------------------
// One-off events. dayOffset relative to today; venueIndex into VENUES.
// ---------------------------------------------------------------------------
interface EventSeed {
    title: string;
    vibe: string;
    venueIndex: number;
    dayOffset: number;
    start: string | null;
    end: string | null;
    description: string;
}

const EVENTS: EventSeed[] = [
    // --- Past (archive) ---
    { title: 'Slowdance: Ambient Listening Party', vibe: 'Music', venueIndex: 1, dayOffset: -8, start: '20:00:00', end: '23:00:00', description: 'Lights off, phones away. Two hours of ambient sets on the good speakers.' },
    { title: 'Night Market After Dark', vibe: 'Pop-Up', venueIndex: 9, dayOffset: -4, start: '19:00:00', end: '00:00:00', description: 'Twelve vendors, lion dance at ten, taro soft-serve until it ran out.' },
    { title: 'Perreo Paradiso', vibe: 'Nightlife', venueIndex: 7, dayOffset: -1, start: '22:00:00', end: '03:00:00', description: 'Reggaeton, dembow, and a room that does not stop. Last one sold out.' },

    // --- This week ---
    { title: 'Run Club: Slow Division', vibe: 'Wellness', venueIndex: 5, dayOffset: 0, start: '08:00:00', end: '09:30:00', description: '5k at conversation pace, coffee after. Zero Strava pressure.' },
    { title: 'Zine Night: Cut & Paste Social', vibe: 'Workshops & Classes', venueIndex: 10, dayOffset: 1, start: '19:00:00', end: '22:00:00', description: 'Scissors, glue sticks, and a risograph in the back. Bring something to copy.' },
    { title: 'Natural Wine & Records Swap', vibe: 'Food & Drink', venueIndex: 8, dayOffset: 2, start: '17:00:00', end: '21:00:00', description: 'Bring a bottle or a crate. Trades encouraged, gatekeeping discouraged.' },
    { title: 'Sad Girl Cinema: In the Mood for Love', vibe: 'Film Screenings & Movie Nights', venueIndex: 2, dayOffset: 2, start: '19:30:00', end: '22:00:00', description: '35mm if the print arrives. Tissues provided either way.' },
    { title: 'Backyard Boiler Room: Eastside Edition', vibe: 'Nightlife', venueIndex: 0, dayOffset: 3, start: '21:00:00', end: '02:00:00', description: 'Four selectors, one backyard, address drops day-of.' },
    { title: 'Figure Drawing (No Experience, No Judgement)', vibe: 'Art & Cultural', venueIndex: 6, dayOffset: 3, start: '18:30:00', end: '21:00:00', description: 'Charcoal and newsprint provided. Wine optional, talent optional-er.' },
    { title: 'Girl Dinner: A Potluck', vibe: 'Community', venueIndex: 10, dayOffset: 4, start: '19:00:00', end: '22:00:00', description: 'Bring one snack that says something about you. We make a meal of it.' },
    { title: 'Cumbia Sonidera Night', vibe: 'Music', venueIndex: 4, dayOffset: 4, start: '21:00:00', end: '01:30:00', description: 'Live sonidero, dance floor non-negotiable.' },
    { title: 'Flea on the Hill', vibe: 'Markets & Flea Markets', venueIndex: 8, dayOffset: 5, start: '10:00:00', end: '16:00:00', description: 'Vintage tees, dead-stock denim, and somebody selling exactly one lamp.' },
    { title: 'Mutual Aid Bake Sale & Clothing Swap', vibe: 'Charity & Benefit', venueIndex: 5, dayOffset: 5, start: '11:00:00', end: '15:00:00', description: 'All proceeds to the tenants union. The banana bread goes fast.' },
    { title: 'Lights Out Karaoke', vibe: 'Nightlife', venueIndex: 3, dayOffset: 6, start: '21:00:00', end: '01:00:00', description: 'Pitch black room. No one can see you. Sing accordingly.' },

    // --- Upcoming weeks ---
    { title: 'Tape Loop Workshop with Open Reel', vibe: 'Workshops & Classes', venueIndex: 1, dayOffset: 7, start: '14:00:00', end: '17:00:00', description: 'Build a cassette loop from scratch and take it home. Decks provided.' },
    { title: 'Poetry & Pasta: A Reading Series', vibe: 'Book Clubs & Literary', venueIndex: 5, dayOffset: 8, start: '19:00:00', end: '21:30:00', description: 'Three poets, one pot of cacio e pepe, BYO opinions about line breaks.' },
    { title: 'Midnight Ramen Pop-Up', vibe: 'Pop-Up', venueIndex: 11, dayOffset: 9, start: '22:30:00', end: '01:30:00', description: 'One-night tonkotsu residency from a chef we are not allowed to name yet.' },
    { title: 'Queer Line Dancing 101', vibe: 'Community', venueIndex: 7, dayOffset: 10, start: '19:00:00', end: '22:00:00', description: 'Boots optional, two left feet welcome. Lesson at 7, open floor at 8.' },
    { title: 'Analog Photo Walk: Chinatown at Dusk', vibe: 'Outdoor Adventures', venueIndex: 11, dayOffset: 11, start: '17:30:00', end: '19:30:00', description: 'Bring a film camera or borrow one of ours. Golden hour does the rest.' },
    { title: 'Synth Petting Zoo', vibe: 'Music', venueIndex: 2, dayOffset: 12, start: '13:00:00', end: '17:00:00', description: 'Twenty synthesizers, zero rules, headphones at every station.' },
    { title: 'Standup in a Laundromat', vibe: 'Improv & Comedy', venueIndex: 6, dayOffset: 13, start: '20:00:00', end: '22:00:00', description: 'Six comics between the washers. Bring quarters, leave with clean clothes.' },
    { title: 'Mahjong & Martinis', vibe: 'Gaming', venueIndex: 11, dayOffset: 14, start: '18:00:00', end: '22:00:00', description: 'Beginners table all night. The aunties run the back room.' },
    { title: 'Open Decks: Bring a USB', vibe: 'Music', venueIndex: 3, dayOffset: 15, start: '20:00:00', end: '01:00:00', description: 'Twenty-minute slots, sign up at the door. CDJs and a soundsystem that forgives nothing.' },
    { title: 'Mercado de Noche', vibe: 'Cultural Celebrations', venueIndex: 9, dayOffset: 16, start: '18:00:00', end: '23:00:00', description: 'Food stalls, vintage vendors, and banda until the lights come on.' },
    { title: 'Intro to DJing for Women & Nonbinary Folks', vibe: 'Educational', venueIndex: 7, dayOffset: 17, start: '15:00:00', end: '18:00:00', description: 'Hands-on with the decks in small groups. Gear provided, lineup spots for grads.' },
    { title: 'Soup Club: Winter Session', vibe: 'Food & Drink', venueIndex: 10, dayOffset: 18, start: '18:30:00', end: '21:00:00', description: 'Five soups, one long table, strangers leave as friends or at least full.' },
    { title: 'Skate Night at the Rink', vibe: 'Sports', venueIndex: 7, dayOffset: 19, start: '20:00:00', end: '00:00:00', description: 'Quad skates, disco ball, throwback R&B. Rentals on site.' },
    { title: 'Sound Bath Under the Bridge', vibe: 'Wellness', venueIndex: 0, dayOffset: 20, start: '19:30:00', end: '21:00:00', description: 'Gongs and crystal bowls by the river. Bring a blanket and a person you like.' },
    { title: 'Gallery Crawl: Five Rooms, One Night', vibe: 'Art & Cultural', venueIndex: 2, dayOffset: 21, start: '18:00:00', end: '22:00:00', description: 'Five openings within walking distance, map at the first door.' },
];

// ---------------------------------------------------------------------------
// Recurring weekly nights. day_of_week: 0=Sun ... 6=Sat.
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
    { event_name: 'Industry Mondays', category: 'Industry Night', day_of_week: 1, start: '22:00:00', end: '02:00:00', recurrence: 'Weekly', description: 'For everyone who works weekends. Well drinks at bartender prices.', venueIndex: 3 },
    { event_name: 'Trivia for People Who Hate Trivia', category: 'Trivia', day_of_week: 2, start: '19:30:00', end: '21:30:00', recurrence: 'Weekly', description: 'No sports round, ever. One round is just vibes-based guessing.', venueIndex: 8 },
    { event_name: 'Stitch & Bitch', category: 'Craft Night', day_of_week: 3, start: '18:30:00', end: '21:00:00', recurrence: 'Weekly', description: 'Knitting, crochet, mending, gossip. Skill level: any.', venueIndex: 10 },
    { event_name: 'Open Mic at the Bookstore', category: 'Open Mic', day_of_week: 4, start: '19:00:00', end: '22:00:00', recurrence: 'Weekly', description: 'Music, poetry, five-minute anything. List opens at 6:30 and fills fast.', venueIndex: 5 },
    { event_name: 'All Vinyl Fridays', category: 'Vinyl Night', day_of_week: 5, start: '21:00:00', end: '01:30:00', recurrence: 'Weekly', description: 'Local selectors, strictly wax, no requests (lovingly).', venueIndex: 0 },
    { event_name: 'Salsa Social (Lesson First)', category: 'Dance Night', day_of_week: 6, start: '20:00:00', end: '01:00:00', recurrence: 'Weekly', description: 'Beginner lesson at 8 sharp, social until close. Solo-friendly.', venueIndex: 4 },
    { event_name: 'Church of Disco', category: 'Dance Night', day_of_week: 0, start: '16:00:00', end: '21:00:00', recurrence: 'Weekly', description: 'Sunday service for people whose religion is a four-on-the-floor.', venueIndex: 7 },
    { event_name: 'Comedy in the Back Room', category: 'Comedy Night', day_of_week: 0, start: '19:30:00', end: '21:30:00', recurrence: 'Weekly', description: 'A tight hour of stand-up to end the weekend gently.', venueIndex: 6 },
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
        console.log('No previous demo seed found — fresh insert.');
        return;
    }

    console.log(`Found ${ids.length} previously-seeded demo venues. Removing their events…`);

    const { error: evErr } = await supabase.from('events').delete().in('venue_id', ids);
    if (evErr) throw new Error('Failed to delete seeded events: ' + evErr.message);

    const { error: recErr } = await supabase.from('recurring_events').delete().in('venue_id', ids);
    if (recErr) throw new Error('Failed to delete seeded recurring events: ' + recErr.message);

    const { error: venErr } = await supabase.from('venues').delete().in('id', ids);
    if (venErr) throw new Error('Failed to delete seeded venues: ' + venErr.message);

    console.log('Previous demo seed removed.');
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
    console.log('Seeding demo data…');
    await cleanupPreviousSeed();
    const venueIds = await seedVenues();
    await seedEvents(venueIds);
    await seedRecurring(venueIds);
    console.log('Demo seed complete. ✨');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
