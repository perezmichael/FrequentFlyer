import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Log an outbound click.
 *
 * The only honest interest signal available without user accounts. Everything
 * else stored about an event is a prediction — vibe_score is the scout's guess,
 * curation is the editor's opinion. This is the one number that says a real
 * person wanted to go.
 *
 * It's also the evidence base for the venue conversation: "I sent you 40 people
 * last month" needs a table, and the UTM tags on the outbound link mean the
 * venue can verify the same number in their own analytics rather than taking
 * ours on faith.
 *
 * Deliberately stores no IP, user agent, or cookie. The question is "did anyone
 * want this event", which needs a count, not a person.
 */

// The click has to be recorded as it happens; there's nothing to cache.
export const dynamic = 'force-dynamic';

const SURFACES = new Set(['event_page', 'detail_sheet', 'map_popup']);

export async function POST(req: NextRequest) {
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const eventId = typeof body?.eventId === 'string' ? body.eventId : null;
    const surface = SURFACES.has(body?.surface) ? body.surface : null;
    const destination = typeof body?.destination === 'string'
        ? body.destination.slice(0, 500)
        : null;

    // A click with no event is noise — most likely a bot posting at the
    // endpoint rather than a person leaving a listing.
    if (!eventId) return NextResponse.json({ ok: false }, { status: 400 });

    // Resolve the venue server-side rather than trusting the client, so the
    // per-venue referral totals can't be inflated by anyone posting here.
    const { data: event } = await supabase
        .from('events')
        .select('venue_id')
        .eq('id', eventId)
        .maybeSingle();

    if (!event) return NextResponse.json({ ok: false }, { status: 404 });

    const { error } = await supabase.from('link_clicks').insert({
        event_id: eventId,
        venue_id: event.venue_id ?? null,
        destination,
        surface,
    });

    // Never surface a failure to the user — they're mid-navigation to a ticket
    // page, and a logging problem must not look like a broken link.
    if (error) console.error('link_clicks insert failed:', error.message);

    return NextResponse.json({ ok: true });
}
