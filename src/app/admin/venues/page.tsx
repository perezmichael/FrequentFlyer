import { supabase } from '@/lib/supabase';
import VenuesClient, { AdminVenue } from './VenuesClient';

export const dynamic = 'force-dynamic';

/**
 * Venue admin.
 *
 * Venues were read-only everywhere in the app — no update path, no action, no
 * UI — so every correction needed database access. That doesn't hold for
 * records the scout and flyer importer create on their own: vision misreads a
 * name ("De Rustic Inn" for Ye Rustic Inn), a DIY space isn't in OpenStreetMap
 * and lands with no pin, a street closure needs a real address.
 *
 * Sorted worst-first — no pin, then no neighborhood — because this page exists
 * to fix things, not to browse. The rows needing attention are the ones you
 * should see without scrolling.
 */
export default async function AdminVenuesPage() {
    const todayInLA = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles',
    }).format(new Date());

    const [venuesRes, eventsRes] = await Promise.all([
        supabase
            .from('venues')
            .select('id, name, neighborhood, address, url, instagram_handle, lat, lng')
            .order('name'),
        // Upcoming counts only: a venue with nothing on is far less urgent to
        // fix than one appearing in the feed this week.
        supabase
            .from('events')
            .select('venue_id')
            .eq('status', 'approved')
            .gte('event_date', todayInLA),
    ]);

    const counts = new Map<string, number>();
    for (const row of (eventsRes.data || []) as any[]) {
        if (row.venue_id) counts.set(row.venue_id, (counts.get(row.venue_id) || 0) + 1);
    }

    const venues: AdminVenue[] = ((venuesRes.data || []) as any[]).map(v => ({
        id: v.id,
        name: v.name || '',
        neighborhood: v.neighborhood || '',
        address: v.address || '',
        url: v.url || '',
        instagram_handle: v.instagram_handle || '',
        lat: v.lat ?? null,
        lng: v.lng ?? null,
        upcoming: counts.get(v.id) || 0,
    }));

    venues.sort((a, b) => {
        // Missing a pin is the problem that actually breaks something visible:
        // the map silently drops the venue.
        const aBroken = (a.lat == null ? 2 : 0) + (a.neighborhood ? 0 : 1);
        const bBroken = (b.lat == null ? 2 : 0) + (b.neighborhood ? 0 : 1);
        if (aBroken !== bBroken) return bBroken - aBroken;
        if (a.upcoming !== b.upcoming) return b.upcoming - a.upcoming;
        return a.name.localeCompare(b.name);
    });

    return <VenuesClient venues={venues} />;
}
