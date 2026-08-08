import 'server-only';
import { supabase } from '@/lib/supabase';
import { Event, formatPrice } from '@/features/frequent-flyer/data/events';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';
import { RecurringEvent } from '@/features/frequent-flyer/data/recurringEvents';

/** Today's date (YYYY-MM-DD) in LA — event dates are LA-local, server may be UTC. */
function todayInLA(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
}

export async function getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select(`
      id,
      event_name,
      event_date,
      start_time,
      end_time,
      event_vibe,
      flyer_url,
      source_url,
      curation_level,
      metadata,
      venues (
        name,
        neighborhood,
        lat,
        lng,
        url,
        image_url
      )
    `)
        .order('event_date', { ascending: true })
        .eq('status', 'approved')
        // Auto-expiry: past events fall out of the feed without manual cleanup.
        .gte('event_date', todayInLA());

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }

    return data.map((e: any) => ({
        id: e.id,
        title: e.event_name,
        date: e.event_date,
        startTime: e.start_time || null,
        endTime: e.end_time || null,
        location: `${e.venues?.name || 'Unknown'}, ${e.venues?.neighborhood || 'LA'}`,
        // metadata.description is the public listing copy. metadata.justification
        // is the scout's INTERNAL vibe-score rationale — it used to be shown here,
        // which is why descriptions read as AI commentary about the event rather
        // than about what actually happens. Never surface it.
        description: e.metadata?.description || 'No description available',
        price: formatPrice(e.metadata?.price),
        // Never invent coordinates: an un-geocoded venue is skipped on the
        // map, not dropped onto a downtown default.
        lat: e.venues?.lat ?? null,
        lng: e.venues?.lng ?? null,
        // Flyer first; then a real photo of the venue the event is at (honest
        // and relevant, unlike the stock art the old image search produced);
        // the branded typographic card is the floor.
        image: e.flyer_url || e.venues?.image_url || '/placeholder.jpg',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        vibe: e.event_vibe ? [e.event_vibe] : ['Event'],
        // Prefer the event's own page (scraped source_url) over the venue calendar.
        url: e.source_url || e.venues?.url,
        curationLevel: e.curation_level || 'scraped',
        vibeScore: typeof e.metadata?.vibe_score === 'number' ? e.metadata.vibe_score : null,
        // A time-boxed grouping (a festival week, an art walk). Null for the
        // vast majority of events, which is the point — it only exists while
        // something is on.
        collection: e.metadata?.collection || null,
        collectionLabel: e.metadata?.collection_label || null,
        soldOut: e.metadata?.sold_out === true,
    }));
}

// Single approved event by id — backs the shareable /event/[id] page.
export async function getEventById(id: string): Promise<Event | null> {
    const { data, error } = await supabase
        .from('events')
        .select(`
      id,
      event_name,
      event_date,
      start_time,
      end_time,
      event_vibe,
      flyer_url,
      source_url,
      curation_level,
      metadata,
      venues (
        name,
        neighborhood,
        lat,
        lng,
        url,
        image_url
      )
    `)
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle();

    if (error || !data) return null;

    const e: any = data;
    return {
        id: e.id,
        title: e.event_name,
        date: e.event_date,
        startTime: e.start_time || null,
        endTime: e.end_time || null,
        location: `${e.venues?.name || 'Unknown'}, ${e.venues?.neighborhood || 'LA'}`,
        // metadata.description is the public listing copy. metadata.justification
        // is the scout's INTERNAL vibe-score rationale — it used to be shown here,
        // which is why descriptions read as AI commentary about the event rather
        // than about what actually happens. Never surface it.
        description: e.metadata?.description || 'No description available',
        price: formatPrice(e.metadata?.price),
        // Never invent coordinates: an un-geocoded venue is skipped on the
        // map, not dropped onto a downtown default.
        lat: e.venues?.lat ?? null,
        lng: e.venues?.lng ?? null,
        // Flyer first; then a real photo of the venue the event is at (honest
        // and relevant, unlike the stock art the old image search produced);
        // the branded typographic card is the floor.
        image: e.flyer_url || e.venues?.image_url || '/placeholder.jpg',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        vibe: e.event_vibe ? [e.event_vibe] : ['Event'],
        url: e.source_url || e.venues?.url,
        curationLevel: e.curation_level || 'scraped',
        vibeScore: typeof e.metadata?.vibe_score === 'number' ? e.metadata.vibe_score : null,
        // A time-boxed grouping (a festival week, an art walk). Null for the
        // vast majority of events, which is the point — it only exists while
        // something is on.
        collection: e.metadata?.collection || null,
        collectionLabel: e.metadata?.collection_label || null,
        soldOut: e.metadata?.sold_out === true,
    };
}

export async function getVenues() {
    const { data, error } = await supabase
        .from('venues')
        .select('*');

    if (error) {
        console.error('Error fetching venues:', error);
        return [];
    }
    return data || [];
}

export type CollectionSummary = {
    /** URL slug, e.g. "sound-and-fury". */
    slug: string;
    /** Display name, e.g. "Sound & Fury". */
    label: string;
    /** Upcoming events carrying the tag. */
    count: number;
    /** Last date in the run — the day the collection stops existing. */
    lastDate: string;
};

/**
 * Collections with something still upcoming.
 *
 * A collection is a named, time-boxed grouping — a festival week, an art walk.
 * Because this only ever looks at events from today forward, a collection
 * appears when its first event is added and vanishes the day after its last
 * one, with nothing to remember to switch off. That self-expiry is the whole
 * reason it's a tag on events rather than a table someone has to maintain.
 */
export async function getCollections(): Promise<CollectionSummary[]> {
    const { data, error } = await supabase
        .from('events')
        .select('event_date, metadata')
        .eq('status', 'approved')
        .gte('event_date', todayInLA());

    if (error) {
        console.error('Error fetching collections:', error);
        return [];
    }

    const tally = new Map<string, CollectionSummary>();
    for (const row of (data || []) as any[]) {
        const slug = row.metadata?.collection;
        if (!slug) continue;
        const cur = tally.get(slug) ?? {
            slug,
            label: row.metadata?.collection_label || slug,
            count: 0,
            lastDate: row.event_date,
        };
        cur.count += 1;
        if (row.event_date > cur.lastDate) cur.lastDate = row.event_date;
        tally.set(slug, cur);
    }

    return [...tally.values()].sort((a, b) => b.count - a.count);
}

export type NeighborhoodSummary = {
    /** The canonical name as venues store it, e.g. "Echo Park". */
    name: string;
    /** Upcoming one-off events. */
    events: number;
    /** Approved recurring nights. */
    recurring: number;
};

/**
 * Neighborhoods that currently have something to show, with counts.
 *
 * Backs the /[neighborhood] routes and their sitemap entries. Derived from the
 * data rather than a hardcoded list: a neighborhood earns a page by having
 * events in it, and loses the page when it runs dry. That's deliberate — a
 * printed QR code pointing at an empty page is worse than a 404, because the
 * person scanning it has already walked over to read the flyer.
 *
 * 'Unknown' is excluded. It's the fallback for a venue with no neighborhood
 * set, not a place anyone can go.
 */
export async function getNeighborhoods(): Promise<NeighborhoodSummary[]> {
    const [eventsRes, recurringRes] = await Promise.all([
        supabase
            .from('events')
            .select('venues(neighborhood)')
            .eq('status', 'approved')
            .gte('event_date', todayInLA()),
        supabase
            .from('recurring_events')
            .select('venues(neighborhood)')
            .eq('status', 'approved'),
    ]);

    if (eventsRes.error) console.error('Error fetching event neighborhoods:', eventsRes.error);
    if (recurringRes.error) console.error('Error fetching recurring neighborhoods:', recurringRes.error);

    const tally = new Map<string, NeighborhoodSummary>();
    const bump = (raw: any, key: 'events' | 'recurring') => {
        const name = raw?.venues?.neighborhood;
        if (!name || name === 'Unknown') return;
        const row = tally.get(name) ?? { name, events: 0, recurring: 0 };
        row[key] += 1;
        tally.set(name, row);
    };

    for (const row of eventsRes.data || []) bump(row, 'events');
    for (const row of recurringRes.data || []) bump(row, 'recurring');

    return [...tally.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGuides(): Promise<GuideWithItems[]> {
    const { data, error } = await supabase
        .from('guides')
        .select(`
            *,
            items:guide_items(
                *,
                venues(*)
            )
        `)
        ;

    if (error) {
        console.error('Error fetching guides:', error);
        return [];
    }
    return data || [];
}

export async function getRecurringEvents(): Promise<RecurringEvent[]> {
    const { data, error } = await supabase
        .from('recurring_events')
        .select(`
            id, event_name, category, day_of_week, start_time, end_time,
            recurrence, description, metadata,
            venues (name, neighborhood, lat, lng, url, image_url)
        `)
        .eq('status', 'approved')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching recurring events:', error);
        return [];
    }

    return (data || []).map((e: any) => ({
        id: e.id,
        event_name: e.event_name,
        category: e.category,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        recurrence: e.recurrence,
        description: e.description,
        venue_name: e.venues?.name || 'Unknown',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        // Never invent coordinates: an un-geocoded venue is skipped on the
        // map, not dropped onto a downtown default.
        lat: e.venues?.lat ?? null,
        lng: e.venues?.lng ?? null,
        venue_url: e.venues?.url,
        // A per-night image beats a generic venue photo: a mahjong table says
        // what Mahjong Monday is, where one bar shot has to stand in for every
        // night the room runs. Falls back to the venue photo, then to the
        // branded card.
        venue_image: e.metadata?.image_url || e.venues?.image_url,
    }));
}

export async function getAdminRecurringEvents(): Promise<(RecurringEvent & { status: string })[]> {
    const { data, error } = await supabase
        .from('recurring_events')
        .select(`
            id, event_name, category, day_of_week, start_time, end_time,
            recurrence, description, status, metadata,
            venues (name, neighborhood, lat, lng, url, image_url)
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching admin recurring events:', error);
        return [];
    }

    return (data || []).map((e: any) => ({
        id: e.id,
        event_name: e.event_name,
        category: e.category,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        recurrence: e.recurrence,
        description: e.description,
        status: e.status || 'pending',
        venue_name: e.venues?.name || 'Unknown',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        // Never invent coordinates: an un-geocoded venue is skipped on the
        // map, not dropped onto a downtown default.
        lat: e.venues?.lat ?? null,
        lng: e.venues?.lng ?? null,
        venue_url: e.venues?.url,
        // A per-night image beats a generic venue photo: a mahjong table says
        // what Mahjong Monday is, where one bar shot has to stand in for every
        // night the room runs. Falls back to the venue photo, then to the
        // branded card.
        venue_image: e.metadata?.image_url || e.venues?.image_url,
    }));
}
