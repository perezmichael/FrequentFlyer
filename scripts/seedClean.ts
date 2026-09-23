/**
 * Removes the QA stress-test seed batch (scripts/seed.ts) from the database —
 * the venues tagged metadata.source = 'seed_script' and every event /
 * recurring event that references them.
 *
 * Leaves untouched: the demo seed (seed_demo), the Culver City happy-hour
 * data, and anything entered by real users or the admin.
 *
 * Run with:  npm run seed:clean
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

const QA_SOURCE = 'seed_script';

async function main(): Promise<void> {
    const { data: venues, error } = await supabase
        .from('venues')
        .select('id, name')
        .eq('metadata->>source', QA_SOURCE);

    if (error) throw new Error('Failed to read QA-seeded venues: ' + error.message);

    const ids = (venues || []).map((v: { id: string }) => v.id);
    if (ids.length === 0) {
        console.log('No QA seed data found — nothing to clean.');
        return;
    }

    console.log(`Removing QA seed batch: ${ids.length} venues and their events…`);

    const { error: evErr } = await supabase.from('events').delete().in('venue_id', ids);
    if (evErr) throw new Error('Failed to delete QA events: ' + evErr.message);

    const { error: recErr } = await supabase.from('recurring_events').delete().in('venue_id', ids);
    if (recErr) throw new Error('Failed to delete QA recurring events: ' + recErr.message);

    const { error: venErr } = await supabase.from('venues').delete().in('id', ids);
    if (venErr) throw new Error('Failed to delete QA venues: ' + venErr.message);

    console.log('QA seed removed. Demo seed, Culver data, and real entries untouched. ✨');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
