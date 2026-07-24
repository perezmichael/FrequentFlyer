import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';

/**
 * Agent ingestion endpoint — "bring your own scraper" for Frequent Flyer.
 *
 * Unlike a raw, anon-key Supabase table write, this runs server-side with the
 * service key (never exposed) and inserts everything into the *pending* queue,
 * so the existing admin moderation flow still gates what goes live. Agents POST
 * JSON here; humans approve in /admin.
 *
 * POST body: { events: AgentEvent[] }  (or a single AgentEvent object)
 * Dedup key: source_url (also stored in metadata).
 */

export const runtime = 'nodejs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MAX_BATCH = 50;

// LA County-ish bounding box. Outside this, coordinates are dropped (the event
// still lists, just without a map pin) rather than placed at a fake point.
const LA_BOX = { latMin: 33.6, latMax: 34.5, lngMin: -118.95, lngMax: -117.6 };

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400, headers: CORS });
    }

    const raw = (body as { events?: unknown })?.events ?? body;
    const list = Array.isArray(raw) ? raw : [raw];
    if (list.length === 0) {
        return NextResponse.json({ error: 'No events provided.' }, { status: 400, headers: CORS });
    }
    if (list.length > MAX_BATCH) {
        return NextResponse.json({ error: `Too many events — max ${MAX_BATCH} per request.` }, { status: 400, headers: CORS });
    }

    const today = new Date().toISOString().slice(0, 10);
    let inserted = 0;
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const item of list) {
        const e = (item ?? {}) as Record<string, unknown>;
        const title = str(e.title).slice(0, 200);
        const date = str(e.date);
        const sourceUrl = str(e.source_url || e.url);
        const label = title || sourceUrl || 'untitled';

        // Validation
        if (!title) { errors.push(`${label}: missing title`); continue; }
        if (!DATE_RE.test(date)) { errors.push(`${label}: bad date (need YYYY-MM-DD)`); continue; }
        if (!sourceUrl) { errors.push(`${label}: missing source_url (the dedup key)`); continue; }
        if (date < today) { skipped.push(`${label}: in the past`); continue; }

        const startTime = TIME_RE.test(str(e.start_time)) ? str(e.start_time) : null;
        const endTime = TIME_RE.test(str(e.end_time)) ? str(e.end_time) : null;
        const vibe = VIBE_KEYS.includes(str(e.vibe)) ? str(e.vibe) : 'Community';
        const description = str(e.description).slice(0, 1000) || null;
        const venueName = str(e.venue_name || e.location).slice(0, 200) || 'TBA';
        const neighborhood = str(e.neighborhood).slice(0, 120) || 'Los Angeles';
        const postedBy = str(e.posted_by).slice(0, 60) || 'agent';

        let lat = num(e.lat);
        let lng = num(e.lng);
        if (lat === null || lng === null || lat < LA_BOX.latMin || lat > LA_BOX.latMax || lng < LA_BOX.lngMin || lng > LA_BOX.lngMax) {
            lat = null;
            lng = null;
        }

        try {
            // Dedup by source_url across any prior agent insert.
            const { data: dup } = await supabase
                .from('events')
                .select('id')
                .eq('metadata->>source_url', sourceUrl)
                .limit(1);
            if (dup && dup.length > 0) { skipped.push(`${label}: duplicate`); continue; }

            // Resolve venue by name (case-insensitive), else create one.
            let venueId: string | null = null;
            const { data: vfound } = await supabase
                .from('venues')
                .select('id')
                .ilike('name', venueName)
                .limit(1);
            if (vfound && vfound.length > 0) {
                venueId = vfound[0].id;
            } else {
                const venueRow: Record<string, unknown> = { name: venueName, neighborhood, metadata: { source: 'agent' } };
                if (lat !== null && lng !== null) { venueRow.lat = lat; venueRow.lng = lng; }
                const { data: vnew, error: verr } = await supabase
                    .from('venues')
                    .insert(venueRow)
                    .select('id')
                    .single();
                if (verr || !vnew) { errors.push(`${label}: venue create failed`); continue; }
                venueId = vnew.id;
            }

            const { error: insErr } = await supabase.from('events').insert({
                event_name: title,
                event_date: date,
                start_time: startTime,
                end_time: endTime,
                event_vibe: vibe,
                venue_id: venueId,
                flyer_url: null,
                status: 'pending',
                metadata: { source: 'agent', source_url: sourceUrl, posted_by: postedBy, justification: description },
            });
            if (insErr) { errors.push(`${label}: ${insErr.message}`); continue; }
            inserted += 1;
        } catch (err) {
            errors.push(`${label}: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }

    return NextResponse.json(
        { inserted, skipped: skipped.length, duplicates: skipped.filter((s) => s.endsWith('duplicate')).length, errors, note: 'Inserted events enter the moderation queue and go live once approved.' },
        { status: 200, headers: CORS },
    );
}
