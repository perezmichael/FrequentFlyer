/**
 * Bump ?v= on any flyer whose CDN-cached Content-Type no longer matches the
 * type actually stored in Supabase.
 *
 * Companion to fix-flyer-content-types.mjs. That script corrects the stored
 * mimetype; this one makes the app ask for a URL Cloudflare hasn't cached the
 * old header against. Without it the fix is invisible to browsers that already
 * hold the stale response — which is the whole failure mode being repaired.
 *
 * Ground truth is the storage metadata API, never an HTTP header. Cloudflare on
 * this project does not reliably treat an unknown query param as a new cache
 * key, so a "cache-busted" GET can still return the old response — which made
 * an earlier audit report 124 objects as unfixed when their stored mimetype was
 * already correct.
 *
 *   node scripts/refresh-flyer-cache-keys.mjs --dry-run
 *   node scripts/refresh-flyer-cache-keys.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DRY = process.argv.includes('--dry-run');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n')
        .filter(l => l.includes('=') && !l.trim().startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const U = env.SUPABASE_URL, K = env.SUPABASE_SERVICE_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };
const JSONH = { ...H, 'Content-Type': 'application/json' };

/** Every object under flyers/, with the mimetype Supabase actually stores. */
async function storedTypes() {
    const out = new Map();
    for (const prefix of ['flyers', 'flyers/shared']) {
        let offset = 0;
        while (true) {
            const r = await fetch(`${U}/storage/v1/object/list/event-flyers`, {
                method: 'POST', headers: JSONH,
                body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
            });
            const page = await r.json();
            if (!Array.isArray(page) || page.length === 0) break;
            for (const o of page) if (o.metadata?.mimetype) out.set(`${prefix}/${o.name}`, o.metadata.mimetype);
            if (page.length < 100) break;
            offset += 100;
        }
    }
    return out;
}

const stored = await storedTypes();
console.log(`${stored.size} stored objects read from the metadata API\n`);

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
let rows = [], off = 0;
while (true) {
    const r = await fetch(`${U}/rest/v1/events?select=id,event_name,flyer_url&flyer_url=not.is.null&event_date=gte.${today}&limit=1000&offset=${off}`, { headers: H });
    const page = await r.json();
    rows = rows.concat(page);
    if (page.length < 1000) break;
    off += 1000;
}

let bumped = 0, fine = 0, unknown = 0, failed = 0;
const LIMIT = 2;
const MARKER = '/storage/v1/object/public/event-flyers/';

async function work(e) {
    try {
        const u = new URL(e.flyer_url);
        if (!u.pathname.includes(MARKER)) return;
        const objectPath = decodeURIComponent(u.pathname.split(MARKER)[1]);
        const real = stored.get(objectPath);
        if (!real) { unknown++; return; }

        // Supabase rate-limits a burst of HEADs and answers application/json.
        // Treating that as a mismatch would bump keys that are already fine, so
        // back off and re-ask rather than believe the first answer.
        let served = null;
        for (let attempt = 0; attempt < 4; attempt++) {
            served = (await fetch(e.flyer_url, { method: 'HEAD' }))
                .headers.get('content-type')?.split(';')[0].trim();
            if (served && served.startsWith('image/')) break;
            await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
            served = null;
        }
        if (!served) { unknown++; return; }
        if (served === real) { fine++; return; }

        // New key, so the browser and the CDN both fetch the corrected header.
        const v = crypto.createHash('sha256').update(objectPath).update('|' + real)
            .update('|' + Date.now()).digest('hex').slice(0, 16);
        console.log(`   cached ${served} → stored ${real.padEnd(11)} ${e.event_name.slice(0, 42)}`);
        if (!DRY) {
            const r = await fetch(`${U}/rest/v1/events?id=eq.${e.id}`, {
                method: 'PATCH', headers: JSONH,
                body: JSON.stringify({ flyer_url: `${u.origin}${u.pathname}?v=${v}` }),
            });
            if (!r.ok) throw new Error((await r.text()).slice(0, 80));
        }
        bumped++;
    } catch (err) { failed++; console.log(`   FAIL ${e.event_name.slice(0, 34)} — ${String(err.message).slice(0, 50)}`); }
}

const q = [...rows];
await Promise.all(Array.from({ length: LIMIT }, async () => { while (q.length) await work(q.shift()); }));
console.log(`\nbumped ${bumped}, already serving the right type ${fine}, not in storage ${unknown}, failed ${failed}`);
if (DRY) console.log('DRY RUN — nothing written.');
