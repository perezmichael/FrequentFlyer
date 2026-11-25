/**
 * Seed the Instagram-sourced events for Thanksgiving weekend 2026 and the week
 * after (Thu 11/26 – Sun 12/6), with their flyers, and stamp the picks.
 *
 * Every event here was read off a poster by hand and checked against the web
 * where the web had anything. Most of these live only on Instagram, so for
 * many the poster is the only source — the fields copy what it prints and
 * nothing more. No time printed → start_time stays NULL. No price printed →
 * price stays out of metadata, same rule as seed-ff-picks.mjs.
 *
 * Flyers are read from flyer-inbox/thanksgiving-2026/ (gitignored). A missing
 * file is reported, and that event is still written without artwork — attach
 * it later by dropping the file in and re-running.
 *
 * Re-running is safe: venues and events are matched before anything is
 * created, existing rows only have blanks filled, and flyer uploads are
 * content-addressed.
 *
 * Usage:
 *   node scripts/seed-thanksgiving-2026.mjs --dry-run    # print the plan, write nothing
 *   node scripts/seed-thanksgiving-2026.mjs              # apply
 *
 * Credentials come from the environment (SUPABASE_URL, SUPABASE_SERVICE_KEY)
 * or, failing that, .env.local. In a cloud session where a network proxy
 * injects the key, pass any placeholder as SUPABASE_SERVICE_KEY.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = path.join(ROOT, 'flyer-inbox', 'thanksgiving-2026');
const BUCKET = 'event-flyers';

function loadEnv() {
    const file = path.join(ROOT, '.env.local');
    const fromFile = fs.existsSync(file)
        ? Object.fromEntries(
            fs.readFileSync(file, 'utf8').split('\n')
                .filter(l => l.includes('=') && !l.trim().startsWith('#'))
                .map(l => {
                    const i = l.indexOf('=');
                    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
                }))
        : {};
    return {
        url: process.env.SUPABASE_URL || fromFile.SUPABASE_URL,
        key: process.env.SUPABASE_SERVICE_KEY || fromFile.SUPABASE_SERVICE_KEY,
    };
}

const { url: SUPABASE_URL, key: KEY } = loadEnv();
if (!SUPABASE_URL || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing (env or .env.local)');

// Legacy service_role keys are JWTs and go in Authorization too. The newer
// sb_secret_ keys are not JWTs and are rejected there, so they ride in apikey
// alone — which is also all a header-injecting proxy fills in.
const AUTH = { apikey: KEY, ...(KEY.startsWith('eyJ') ? { Authorization: `Bearer ${KEY}` } : {}) };

async function sb(pathname, init = {}) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
        ...init,
        headers: { ...AUTH, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers || {}) },
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`${resp.status} ${pathname}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
}

/** Nominatim, same endpoint and LA bounds check as seed-ff-picks.mjs. */
async function geocode(query) {
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('q', query);
    u.searchParams.set('format', 'json');
    u.searchParams.set('limit', '1');
    try {
        const resp = await fetch(u, {
            headers: { 'User-Agent': 'FrequentFlyerLA/1.0 (https://frequentflyerla.com)' },
            signal: AbortSignal.timeout(15_000),
        });
        await new Promise(r => setTimeout(r, 1100)); // one request per second
        if (!resp.ok) return null;
        const hit = (await resp.json())?.[0];
        if (!hit) return null;
        const lat = Number(hit.lat), lng = Number(hit.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        if (!(lat > 33.6 && lat < 34.4 && lng > -118.9 && lng < -117.6)) return null;
        return { lat, lng };
    } catch {
        return null;
    }
}

/** Same normalisation as venue_key() in import_flyers.py: "&" == "and", punctuation ignored. */
const venueKey = s => (s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const PREFIX = 10;
function sameTitle(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length < PREFIX || b.length < PREFIX) return false;
    return a.startsWith(b.slice(0, PREFIX)) || b.startsWith(a.slice(0, PREFIX));
}

// ── Venues ──────────────────────────────────────────────────────────────────
// Existing rows are matched by name and only have blanks filled — the venue
// list is hand-curated. Every address is copied from a poster or the venue's
// own site; none is inferred.
const VENUES = [
    { name: 'Zebulon' }, // exists; nothing to fill from these posters
    { name: 'Blind Barber Highland Park', neighborhood: 'Highland Park', address: '5715 N Figueroa St, Los Angeles, CA 90042', url: 'https://blindbarber.com/pages/los-angeles-highland-park' },
    { name: 'Revenge Of', neighborhood: 'Glassell Park', address: '3420 Eagle Rock Blvd, Los Angeles, CA 90065' },
    { name: 'Slow Jamz Gallery', neighborhood: 'Arts District', address: '2448 E 8th St, Los Angeles, CA 90021' },
    { name: 'Café Santo', neighborhood: 'Montebello', address: '520 Whittier Blvd, Montebello, CA 90640' },
    { name: 'Kids of Immigrants', neighborhood: 'East Hollywood', address: '4873 Melrose Ave, Los Angeles, CA 90029' },
    { name: 'The Pop-Hop', neighborhood: 'Highland Park', address: '5002 York Blvd, Los Angeles, CA 90042', url: 'https://thepophop.com' },
    { name: 'York Manor', neighborhood: 'Highland Park', address: '4908 York Blvd, Los Angeles, CA 90042' },
    { name: 'Junior High', neighborhood: 'Glendale', address: '603 S Brand Blvd, Glendale, CA 91204', url: 'https://juniorhighlosangeles.com' },
    { name: 'Brain Dead Studios', neighborhood: 'Fairfax', address: '611 N Fairfax Ave, Los Angeles, CA 90036' },
    { name: 'Little Lions Social Club', neighborhood: 'Arts District', address: '689 Imperial St, Los Angeles, CA 90021', url: 'https://llsc.club' },
    { name: 'Senses Cafe', neighborhood: 'Downtown', address: '426 E 12th St, Los Angeles, CA 90015' },
    { name: 'Louma Bakery', neighborhood: 'Santa Monica', address: '3223 Wilshire Blvd, Santa Monica, CA 90403' },
];

// ── Events ──────────────────────────────────────────────────────────────────
// `pick: true` is the FF Picks stamp (curation_level 'ff_curated'), which is
// what /admin/kit's Picks tab builds the carousel from.
const EVENTS = [
    // Post 1 — Thu 11/26 to Sun 11/29
    {
        name: 'Damn the Man: F**k Black Friday — Free Pinball All Day',
        date: '2026-11-27', start: '11:00', end: '22:00', venue: 'Revenge Of',
        vibe: 'Community', price: 'Free', pick: true, score: 8,
        flyer: 'revenge-of-damn-the-man.jpg',
        description: 'Every pinball machine at Revenge Of is on free play all day — skip the doorbusters and give yourself the gift of pinball.',
    },
    {
        name: 'Dina 5 Hour Set',
        date: '2026-11-27', start: '21:00', end: '02:00', venue: 'Blind Barber Highland Park',
        vibe: 'DJ Night', price: 'Free before 10PM, $10 after', pick: true, score: 8,
        flyer: 'dina-5-hour-set.jpg', performers: ['Dina'],
        description: 'Dina plays five hours of perreo, hip-hop and dembow. Free before 10PM, $10 at the door after.',
    },
    {
        name: 'Black Friday Flea Market',
        date: '2026-11-27', start: '11:00', end: '16:00', venue: 'Slow Jamz Gallery',
        vibe: 'Market', pick: false, score: 6, promoter: 'Slow Jamz', age: 'All Ages',
        flyer: 'slow-jamz-flea.jpg',
        description: 'Clothes, merch, vintage, tattoos, a photobooth, food, drinks and music.',
    },
    ...['2026-11-27', '2026-11-28', '2026-11-29'].map(date => ({
        name: 'Black Friday Big Record Sale',
        date, start: '09:00', end: '13:00', venue: 'Café Santo',
        vibe: 'Market', pick: false, score: 6, promoter: 'El Marchante & Café Santo',
        flyer: 'black-friday-record-sale.jpg',
        description: '1,000+ records across Black Friday weekend, presented by El Marchante and Café Santo.',
    })),
    {
        name: 'Now Serving × Synonym Holiday Market',
        date: '2026-11-28', start: '10:00', end: '15:30', venue: 'Zebulon',
        vibe: 'Market', pick: true, score: 8, promoter: 'Now Serving & Synonym',
        flyer: 'now-serving-synonym.jpg',
        url: 'https://ma.to/event/synonym-holiday-market-28-nov-2026',
        description: 'A Shop Small Saturday holiday market from the Chinatown cookbook shop Now Serving and Synonym, with about 25 vendors including Perro y Arena.',
    },
    {
        name: 'Support Your Small Business Saturday',
        date: '2026-11-28', start: '12:00', end: '18:00', venue: 'Kids of Immigrants',
        vibe: 'Market', pick: true, score: 8, promoter: 'Kids of Immigrants',
        flyer: 'kids-of-immigrants.jpg', performers: ['Prabs', 'Jstagirl', 'Jive MF'],
        description: 'Kids of Immigrants and Mom n Dad Vintage Shop host 18 local vendors with food and drinks, sounds by Prabs, Jstagirl and Jive MF, and film portraits by Thalia Gochez.',
    },
    {
        name: 'We Met On York: Small Biz Market',
        date: '2026-11-28', start: '12:00', end: '17:00', venue: 'York Manor',
        vibe: 'Market', price: 'Free', pick: false, score: 7,
        flyer: 'we-met-on-york.jpg',
        description: 'A Small Business Saturday market with 40+ vendors — art and stationery, home goods, jewelry, vintage and clothing, food and drinks, interactive booths and a DJ.',
    },
    {
        name: 'Radical Clothes Swap',
        date: '2026-11-28', start: '12:00', end: '15:00', venue: 'The Pop-Hop',
        vibe: 'Community', price: 'Free', pick: false, score: 6,
        flyer: 'radical-clothes-swap.jpg',
        description: 'Free clothes for all. Swap up to 10 items — clothes only, no shoes, accessories, undergarments or hosiery.',
    },
    {
        name: 'Lo Girl — "The Fields EP" Release Party',
        date: '2026-11-29', start: '19:30', venue: 'Junior High',
        vibe: 'Live Music', price: '$13', pick: true, score: 8,
        flyer: 'lo-girl-the-fields.jpg', performers: ['Lo Girl', 'Roger Halloway', 'Jopenga'],
        description: 'Lo Girl celebrates The Fields EP with support from Roger Halloway and Jopenga, plus ceramics by Margaret Leyva and photos by Rebeca Castillo. Doors 7PM.',
    },
    {
        name: 'Brain Dead Ceramic Vendor Fair',
        date: '2026-11-29', start: '12:00', end: '17:00', venue: 'Brain Dead Studios',
        vibe: 'Market', pick: true, score: 8,
        flyer: 'brain-dead-ceramic-fair.jpg',
        description: 'A holiday ceramics fair on the Brain Dead Studios patio with Nonporous Ceramics, Gianni Lottie, Elias Hernandez, Beck Shadbourne, Zakka Bakka and more.',
    },
    {
        name: 'Jazz Cats Vol. 006',
        date: '2026-11-29', venue: 'Little Lions Social Club',
        vibe: 'Live Music', pick: true, score: 8, promoter: "JIJI's Jazz Club",
        flyer: 'jazz-cats-006.jpg', performers: ['noamz', 'yinomi'],
        url: 'https://llsc.club',
        description: "Tea, live music and a cat lounge — JIJI's Jazz Club at Little Lions Social Club with noamz and yinomi. Reservations only at LLSC.club.",
    },
    {
        name: 'Sexy Angel Music',
        date: '2026-11-29', start: '11:00', end: '16:00', venue: 'Senses Cafe',
        vibe: 'Live Music', price: 'Free', pick: false, score: 7,
        flyer: 'senses-sexy-angel-music.jpg', performers: ['Rachana', 'Executive Lunch'],
        description: 'A free daytime bill with Rachana, Executive Lunch and more. Food by Twentieth Street Garden, drinks by Senses.',
    },
    {
        name: 'Cars & Coffee',
        date: '2026-11-29', start: '08:00', end: '10:00', venue: 'Louma Bakery',
        vibe: 'Community', pick: false, score: 5, promoter: 'Louma Bakery × Kindred Motorworks',
        flyer: 'cars-and-coffee-louma.jpg',
        description: 'A Sunday-morning car meet from Louma Bakery and Kindred Motorworks.',
    },

    // Post 2 — Mon 11/30 to Sun 12/6
    {
        name: 'Gary Wilson',
        date: '2026-11-30', venue: 'Zebulon',
        vibe: 'Live Music', price: 'Free', pick: true, score: 9,
        flyer: 'gary-wilson-zebulon.jpg', performers: ['Gary Wilson'],
        description: 'A free night with Gary Wilson at Zebulon.',
    },
];

// ── Flyers ──────────────────────────────────────────────────────────────────
function sniffMime(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8) return ['image/jpeg', 'jpg'];
    if (buf[0] === 0x89 && buf[1] === 0x50) return ['image/png', 'png'];
    if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return ['image/webp', 'webp'];
    return null;
}

const flyerCache = new Map();
/** Content-addressed like upload_flyer() in import_flyers.py, so a re-run reuses the object. */
async function flyerUrl(file) {
    if (flyerCache.has(file)) return flyerCache.get(file);
    const full = path.join(INBOX, file);
    if (!fs.existsSync(full)) { flyerCache.set(file, null); return null; }
    const buf = fs.readFileSync(full);
    const sniffed = sniffMime(buf);
    if (!sniffed) throw new Error(`${file} is not a JPEG, PNG or WebP`);
    const [mime, ext] = sniffed;
    const digest = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
    const objectPath = `flyers/shared/${digest}.${ext}`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
    if (!DRY) {
        const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
            method: 'POST',
            headers: { ...AUTH, 'Content-Type': mime, 'x-upsert': 'true' },
            body: buf,
        });
        if (!resp.ok) throw new Error(`upload ${file}: ${resp.status} ${(await resp.text()).slice(0, 200)}`);
    }
    const result = { url: publicUrl, hash: digest };
    flyerCache.set(file, result);
    return result;
}

const hhmm = t => (t ? `${t}:00` : null);

async function main() {
    console.log(DRY ? '— DRY RUN, nothing will be written —\n' : '— APPLYING —\n');

    // 1. Venues
    const allVenues = await sb('venues?select=id,name,address,lat,lng,url');
    const venueIds = new Map();
    for (const v of VENUES) {
        const hit = allVenues.find(r => venueKey(r.name) === venueKey(v.name));
        if (hit) {
            const patch = {};
            if (v.address && !hit.address) patch.address = v.address;
            if (v.url && !hit.url) patch.url = v.url;
            if (v.address && (hit.lat == null || hit.lng == null)) {
                const geo = await geocode(v.address);
                if (geo) Object.assign(patch, geo);
            }
            const what = Object.keys(patch).length ? `fill ${Object.keys(patch).join(', ')}` : 'nothing to fill';
            console.log(`venue  = ${v.name}  (exists — ${what})`);
            if (!DRY && Object.keys(patch).length) {
                await sb(`venues?id=eq.${hit.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
            }
            venueIds.set(v.name, hit.id);
            continue;
        }
        const geo = await geocode(v.address);
        console.log(`venue  + ${v.name}  ${v.address}  ${geo ? `→ ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : '→ NO PIN (geocode failed)'}`);
        if (DRY) { venueIds.set(v.name, '(new)'); continue; }
        const [row] = await sb('venues', {
            method: 'POST',
            body: JSON.stringify({
                name: v.name,
                neighborhood: v.neighborhood,
                address: v.address,
                url: v.url || null,
                trust_tier: 'standard',
                metadata: { added_from: 'thanksgiving 2026 flyer seed' },
                ...(geo || {}),
            }),
        });
        venueIds.set(v.name, row.id);
    }

    // 2. Events
    console.log('');
    let created = 0, updated = 0, noFlyer = 0;
    for (const e of EVENTS) {
        const venueId = venueIds.get(e.venue);
        if (!venueId) { console.log(`event  ! ${e.name} — no venue row, skipped`); continue; }

        const flyer = e.flyer ? await flyerUrl(e.flyer) : null;
        if (e.flyer && !flyer) noFlyer++;

        // An exact title match on the same date counts across every venue (a
        // scraper may have filed the show under a sibling room). A loose
        // prefix match only counts at the SAME venue: "Black Friday Flea
        // Market" and "Black Friday Big Record Sale" share their first ten
        // letters, and matching them across venues overwrote one with the other.
        const sameDay = await sb(
            `events?select=id,event_name,venue_id,status,curation_level,flyer_url,metadata&event_date=eq.${e.date}`
        );
        const hit = sameDay.find(r => norm(r.event_name) === norm(e.name))
            || sameDay.find(r => r.venue_id === venueId && sameTitle(r.event_name, e.name));

        const metadata = {
            description: e.description,
            vibe_score: e.score,
            ...(e.price ? { price: e.price } : {}),
            ...(e.promoter ? { promoter: e.promoter } : {}),
            ...(e.age ? { age_restriction: e.age } : {}),
            ...(e.performers ? { performers_raw: e.performers.map(name => ({ name })) } : {}),
            ...(flyer ? { image_source: 'flyer import', image_hash: flyer.hash } : {}),
            added_by: 'editor',
            source: 'instagram flyer, hand-verified',
        };
        const row = {
            event_name: e.name,
            event_date: e.date,
            start_time: hhmm(e.start),
            end_time: hhmm(e.end),
            venue_id: venueId,
            event_vibe: e.vibe,
            source_url: e.url || null,
            status: 'approved',
            curation_level: e.pick ? 'ff_curated' : 'scraped',
            ...(flyer ? { flyer_url: flyer.url } : {}),
            metadata,
        };

        const stamp = e.pick ? '★ pick' : '  list';
        const when = `${e.date} ${e.start || '--:--'}`;
        const art = flyer ? '' : '  [NO FLYER — file missing]';

        if (hit) {
            console.log(`event  ~ ${stamp}  ${when}  ${e.name}  [updating existing row "${hit.event_name}"]${art}`);
            if (!DRY) {
                // Never overwrite artwork that's already there.
                const patch = { ...row, metadata: { ...(hit.metadata || {}), ...metadata } };
                if (hit.flyer_url) delete patch.flyer_url;
                await sb(`events?id=eq.${hit.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
            }
            updated++;
        } else {
            console.log(`event  + ${stamp}  ${when}  ${e.name} @ ${e.venue}${art}`);
            if (!DRY) await sb('events', { method: 'POST', body: JSON.stringify(row) });
            created++;
        }
    }

    const picks = EVENTS.filter(e => e.pick).length;
    console.log(`\n${created} new, ${updated} updated, ${picks} stamped as FF Picks, ${noFlyer} still waiting on a flyer file.`);
    if (DRY) console.log('Nothing was written. Re-run without --dry-run to apply.');
}

main().catch(err => { console.error(err); process.exit(1); });
