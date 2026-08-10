#!/usr/bin/env node
/**
 * Remove orphaned talent rows that can never become useful.
 *
 *   node scripts/clean-talent.mjs             # dry run, writes nothing
 *   node scripts/clean-talent.mjs --apply     # back up, then delete
 *
 * Background: `talent` accumulated 1,236 rows that no `event_talent` row
 * references. Two bugs produced them — the flyer importer called
 * upsert_performers() outside its `apply` guard, so every --dry-run minted
 * talent it never linked; and it upserted a bill before checking that the
 * event insert had actually returned an id. Both are fixed in
 * services/annex_scout/import_flyers.py; this clears what they left behind.
 *
 * What this deliberately does NOT delete: an orphan with a plausible single
 * artist name. upsert_performers matches on_conflict="name", so the next time
 * that act is scraped the existing row is adopted and becomes linked — the
 * orphans are a working name cache, and 132 of them already carry an
 * Instagram handle someone would otherwise have to re-collect.
 *
 * Only rows that can never heal are removed:
 *   - unsplit bills (2+ commas, or longer than any real act name)
 *   - a row whose name duplicates one that is already linked
 *   - duplicates among the orphans themselves (the best copy is kept)
 *
 * Linked rows are never touched, and membership is re-checked immediately
 * before the delete rather than trusted from the earlier read.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_KEY in .env.local');
    process.exit(1);
}

/** Longest name on a real bill is 30 chars ("WILL SHEFF (OF OKKERVIL RIVER)"). */
const MAX_ACT_NAME = 60;

const norm = s => (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

/**
 * Any comma means a list. Of the 421 rows actually attached to an event, none
 * contains a comma; 174 orphans are plain two-act bills ("MONOLORD, MIZMOR").
 * Matches the guard in master_scout.upsert_performers().
 */
const isUnsplitBill = n => (n || '').length > MAX_ACT_NAME || (n || '').includes(',');

async function all(table, cols) {
    const out = [];
    for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
        if (error) throw new Error(`${table}: ${error.message}`);
        out.push(...data);
        if (data.length < 1000) return out;
    }
}

const talent = await all('talent', '*');
const links = await all('event_talent', 'talent_id');
const linkedIds = new Set(links.map(r => r.talent_id));
const linkedNames = new Set(talent.filter(t => linkedIds.has(t.id)).map(t => norm(t.name)));

const doomed = [];
const keptOrphans = [];
const seen = new Map();

for (const t of talent) {
    if (linkedIds.has(t.id)) continue;           // live row — never a candidate
    const name = t.name || '';

    if (isUnsplitBill(name)) { doomed.push({ ...t, _why: 'unsplit bill' }); continue; }
    if (linkedNames.has(norm(name))) { doomed.push({ ...t, _why: 'duplicate of a linked row' }); continue; }

    const prior = seen.get(norm(name));
    if (prior) {
        // Keep whichever copy carries more; drop the other.
        const better = (t.instagram_handle || '').trim() && !(prior.instagram_handle || '').trim();
        if (better) {
            doomed.push({ ...prior, _why: 'duplicate orphan (kept the one with a handle)' });
            seen.set(norm(name), t);
            keptOrphans[keptOrphans.indexOf(prior)] = t;
        } else {
            doomed.push({ ...t, _why: 'duplicate orphan' });
        }
        continue;
    }
    seen.set(norm(name), t);
    keptOrphans.push(t);
}

const by = {};
for (const d of doomed) by[d._why] = (by[d._why] || 0) + 1;

console.log(`talent rows          ${talent.length}`);
console.log(`  linked (untouched) ${talent.length - (doomed.length + keptOrphans.length)}`);
console.log(`  orphans kept       ${keptOrphans.length}   (will self-heal when re-scraped)`);
console.log(`  to delete          ${doomed.length}`);
for (const [why, n] of Object.entries(by).sort((a, b) => b[1] - a[1])) {
    console.log(`      ${String(n).padStart(4)}  ${why}`);
}

console.log('\nsample of what would go:');
for (const d of doomed.slice(0, 8)) console.log(`   [${d._why}] ${(d.name || '').slice(0, 80)}`);

if (!APPLY) {
    console.log('\nDry run — nothing written. Re-run with --apply to delete.');
    process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backup = `talent-backup-${stamp}.json`;
writeFileSync(backup, JSON.stringify(doomed, null, 2));
console.log(`\nBacked up ${doomed.length} rows to ${backup}`);

let deleted = 0;
for (let i = 0; i < doomed.length; i += 100) {
    const batch = doomed.slice(i, i + 100);
    // Re-check linkage at the last moment: the scout runs nightly and may have
    // adopted one of these names between the read above and this delete.
    const ids = batch.map(d => d.id);
    const { data: nowLinked } = await sb.from('event_talent').select('talent_id').in('talent_id', ids);
    const safe = ids.filter(id => !(nowLinked || []).some(r => r.talent_id === id));
    if (safe.length !== ids.length) {
        console.log(`   ↷ skipping ${ids.length - safe.length} row(s) that gained a link since the read`);
    }
    if (!safe.length) continue;
    const { error } = await sb.from('talent').delete().in('id', safe);
    if (error) { console.error(`   ✗ batch failed: ${error.message}`); continue; }
    deleted += safe.length;
}

console.log(`Deleted ${deleted} orphaned rows. Restore from ${backup} if needed.`);
