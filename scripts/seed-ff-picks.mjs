/**
 * Seed the nine hand-verified events for the week of 2026-09-21.
 *
 * Why a script and not the /create flow: publishEvent() requires a flyer image
 * and writes metadata.venue_text without a venue_id, so the event never joins a
 * venue — it renders as "Unknown, LA" with no map pin. Five of these nine have
 * no flyer, and all nine need a real venue row, so they go in through here.
 *
 * Rules this script follows, all of them borrowed from the schema's own
 * comments rather than invented:
 *   · price stays NULL when the number is resale or unverified. The Event
 *     interface is explicit that the UI stays quiet rather than guessing, and
 *     three of these (The Ford, Echoplex, The Fonda) only had resale figures.
 *   · A venue that won't geocode is still written, with lat/lng NULL — the map
 *     skips it rather than dropping it on a downtown default.
 *   · Events already in the DB are UPDATED, not duplicated. The Echo's scraper
 *     fix pulled in Dana and Alden and Jesse Baez on its own; this promotes
 *     those rows instead of writing a second copy.
 *
 * Usage:
 *   node scripts/seed-ff-picks.mjs --dry-run    # print the plan, write nothing
 *   node scripts/seed-ff-picks.mjs              # apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
// import.meta.dirname needs Node 20.11+; this repo builds on 18.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const env = Object.fromEntries(
    fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.trim().startsWith('#'))
        .map(l => {
            const i = l.indexOf('=');
            return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
        })
);

const SUPABASE_URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env.local');

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function sb(pathname, init = {}) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
        ...init,
        headers: { ...H, ...(init.headers || {}) },
    });
    const text = await resp.text();
    const body = text ? JSON.parse(text) : null;
    if (!resp.ok) throw new Error(`${resp.status} ${pathname}: ${text.slice(0, 300)}`);
    return body;
}

/** Nominatim, same endpoint and same LA bounds check as geocodeVenue() in src/app/actions.ts. */
async function geocode(query) {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    try {
        const resp = await fetch(url, {
            headers: { 'User-Agent': 'FrequentFlyerLA/1.0 (https://frequentflyerla.com)' },
            signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) return null;
        const hit = (await resp.json())?.[0];
        if (!hit) return null;
        const lat = Number(hit.lat), lng = Number(hit.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        // Outside LA means Nominatim matched the wrong thing; a wrong pin is
        // worse than no pin.
        if (!(lat > 33.6 && lat < 34.4 && lng > -118.9 && lng < -117.6)) return null;
        return { lat, lng };
    } catch {
        return null;
    }
}

// ── The venues these events need ────────────────────────────────────────────
// `geocodeQuery` is the string handed to Nominatim — a bare venue name matches
// the wrong city often enough that every one of these carries its address.
const VENUES = [
    { name: 'Hollywood Improv',   neighborhood: 'Melrose',        geocodeQuery: '8162 Melrose Ave, Los Angeles, CA 90046',      url: 'https://improv.com/hollywood/' },
    { name: 'UCB Theatre',        neighborhood: 'Los Feliz',      geocodeQuery: '5919 Franklin Ave, Los Angeles, CA 90028',     url: 'https://ucbcomedy.com/' },
    { name: 'The Ford',           neighborhood: 'Hollywood Hills',geocodeQuery: '2580 Cahuenga Blvd E, Los Angeles, CA 90068',  url: 'https://www.theford.com/' },
    { name: 'Echoplex',           neighborhood: 'Echo Park',      geocodeQuery: '1154 Glendale Blvd, Los Angeles, CA 90026',    url: 'https://www.theecho.com/shows' },
    { name: 'Hollywood Forever',  neighborhood: 'Hollywood',      geocodeQuery: '6000 Santa Monica Blvd, Los Angeles, CA 90038',url: 'https://hollywoodforever.com/' },
    { name: 'The Fonda Theatre',  neighborhood: 'Hollywood',      geocodeQuery: '6126 Hollywood Blvd, Los Angeles, CA 90028',   url: 'https://www.fondatheatre.com/' },
    { name: 'MASH Gallery',       neighborhood: 'West Hollywood', geocodeQuery: '812 N La Cienega Blvd, Los Angeles, CA 90069', url: 'https://mashgallery.com/' },
];

// ── The nine ────────────────────────────────────────────────────────────────
// `price: null` is deliberate wherever the only figure available was resale or
// unverified — see the header. `curated: true` is the FF Picks stamp.
const EVENTS = [
    {
        name: 'Just Pull Up ft. Dulcé Sloan, Ron Funches',
        date: '2026-09-22', start: '19:30:00', venue: 'Hollywood Improv',
        vibe: 'Improv & Comedy', price: '$24.19', curated: false, vibeScore: 4,
        url: 'https://improv.com/hollywood/',
        description: 'Stand-up in the Lab room with Dulcé Sloan and Ron Funches on the bill.',
    },
    {
        name: 'SET LIST: Stand-Up Without a Net ft. Greg Proops',
        date: '2026-09-24', start: '21:30:00', venue: 'Lyric Hyperion',
        vibe: 'Improv & Comedy', price: '$15 presale / $20 day-of', curated: true, vibeScore: 8,
        url: 'https://lyrichyperion.com/tickets',
        description: 'Comedians improvise full sets from slides they have never seen. Greg Proops headlines. Doors 9:10.',
    },
    {
        name: 'Fuck This Month',
        date: '2026-09-24', start: '20:30:00', venue: 'UCB Theatre',
        // In-person price isn't published for this date; only the $10 livestream
        // is. Listing the livestream number next to an in-person show would read
        // as the door price, so this stays null and the card says nothing.
        vibe: 'Improv & Comedy', price: null, curated: false, vibeScore: 7,
        url: 'https://ucbcomedy.com/',
        description: 'Monthly improv run-through of everything that happened this month. Livestream and in-person.',
    },
    {
        name: 'Nothing Compares 2 Prince ft. Bilal & DJ Rashida',
        date: '2026-09-25', start: '20:00:00', venue: 'The Ford',
        vibe: 'Music', price: null, curated: true, vibeScore: 8,
        url: 'https://www.theford.com/',
        description: 'A Prince tribute at the Ford with Bilal singing and DJ Rashida, Prince’s former touring DJ, on decks.',
    },
    {
        name: 'Dana and Alden — Papa’s Boat Tour',
        date: '2026-09-25', start: '20:00:00', venue: 'Echoplex',
        vibe: 'Music', price: null, curated: true, vibeScore: 8,
        url: 'https://www.theecho.com/shows',
        description: 'The brothers bring the Papa’s Boat tour to the Echoplex. Doors 7, show 8.',
    },
    {
        name: 'Rilo Kiley w/ Beachwood Sparks',
        date: '2026-09-26', start: '18:00:00', venue: 'Hollywood Forever',
        vibe: 'Music', price: '$30.82–$80.88', curated: true, vibeScore: 10,
        url: 'https://www.ticketweb.com/',
        description: 'Rilo Kiley reunite on the Fairbanks Lawn with Beachwood Sparks opening. Gates 6, Rilo Kiley 8:15.',
    },
    {
        name: 'Faye Webster w/ LAILA! + Yoyo Showcase',
        date: '2026-09-26', start: '19:00:00', venue: 'The Fonda Theatre',
        vibe: 'Music', price: null, curated: false, vibeScore: 6,
        url: 'https://www.fondatheatre.com/',
        description: 'Faye Webster with a live band, plus LAILA! and the Yoyo Showcase. Also plays Sunday.',
    },
    {
        name: 'Jesse Baez',
        date: '2026-09-26', start: '20:00:00', venue: 'The Echo',
        vibe: 'Music', price: '$29', curated: true, vibeScore: 9,
        url: 'https://www.theecho.com/shows',
        description: 'Guatemalan R&B and Latin alternative at the Echo. All ages, doors 7, show 8.',
    },
    {
        name: '"The Shape of Elsewhere" opening reception',
        date: '2026-09-26', start: '18:00:00', end: '21:00:00', venue: 'MASH Gallery',
        vibe: 'Art & Cultural', price: 'Free with RSVP', curated: false, vibeScore: 7,
        url: 'https://mashgallery.com/',
        description: 'Opening reception for the group show. Free with RSVP, 6–9pm.',
    },
];

/** Loose title match, so a scraper-written row is found instead of duplicated. */
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Do these two titles name the same show?
 *
 * The prefix comparison needs a floor: the DB still holds some blank-titled
 * rows from before master_scout learned to drop them, and `"".includes("")`
 * made every one of them a match for every event — the first version of this
 * script reported a Prince tribute as already present because of two empty
 * rows on the same date.
 */
const PREFIX = 18;
function sameTitle(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length < PREFIX || b.length < PREFIX) return false;
    return a.startsWith(b.slice(0, PREFIX)) || b.startsWith(a.slice(0, PREFIX));
}

async function main() {
    console.log(DRY ? '— DRY RUN, nothing will be written —\n' : '— APPLYING —\n');

    // 1. Venues
    const venueIds = new Map();
    for (const v of VENUES) {
        const existing = await sb(`venues?select=id,name,lat,lng&name=eq.${encodeURIComponent(v.name)}`);
        if (existing.length) {
            venueIds.set(v.name, existing[0].id);
            console.log(`venue  = ${v.name} (exists)`);
            continue;
        }
        const geo = await geocode(v.geocodeQuery);
        // Nominatim asks for no more than one request a second.
        await new Promise(r => setTimeout(r, 1100));
        const payload = {
            name: v.name,
            neighborhood: v.neighborhood,
            url: v.url,
            ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
        };
        console.log(`venue  + ${v.name} ${geo ? `(${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})` : '(NO GEOCODE — will not appear on the map)'}`);
        if (DRY) { venueIds.set(v.name, '(dry)'); continue; }
        const row = await sb('venues', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(payload),
        });
        venueIds.set(v.name, row[0].id);
    }

    // Venues the scout already owns (The Echo, Lyric Hyperion).
    for (const name of ['The Echo', 'Lyric Hyperion']) {
        const row = await sb(`venues?select=id&name=eq.${encodeURIComponent(name)}`);
        if (row.length) venueIds.set(name, row[0].id);
        else console.log(`  ! venue ${name} not found — its events will be skipped`);
    }

    console.log('');

    // 2. Events
    for (const e of EVENTS) {
        const venueId = venueIds.get(e.venue);
        if (!venueId) { console.log(`event  ! ${e.name} — no venue row, skipped`); continue; }

        // Match on date + title across EVERY venue, not just the target one.
        // The Echo's listing page covers the Echoplex room too, so the scout
        // filed Dana and Alden under "The Echo" while this script files it
        // under "Echoplex" — a venue-scoped check would miss that and write a
        // second copy of a show that is already in the feed.
        // Runs in dry-run too: the query no longer depends on venueId, and a
        // preview that can't tell you "this one already exists" is worth less
        // than no preview.
        const sameDay = await sb(
            `events?select=id,event_name,status,curation_level,venue_id&event_date=eq.${e.date}`
        );
        const hit = sameDay.find(r => sameTitle(r.event_name, e.name));

        const metadata = {
            description: e.description,
            vibe_score: e.vibeScore,
            ...(e.price ? { price: e.price } : {}),
        };
        const row = {
            event_name: e.name,
            event_date: e.date,
            start_time: e.start,
            ...(e.end ? { end_time: e.end } : {}),
            venue_id: venueId,
            event_vibe: e.vibe,
            source_url: e.url,
            status: 'approved',
            curation_level: e.curated ? 'ff_curated' : 'scraped',
            metadata,
        };

        const stamp = e.curated ? '★ pick' : '  list';
        const priceNote = e.price ? e.price : 'price null (unverified)';

        if (hit) {
            console.log(`event  ~ ${stamp}  ${e.date}  ${e.name}  [updating scraped row]  ${priceNote}`);
            if (!DRY) {
                // Merge onto what the scraper already wrote rather than
                // clobbering it — it captured a flyer we don't want to lose.
                const prior = await sb(`events?select=metadata&id=eq.${hit.id}`);
                const merged = { ...(prior[0]?.metadata || {}), ...metadata };
                await sb(`events?id=eq.${hit.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ ...row, metadata: merged }),
                });
            }
        } else {
            console.log(`event  + ${stamp}  ${e.date}  ${e.name}  ${priceNote}`);
            if (!DRY) await sb('events', { method: 'POST', body: JSON.stringify(row) });
        }
    }

    const picks = EVENTS.filter(e => e.curated).length;
    console.log(`\n${EVENTS.length} events, ${picks} stamped as FF Picks, ${EVENTS.filter(e => !e.price).length} with price left null.`);
    if (DRY) console.log('Nothing was written. Re-run without --dry-run to apply.');
}

main().catch(e => { console.error('\nFAILED:', e.message); process.exit(1); });
