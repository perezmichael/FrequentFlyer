/**
 * The engine behind the hand-verified flyer seeds (scripts/seed-*-2026*.mjs).
 *
 * A seed script is just data — VENUES and EVENTS — plus a call to runSeed().
 * This file does the rest: match before create, fill only blanks on existing
 * rows, never overwrite artwork, content-address flyer uploads, and print a
 * dry run that says exactly what would change.
 *
 * Credentials come from the environment (SUPABASE_URL, SUPABASE_SERVICE_KEY)
 * or, failing that, .env.local. In a cloud session where a network proxy
 * injects the key, pass any placeholder as SUPABASE_SERVICE_KEY and run Node
 * with NODE_USE_ENV_PROXY=1.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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

function sniffMime(buf) {
    if (buf[0] === 0xff && buf[1] === 0xd8) return ['image/jpeg', 'jpg'];
    if (buf[0] === 0x89 && buf[1] === 0x50) return ['image/png', 'png'];
    if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return ['image/webp', 'webp'];
    return null;
}

const hhmm = t => (t ? `${t}:00` : null);

/**
 * @param {object} opts
 * @param {string} opts.inbox    folder of flyer files, relative to the repo root
 * @param {string} opts.source   metadata.source stamp for every event written
 * @param {Array}  opts.venues   { name, neighborhood?, address?, url?, geocodeQuery? }
 * @param {Array}  opts.events   { name, date, start?, end?, venue, vibe, pick, score,
 *                                 price?, promoter?, age?, performers?, flyer?, url?, description }
 */
export async function runSeed({ inbox, source, venues, events }) {
    const DRY = process.argv.includes('--dry-run');
    const INBOX = path.join(ROOT, inbox);
    const { url: SUPABASE_URL, key: KEY } = loadEnv();
    if (!SUPABASE_URL || !KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing (env or .env.local)');

    // Legacy service_role keys are JWTs and go in Authorization too. The newer
    // sb_secret_ keys are not JWTs and are rejected there, so they ride in
    // apikey alone — which is also all a header-injecting proxy fills in.
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

    console.log(DRY ? '— DRY RUN, nothing will be written —\n' : '— APPLYING —\n');

    // 1. Venues — matched by normalised name; existing rows only have blanks filled.
    const allVenues = await sb('venues?select=id,name,address,lat,lng,url');
    const venueIds = new Map();
    for (const v of venues) {
        const hit = allVenues.find(r => venueKey(r.name) === venueKey(v.name));
        const query = v.geocodeQuery || v.address;
        if (hit) {
            const patch = {};
            if (v.address && !hit.address) patch.address = v.address;
            if (v.url && !hit.url) patch.url = v.url;
            if (query && (hit.lat == null || hit.lng == null)) {
                const geo = await geocode(query);
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
        const geo = query ? await geocode(query) : null;
        console.log(`venue  + ${v.name}  ${v.address || ''}  ${geo ? `→ ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}` : '→ NO PIN (geocode failed)'}`);
        if (DRY) { venueIds.set(v.name, '(new)'); continue; }
        const [row] = await sb('venues', {
            method: 'POST',
            body: JSON.stringify({
                name: v.name,
                neighborhood: v.neighborhood,
                address: v.address || null,
                url: v.url || null,
                trust_tier: 'standard',
                metadata: { added_from: source },
                ...(geo || {}),
            }),
        });
        venueIds.set(v.name, row.id);
    }

    // 2. Events
    console.log('');
    let created = 0, updated = 0, noFlyer = 0;
    for (const e of events) {
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
            source,
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

    const picks = events.filter(e => e.pick).length;
    console.log(`\n${created} new, ${updated} updated, ${picks} stamped as FF Picks, ${noFlyer} still waiting on a flyer file.`);
    if (DRY) console.log('Nothing was written. Re-run without --dry-run to apply.');
}
