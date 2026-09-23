/**
 * Re-store any flyer whose Content-Type doesn't match its own bytes.
 *
 * upload_flyer labelled every upload "image/jpeg" regardless of what it had
 * downloaded, and most venue CDNs now serve WebP or PNG. Browsers sniff for
 * <img>, so the public feed always looked right — but a canvas is stricter.
 * WebKit refuses to decode a PNG declared as JPEG, so /admin/kit fell back to
 * the branded card for exactly those events, which reads as the flyer not
 * having saved. Chromium sniffs and shows them, which is why it looked
 * intermittent and browser-specific.
 *
 * Every read here is cache-busted and every write is verified by re-reading.
 * An earlier version of this script did neither: it read through the CDN,
 * trusted a 200 on the upload, and reported 126 fixes that had not landed.
 *
 * The object path keeps its .jpg spelling — Supabase serves from the stored
 * content-type, not the extension, so renaming would churn every flyer URL to
 * fix nothing. Bytes are never modified.
 *
 *   node scripts/fix-flyer-content-types.mjs --dry-run
 *   node scripts/fix-flyer-content-types.mjs
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
const BUCKET = 'event-flyers';
const MARKER = `/storage/v1/object/public/${BUCKET}/`;
// venues/ too: a venue photo is the fallback when an event has no flyer, so a
// mislabelled one breaks the kit exactly the same way. 19 of 27 were wrong.
const PREFIXES = ['flyers', 'flyers/shared', 'venues'];

/** Magic-number sniff, mirroring sniff_image_mime in the three scouts. */
function sniff(b) {
    if (!b || b.length < 12) return null;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
    if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
    if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'image/webp';
    return null;
}
/** Always go past Cloudflare — a cached header is what made this invisible. */
const fresh = (origin, pathname) => `${origin}${pathname}?b=${crypto.randomUUID()}`;

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
let rows = [], off = 0;
while (true) {
    const r = await fetch(`${U}/rest/v1/events?select=id,event_name,flyer_url&flyer_url=not.is.null&event_date=gte.${today}&limit=1000&offset=${off}`, { headers: H });
    const page = await r.json();
    rows = rows.concat(page);
    if (page.length < 1000) break;
    off += 1000;
}
// One object can back several event rows; fix each object once.
const byObject = new Map();
for (const e of rows) {
    try {
        const u = new URL(e.flyer_url);
        if (!u.pathname.includes(MARKER)) continue;
        const objectPath = decodeURIComponent(u.pathname.split(MARKER)[1]);
        if (!byObject.has(objectPath)) byObject.set(objectPath, { origin: u.origin, pathname: u.pathname, name: e.event_name });
    } catch { /* not a URL we own */ }
}
console.log(`${rows.length} upcoming flyers → ${byObject.size} distinct objects\n`);

let fixed = 0, already = 0, failed = 0, unknown = 0;
const entries = [...byObject.entries()];
const LIMIT = 4;   // low, so Supabase never answers with a JSON error we'd misread

async function work([objectPath, meta]) {
    try {
        const r = await fetch(fresh(meta.origin, meta.pathname));
        if (!r.ok) { failed++; return; }
        const served = (r.headers.get('content-type') || '').split(';')[0].trim();
        const buf = Buffer.from(await r.arrayBuffer());
        const real = sniff(buf);
        if (!real) { unknown++; return; }
        if (real === served) { already++; return; }

        if (!DRY) {
            const up = await fetch(`${meta.origin}/storage/v1/object/${BUCKET}/${encodeURI(objectPath)}`, {
                method: 'PUT', headers: { ...H, 'Content-Type': real }, body: buf,
            });
            if (!up.ok) throw new Error((await up.text()).slice(0, 80));
            // Verify rather than trust the 200.
            const after = (await fetch(fresh(meta.origin, meta.pathname), { method: 'HEAD' }))
                .headers.get('content-type')?.split(';')[0].trim();
            if (after !== real) throw new Error(`still ${after}`);
        }
        console.log(`   ${served} → ${real.padEnd(11)} ${meta.name.slice(0, 44)}`);
        fixed++;
    } catch (err) {
        failed++;
        console.log(`   FAIL ${meta.name.slice(0, 38)} — ${String(err.message).slice(0, 56)}`);
    }
}

const q = [...entries];
await Promise.all(Array.from({ length: LIMIT }, async () => { while (q.length) await work(q.shift()); }));
console.log(`\nfixed ${fixed}, already correct ${already}, unrecognised ${unknown}, failed ${failed}`);
if (DRY) console.log('DRY RUN — nothing written.');
