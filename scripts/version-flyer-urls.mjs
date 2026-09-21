/**
 * Append ?v=<sha256-16> to every upcoming event's flyer_url.
 *
 * Why this exists: the scrapers upload to flyers/<event_id>.jpg with upsert,
 * so a re-scrape changes an image's BYTES while its URL stays the same. Next's
 * image optimizer caches renders for 31 days keyed on (url, w, q), so the old
 * picture kept being served — and because the key includes width and quality,
 * it went stale per variant. That produced two different images for one event
 * on one page: The Regent's site header in the detail sheet (w=1200&q=90)
 * while the feed card (q=75) showed the correct flyer, and the same thing in
 * reverse on The Elysian's "Hottest Stand-Up Show", where the card was a stale
 * green Elysian graphic and the sheet was right.
 *
 * upload_flyer now emits ?v=<digest> itself. This backfills the rows written
 * before that, so the stale variants are evicted in one pass.
 *
 * Only upcoming events: a past event's artwork really is frozen, which is the
 * assumption next.config.mjs's TTL was written under, and re-hashing 1,666
 * historical flyers to fix nothing visible isn't worth the requests.
 *
 *   node scripts/version-flyer-urls.mjs --dry-run
 *   node scripts/version-flyer-urls.mjs
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
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' };

/** Today in LA — matches queries.ts, so "upcoming" means the same thing here. */
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());

let rows = [], off = 0;
while (true) {
    const r = await fetch(`${U}/rest/v1/events?select=id,event_name,flyer_url&flyer_url=not.is.null&event_date=gte.${today}&limit=1000&offset=${off}`, { headers: H });
    const page = await r.json();
    rows = rows.concat(page);
    if (page.length < 1000) break;
    off += 1000;
}
const todo = rows.filter(e => !/[?&]v=/.test(e.flyer_url));
console.log(`${rows.length} upcoming events with a flyer; ${todo.length} unversioned.\n`);

let done = 0, failed = 0, skipped = 0;
const LIMIT = 8;   // polite against Supabase storage

async function work(e) {
    try {
        const resp = await fetch(e.flyer_url);
        if (!resp.ok) { skipped++; console.log(`   skip ${resp.status}  ${e.event_name.slice(0, 44)}`); return; }
        const buf = Buffer.from(await resp.arrayBuffer());
        const v = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
        const sep = e.flyer_url.includes('?') ? '&' : '?';
        const url = `${e.flyer_url}${sep}v=${v}`;
        if (!DRY) {
            const p = await fetch(`${U}/rest/v1/events?id=eq.${e.id}`, { method: 'PATCH', headers: H, body: JSON.stringify({ flyer_url: url }) });
            if (!p.ok) throw new Error(await p.text());
        }
        done++;
        if (done <= 5 || done % 50 === 0) console.log(`   ${String(done).padStart(3)}  ${e.event_name.slice(0, 44).padEnd(46)} ?v=${v}`);
    } catch (err) {
        failed++;
        console.log(`   FAIL ${e.event_name.slice(0, 40)} — ${String(err.message).slice(0, 70)}`);
    }
}

const queue = [...todo];
await Promise.all(Array.from({ length: LIMIT }, async () => {
    while (queue.length) await work(queue.shift());
}));

console.log(`\nversioned ${done}, skipped ${skipped}, failed ${failed}`);
if (DRY) console.log('DRY RUN — nothing written.');
