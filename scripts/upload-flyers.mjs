#!/usr/bin/env node
/**
 * Upload hand-dropped flyers from flyer-inbox/ and attach them to their events.
 *
 *   node scripts/upload-flyers.mjs
 *
 * Editor-supplied flyers can't come through the scout — it only ever takes an
 * image from the event's own page. This is the manual lane: a named file maps
 * to a known event, so a flyer is never matched by guesswork.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, basename, join } from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = 'event-flyers';
const INBOX = 'flyer-inbox';
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local');
    process.exit(1);
}

/** Filename stem → the exact event names it belongs to. */
const MAP = {
    'girls-build-night': ['Girls* Build Night'],
    'chirla-benefit': ['Free Benefit Show for CHIRLA'],
    'canyon-sundays': [
        'Canyon Sunday Pop-Up: Bruce',
        'Canyon Sunday Pop-Up: Seedy',
        'Canyon Sunday Pop-Up: Nice Bite',
        'Canyon Sunday Pop-Up: La Burg',
    ],
    'welcome-home': ['welcome home!'],
    'singles-party': ['Singles Party: Lesbian Edition'],
};

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

/** Trust the bytes, not the extension. */
function sniff(buf) {
    if (buf.length < 12) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8) return { ext: 'jpg', mime: 'image/jpeg' };
    if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
    if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
    if (buf.slice(0, 6).toString() === 'GIF89a' || buf.slice(0, 6).toString() === 'GIF87a') return { ext: 'gif', mime: 'image/gif' };
    return null;
}

async function findEvent(name) {
    const url = `${SUPABASE_URL}/rest/v1/events?select=id,event_name,event_date&event_name=eq.${encodeURIComponent(name)}`;
    const rows = await (await fetch(url, { headers })).json();
    return Array.isArray(rows) ? rows : [];
}

async function upload(digest, buf, mime, ext) {
    // Keyed by content, not by event. One flyer advertising four Sundays is a
    // single object with a single URL, so the feed's repeat-detection (which
    // compares image URLs) can tell those cards share a picture and render the
    // branded card for the repeats instead of four identical tiles.
    const path = `flyers/shared/${digest}.${ext}`;
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': mime, 'x-upsert': 'true' },
        body: buf,
    });
    if (!res.ok) throw new Error(`upload ${res.status}: ${(await res.text()).slice(0, 160)}`);
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function attach(eventId, flyerUrl, bytes, digest) {
    // metadata is a jsonb blob — read and merge so the description and price
    // written when the event was created survive the update.
    const current = await (await fetch(`${SUPABASE_URL}/rest/v1/events?select=metadata&id=eq.${eventId}`, { headers })).json();
    const metadata = {
        ...(current[0]?.metadata || {}),
        // Provenance, so a wrong flyer stays traceable to how it got here.
        image_source: 'editor upload',
        image_bytes: bytes,
        image_hash: digest,
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${eventId}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ flyer_url: flyerUrl, metadata }),
    });
    if (!res.ok) throw new Error(`attach ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

async function main() {
    if (!existsSync(INBOX)) {
        console.error(`No ${INBOX}/ folder. Create it and drop flyers in.`);
        process.exit(1);
    }

    const files = readdirSync(INBOX).filter(f => !f.startsWith('.') && f !== 'README.md');
    if (!files.length) {
        console.log(`${INBOX}/ is empty — nothing to upload.`);
        return;
    }

    let attached = 0;
    const unknown = [];

    for (const file of files) {
        const stem = basename(file, extname(file)).toLowerCase();
        const targets = MAP[stem];
        if (!targets) { unknown.push(file); continue; }

        const buf = readFileSync(join(INBOX, file));
        const digest = createHash('sha1').update(buf).digest('hex').slice(0, 16);
        const kind = sniff(buf);
        if (!kind) { console.log(`SKIP  ${file} — not a recognisable image`); continue; }
        if (buf.length < 1500) { console.log(`SKIP  ${file} — ${buf.length} bytes, too small to be a real flyer`); continue; }

        for (const name of targets) {
            const events = await findEvent(name);
            if (!events.length) { console.log(`MISS  ${file} → no event named "${name}"`); continue; }
            for (const ev of events) {
                if (DRY_RUN) {
                    console.log(`DRY   ${file} (${kind.ext}, ${Math.round(buf.length / 1024)}kb) → ${ev.event_name} (${ev.event_date})`);
                    attached++;
                    continue;
                }
                try {
                    const url = await upload(digest, buf, kind.mime, kind.ext);
                    await attach(ev.id, url, buf.length, digest);
                    console.log(`OK    ${file} → ${ev.event_name} (${ev.event_date})`);
                    attached++;
                } catch (err) {
                    console.log(`FAIL  ${file} → ${ev.event_name}: ${err.message}`);
                }
            }
        }
    }

    if (unknown.length) {
        console.log(`\nUnrecognised filenames (skipped, never guessed):`);
        unknown.forEach(f => console.log(`  ${f}`));
        console.log(`Expected stems: ${Object.keys(MAP).join(', ')}`);
    }
    console.log(DRY_RUN
        ? `\n${attached} event${attached === 1 ? '' : 's'} would get a flyer. Re-run without --dry-run to apply.`
        : `\n${attached} event${attached === 1 ? '' : 's'} now has a flyer.`);
}

main().catch(err => { console.error(err); process.exit(1); });
