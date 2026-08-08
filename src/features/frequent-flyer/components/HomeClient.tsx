'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import EventCard2 from './EventCard2';
import RecurringEventCard from './RecurringEventCard';
import EventDetailSheet from './EventDetailSheet';
import MapLoader from '@/components/MapLoader';
import styles from './HomeClient.module.css';
import FilterPillRow from './FilterPillRow';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import { Event } from '@/features/frequent-flyer/data/events';
import { RecurringEvent, DAY_NAMES_SHORT, formatRecurringSchedule } from '@/features/frequent-flyer/data/recurringEvents';

const Map = dynamic(() => import('@/features/frequent-flyer/components/Map'), {
    ssr: false,
    loading: () => <MapLoader />,
});

interface HomeClientProps {
    initialEvents: Event[];
    recurringEvents?: RecurringEvent[];
    /**
     * Open scoped to one neighborhood — the /[neighborhood] landing pages.
     *
     * Seeds the filter rather than locking it: someone who lands on
     * /long-beach from a flyer should still be able to look at the rest of LA
     * without hitting a wall. The canonical name as venues store it.
     */
    initialNeighborhood?: string;
    /**
     * Open scoped to a collection — the /sound-and-fury style landing pages.
     * Same treatment as a neighborhood: seeds the filter, doesn't lock it.
     */
    initialCollection?: string;
    /** Collections with upcoming events, for the filter pill. */
    collections?: { slug: string; label: string; count: number }[];
}

// A unified item that can be either a one-off event or a recurring one
type UnifiedItem =
    // sortDate is the YYYY-MM-DD each item NEXT happens, so a weekly night and
    // a one-off can be ordered against each other.
    | { kind: 'event'; data: Event; sortDay: number; sortDate: string }
    | { kind: 'recurring'; data: RecurringEvent; sortDay: number; sortDate: string };

// How far ahead the feed looks. Wide enough that opening the app cold shows a
// full picture of what's coming up (then filters narrow it), not just today.
const WINDOW_DAYS = 30;

// Recurring events use a different shape than one-off events. Project one into
// the Event shape so the map and the detail sheet can treat everything the same.
/**
 * The next date a weekly night actually happens, as YYYY-MM-DD.
 *
 * A recurring row only knows its weekday, so it had nothing to sort against
 * and every one of them was pushed ahead of every dated event — the feed
 * opened with 25 happy hours before anything happening this week. Giving it a
 * real date lets it sit in the day it belongs to.
 */
function nextOccurrence(dayOfWeek: number, from = new Date()): string {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + ((dayOfWeek - d.getDay() + 7) % 7));
    // Local, not toISOString — that would shift to UTC and land a day early
    // in LA, the same bug that once made the day pills wrong.
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Rank within a single day: a pick leads, then anything with real artwork,
 * then the scout's score. Ordering was previously whatever Postgres returned,
 * which put a branded card fifth and the day's only pick fourth.
 */
function dayRank(item: UnifiedItem): number {
    if (item.kind === 'recurring') {
        // No curation_level on recurring nights yet; rank them on artwork.
        return hasRealImage(item.data.venue_image) ? 1 : 2;
    }
    const e = item.data;
    if (e.curationLevel === 'ff_curated') return 0;
    return hasRealImage(e.image) ? 1 : 2;
}

function recurringToEvent(re: RecurringEvent): Event {
    return {
        id: `recurring-${re.id}`,
        title: re.event_name,
        date: formatRecurringSchedule(re.day_of_week, re.start_time, re.end_time),
        location: `${re.venue_name}, ${re.neighborhood}`,
        description: re.description || re.category,
        lat: re.lat,
        lng: re.lng,
        image: re.venue_image || '/placeholder.jpg',
        neighborhood: re.neighborhood,
        vibe: [re.category],
        url: re.venue_url,
    };
}


// Two events belong to the same series when the same show runs at the same
// venue on multiple dates. Titles are normalized so punctuation drift doesn't
// split a series in two.
function seriesKey(e: Event): string {
    const title = e.title.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `${title}@@${e.location}`;
}

// Same key shape for a recurring night, so a show that exists in BOTH tables
// (5 dated rows for "Tomorrow! w/ Ron Lynch" plus a recurring row) collapses
// to one card instead of two.
function recurringSeriesKey(re: RecurringEvent): string {
    const title = re.event_name.toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `${title}@@${re.venue_name}, ${re.neighborhood}`;
}

// Tracks which images the current render has already used, so a repeated photo
// can be swapped for the branded card. Reset at the top of each render pass.
const seenImages = new Set<string>();

// A card standing in for one or more dates of the same show.
type Listing = ({
    kind: 'event';
    data: Event;
    /** How many dates this card represents in the current view. */
    dates: number;
    /** Last date in the run, for the "through …" note. */
    lastDate: string;
} | {
    kind: 'recurring';
    data: RecurringEvent;
    /** Extra weekday rows folded into this card. */
    extraDays: number;
}) & {
    /** YYYY-MM-DD this card next happens — both kinds sort against it. */
    sortDate: string;
    /** 0 pick, 1 has artwork, 2 branded card. Orders within a day. */
    rank: number;
    /**
     * Sold out shows stay listed but sink below everything you can still get
     * into on the same day. Removing them would misrepresent the night — a
     * festival week where five of fifteen shows sold out IS the week, and that
     * they went first is information. But a card you can't act on shouldn't sit
     * above four you can, which is where Sound & Fury week put Hardlore
     * Jeopardy: first card in the collection, gone before it opened.
     */
    soldOut: boolean;
};

export default function HomeClient({
    initialEvents, recurringEvents = [], initialNeighborhood,
    initialCollection, collections = [],
}: HomeClientProps) {
    const today = new Date().getDay(); // 0=Sun
    // Default to All so a cold open shows everything upcoming, not just today.
    const [dayFilter, setDayFilter] = useState<number | null>(null);
    const [neighborhoodFilter, setNeighborhoodFilter] = useState<string | null>(initialNeighborhood ?? null);
    const [collectionFilter, setCollectionFilter] = useState<string | null>(initialCollection ?? null);
    const [picksOnly, setPicksOnly] = useState(false);
    const activeCollection = collections.find(c => c.slug === collectionFilter) ?? null;
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [detailEvent, setDetailEvent] = useState<Event | null>(null);
    const [mobileTab, setMobileTab] = useState<'list' | 'map'>('list');

    // Build the unified list: upcoming one-off events + recurring events by day
    const unifiedItems = useMemo(() => {
        const items: UnifiedItem[] = [];

        // One-off events in a rolling window from today. getEvents already drops
        // anything before today, so this just caps how far ahead we show.
        const windowStart = new Date();
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(windowStart);
        // "See all picks" means all of them — a pick five weeks out is still a
        // pick, and capping it at the feed's 30 days silently hid some.
        windowEnd.setDate(windowStart.getDate() + (picksOnly ? 3650 : WINDOW_DAYS));
        windowEnd.setHours(23, 59, 59, 999);

        for (const event of initialEvents) {
            // Parse as LOCAL midnight. `new Date('2026-07-27')` is parsed as
            // UTC, which in LA lands on the 26th at 5pm — so every event
            // bucketed one weekday early and the day pills showed the wrong
            // day's events. The cards were right because formatEventDateTime
            // already appends T00:00:00; this now matches it.
            const eventDate = new Date(`${event.date}T00:00:00`);
            if (eventDate >= windowStart && eventDate <= windowEnd) {
                items.push({
                    kind: 'event', data: event,
                    sortDay: eventDate.getDay(), sortDate: event.date,
                });
            }
        }

        // Recurring nights sit on their NEXT occurrence, so a Monday mahjong
        // appears under Monday rather than permanently at the top. Only the
        // next one — showing all four Mondays in the window would put 25
        // weekly nights back in front of everything.
        for (const re of recurringEvents) {
            items.push({
                kind: 'recurring', data: re,
                sortDay: re.day_of_week, sortDate: nextOccurrence(re.day_of_week),
            });
        }

        return items;
    }, [initialEvents, recurringEvents, picksOnly]);

    // Filter by day + neighborhood
    const filteredItems = useMemo(() => {
        return unifiedItems.filter(item => {
            if (dayFilter !== null && item.sortDay !== dayFilter) return false;

            const neighborhood = item.kind === 'event'
                ? item.data.neighborhood
                : item.data.neighborhood;
            if (neighborhoodFilter && neighborhood !== neighborhoodFilter) return false;

            // Recurring nights can't belong to a festival week — they're a
            // standing weekly, not something programmed for the occasion.
            if (collectionFilter && !(item.kind === 'event' && item.data.collection === collectionFilter)) return false;

            // Recurring nights aren't curatable yet — they have no
            // curation_level — so a picks-only view excludes them rather than
            // implying they were vouched for.
            if (picksOnly && !(item.kind === 'event' && item.data.curationLevel === 'ff_curated')) return false;

            return true;
        });
    }, [unifiedItems, dayFilter, neighborhoodFilter, collectionFilter, picksOnly]);

    // How many picks exist at all — the toggle hides itself when there are none,
    // so an empty filter can't be tapped into a dead end.
    /**
     * Picks between today and the end of this week (Sunday).
     *
     * "This week's picks" was a rolling seven days while "see all" showed
     * thirty — two different weeks in one component, and neither matched the
     * range the Instagram post covers. Sunday is the boundary people actually
     * mean, and every pick inside it shows: the row scrolls, so there's no
     * reason to cap it and hide a night you starred.
     *
     * Scoped to the neighborhood when one is active, so a /[neighborhood]
     * landing page leads with that area's picks instead of a strip full of
     * places a twenty-mile drive away.
     */
    const weekPicks = useMemo(() => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        // 0 = Sunday, so a Sunday today ends today rather than jumping a week.
        end.setDate(start.getDate() + ((7 - start.getDay()) % 7));
        const iso = (d: Date) => {
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        };
        const from = iso(start), to = iso(end);
        return unifiedItems
            .filter(i => i.kind === 'event'
                && i.data.curationLevel === 'ff_curated'
                && (!neighborhoodFilter || i.data.neighborhood === neighborhoodFilter)
                && i.sortDate >= from && i.sortDate <= to)
            .sort((a, b) => a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1 : 0)
            .map(i => i.data as Event);
    }, [unifiedItems, neighborhoodFilter]);

    // Counts the same set "see all" will land on, neighborhood included —
    // otherwise the strip offers "see all 21" and the filtered view shows 3.
    const pickCount = useMemo(
        () => unifiedItems.filter(i => i.kind === 'event'
            && i.data.curationLevel === 'ff_curated'
            && (!neighborhoodFilter || i.data.neighborhood === neighborhoodFilter)).length,
        [unifiedItems, neighborhoodFilter]
    );

    // Derive neighborhoods from all items
    const neighborhoods = useMemo(() => {
        const set = new Set<string>();
        for (const item of unifiedItems) {
            const n = item.kind === 'event' ? item.data.neighborhood : item.data.neighborhood;
            if (n && n !== 'Unknown') set.add(n);
        }
        return Array.from(set).sort();
    }, [unifiedItems]);

    /**
     * Collapse a run of dates into one card.
     *
     * CINEMA LAND is genuinely 30 dated rows (nightly through September) and
     * Superbloom is weekly — correct in the database, but as 30 identical cards
     * it buries everything else. 83 of 204 cards in the window were repeat
     * dates of something already listed.
     *
     * Rules: one card per show per venue, representing the SOONEST date in the
     * current view, annotated with how many more there are. Because it runs
     * after filtering, tapping MON collapses that series' Mondays to a single
     * card rather than five.
     */
    const listings = useMemo<Listing[]>(() => {
        // Plain object, not a Map: the dynamically imported <Map> component
        // above shadows the global Map constructor in this module.
        const bySeries: Record<string, { data: Event; dates: number; lastDate: string; sortDate: string; rank: number; soldOut: boolean }> = {};
        const order: string[] = [];
        const out: Listing[] = [];

        // Recurring nights first, so a dated event can supersede one: the
        // events row carries a real date, flyer and tickets link, which the
        // recurring row doesn't.
        const byRecurring: Record<string, { data: RecurringEvent; extraDays: number; sortDate: string; rank: number; soldOut: boolean }> = {};
        const recurringOrder: string[] = [];
        for (const item of filteredItems) {
            if (item.kind !== 'recurring') continue;
            const key = recurringSeriesKey(item.data);
            if (!byRecurring[key]) {
                byRecurring[key] = { data: item.data, extraDays: 0, sortDate: item.sortDate, rank: dayRank(item), soldOut: false };
                recurringOrder.push(key);
            } else {
                // "33 Taps Happy Hour" is seven rows, one per weekday.
                byRecurring[key].extraDays += 1;
            }
        }

        for (const item of filteredItems) {
            if (item.kind === 'recurring') continue;
            const key = seriesKey(item.data);
            // A dated event wins over the recurring row for the same show.
            if (byRecurring[key]) delete byRecurring[key];
            const seen = bySeries[key];
            if (!seen) {
                bySeries[key] = { data: item.data, dates: 1, lastDate: item.data.date, sortDate: item.sortDate, rank: dayRank(item), soldOut: item.data.soldOut === true };
                order.push(key);
            } else {
                seen.dates += 1;
                // Keep the earliest as the representative, track the latest.
                if (item.data.date < seen.data.date) seen.data = item.data;
                if (item.data.date > seen.lastDate) seen.lastDate = item.data.date;
            }
        }

        for (const k of recurringOrder) {
            const v = byRecurring[k];
            if (v) out.push({ kind: 'recurring', data: v.data, extraDays: v.extraDays, sortDate: v.sortDate, rank: v.rank, soldOut: v.soldOut });
        }
        for (const v of order.map(k => bySeries[k])) {
            out.push({ kind: 'event', data: v.data, dates: v.dates, lastDate: v.lastDate, sortDate: v.sortDate, rank: v.rank, soldOut: v.soldOut });
        }
        // Chronology is the spine — people plan by day, so a Friday show must
        // never sit above a Tuesday one. Within a day, quality decides: a pick
        // leads, then anything with real artwork, then the scout's score, then
        // title so the order is stable between renders.
        //
        // Recurring nights used to sort with an empty date, which put all 25 of
        // them ahead of every dated event; they now carry their next occurrence.
        out.sort((a, b) => {
            if (a.sortDate !== b.sortDate) return a.sortDate < b.sortDate ? -1 : 1;
            // Availability outranks curation here on purpose. A sold-out pick
            // is still something you can't do tonight, and someone scanning a
            // day wants what they can act on first; the sold-out ones stay
            // listed underneath because the night isn't honestly described
            // without them.
            if (a.soldOut !== b.soldOut) return a.soldOut ? 1 : -1;
            if (a.rank !== b.rank) return a.rank - b.rank;
            const sa = a.kind === 'event' ? (a.data.vibeScore ?? 0) : 0;
            const sb = b.kind === 'event' ? (b.data.vibeScore ?? 0) : 0;
            if (sa !== sb) return sb - sa;
            const ta = a.kind === 'event' ? a.data.title : a.data.event_name;
            const tb = b.kind === 'event' ? b.data.title : b.data.event_name;
            return (ta || '').localeCompare(tb || '');
        });
        return out;
    }, [filteredItems]);

    // Convert to Event[] for the Map. Uses collapsed listings so a nightly
    // series contributes one pin's worth, not thirty.
    const mapEvents: Event[] = useMemo(() => {
        return listings.map(item =>
            item.kind === 'event' ? item.data : recurringToEvent(item.data)
        );
    }, [listings]);

    const handleMarkerClick = (id: string) => {
        setSelectedEventId(id);
        const element = document.getElementById(`home-${id}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return (
        <div className={styles.main}>
            {/* Mobile tab bar */}
            <div className={styles.tabBar}>
                <button
                    className={`${styles.tabButton} ${mobileTab === 'list' ? styles.tabActive : ''}`}
                    onClick={() => setMobileTab('list')}
                >
                    Events
                </button>
                <button
                    className={`${styles.tabButton} ${mobileTab === 'map' ? styles.tabActive : ''}`}
                    onClick={() => setMobileTab('map')}
                >
                    Map
                </button>
            </div>

            <div className={styles.splitLayout}>
                {/* Left: Unified event list */}
                <div className={`${styles.listContainer} ${mobileTab !== 'list' ? styles.hiddenMobile : ''}`}>
                    <header className={styles.header}>
                        {/* Names the area when one is in view. On a
                            /[neighborhood] landing page this is the first thing
                            someone arriving from a printed flyer reads, and it
                            has to confirm they're in the right place. */}
                        <h1 className={`${styles.title} font-space-grotesk`}>
                            What&apos;s happening{neighborhoodFilter ? ` in ${neighborhoodFilter}` : ''}
                        </h1>

                        {/* Says what's actually on screen. The heading used to
                            claim "this week" while the feed showed a rolling
                            month, and a day filter means every Monday in that
                            month — not just the next one. */}
                        <p className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/55 mt-[6px]">
                            <span className="text-ink font-bold">{listings.length}</span>
                            {listings.length === 1 ? ' event' : ' events'}
                            {picksOnly ? ' · FF Picks' : dayFilter !== null ? ` · ${DAY_NAMES_SHORT[dayFilter]}s` : ` · next ${WINDOW_DAYS} days`}
                            {neighborhoodFilter ? ` · ${neighborhoodFilter}` : ' · across LA'}
                            {activeCollection ? ` · ${activeCollection.label}` : ''}
                        </p>

                        {/* A neighborhood page is an entry point, not a cage —
                            someone who scanned a Long Beach flyer may well want
                            to see the rest of the city. Only shown when the page
                            itself is scoped; the pills already cover the case
                            where you filtered your own way here. */}
                        {initialNeighborhood && (
                            <a
                                href="/"
                                className="inline-block mt-[6px] font-space-mono uppercase text-[11px] tracking-[-0.44px] text-brand underline-offset-4 hover:underline"
                            >
                                ← everything across LA
                            </a>
                        )}

                        {/* Day-of-week pills */}
                        <FilterPillRow
                            className="mt-[12px]"
                            aria-label="Filter by day"
                            pills={[
                                { key: '__all', label: 'All', active: dayFilter === null && !picksOnly, onClick: () => { setDayFilter(null); setPicksOnly(false); } },
                                // Only offered once picks exist, so it can't be
                                // tapped into an empty view.
                                ...(pickCount > 0
                                    ? [{ key: '__picks', label: `★ FF Picks`, active: picksOnly, emphasize: true, onClick: () => setPicksOnly(!picksOnly) }]
                                    : []),
                                // Only rendered while a collection has events
                                // still to come. getCollections() looks from
                                // today forward, so this pill removes itself
                                // the day after the last show — nothing to
                                // switch off by hand.
                                ...collections.map(c => ({
                                    key: `__c_${c.slug}`,
                                    label: `${c.label} (${c.count})`,
                                    active: collectionFilter === c.slug,
                                    emphasize: true,
                                    onClick: () => setCollectionFilter(collectionFilter === c.slug ? null : c.slug),
                                })),
                                ...DAY_NAMES_SHORT.map((name, i) => ({
                                    key: String(i),
                                    label: i === today ? `${name} ·` : name,
                                    active: dayFilter === i,
                                    emphasize: i === today,
                                    onClick: () => setDayFilter(dayFilter === i ? null : i),
                                })),
                            ]}
                        />

                        {/* Neighborhood pills */}
                        {neighborhoods.length > 0 && (
                            <FilterPillRow
                                className="mt-[8px]"
                                aria-label="Filter by neighborhood"
                                pills={[
                                    { key: '__all', label: 'All Areas', active: !neighborhoodFilter, onClick: () => setNeighborhoodFilter(null) },
                                    ...neighborhoods.map(n => ({
                                        key: n,
                                        label: n,
                                        active: neighborhoodFilter === n,
                                        onClick: () => setNeighborhoodFilter(neighborhoodFilter === n ? null : n),
                                    })),
                                ]}
                            />
                        )}
                    </header>

                    {listings.length > 0 ? (<>
                        {/* Picks lead, but as their own section rather than
                            pinned into the feed — inline they'd break the
                            timeline, running Aug 4 to Aug 15 and then snapping
                            back. Hidden entirely when a filter is on, or when
                            a quiet week leaves nothing curated, so it never
                            renders an empty shelf. */}
                        {/* Hidden while a collection is in view: everything in
                            one is already a pick, so the strip would just
                            repeat the feed back at you. */}
                        {weekPicks.length > 0 && !picksOnly && dayFilter === null && !collectionFilter && (
                            <section className={styles.picksStrip}>
                                <div className={styles.picksHeader}>
                                    <h2 className={styles.picksTitle}>★ This week&rsquo;s picks</h2>
                                    <button className={styles.picksAll} onClick={() => setPicksOnly(true)}>
                                        see all {pickCount} →
                                    </button>
                                </div>
                                <div className={styles.picksRow}>
                                    {weekPicks.map(e => (
                                        <div key={`pick-${e.id}`} className={styles.picksItem}>
                                            <EventCard2
                                                event={e}
                                                compact
                                                onClick={() => setDetailEvent(e)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        <div className={`${styles.grid} stagger-in`}>
                            {(() => { seenImages.clear(); return null; })()}
                            {listings.map((item) => {
                                if (item.kind === 'event') {
                                    const event = item.data;
                                    // Second and later appearances of the SAME
                                    // picture fall back to the branded card.
                                    // Venue-photo fallbacks repeat by nature
                                    // (45 Human Resources events share one
                                    // photo); a wall of identical images reads
                                    // worse than a typographic card that looks
                                    // deliberate. Nothing is invented either way.
                                    const dup = hasRealImage(event.image) && seenImages.has(event.image);
                                    if (hasRealImage(event.image)) seenImages.add(event.image);
                                    return (
                                        <EventCard2
                                            key={event.id}
                                            id={`home-${event.id}`}
                                            event={event}
                                            isActive={selectedEventId === event.id}
                                            forcePlaceholder={dup}
                                            seriesDates={item.dates}
                                            seriesLastDate={item.lastDate}
                                            onClick={() => setDetailEvent(event)}
                                        />
                                    );
                                } else {
                                    const re = item.data;
                                    const mapId = `recurring-${re.id}`;
                                    return (
                                        <RecurringEventCard
                                            key={mapId}
                                            id={`home-${mapId}`}
                                            event={re}
                                            extraDays={item.extraDays}
                                            onClick={() => setDetailEvent(recurringToEvent(re))}
                                        />
                                    );
                                }
                            })}
                        </div>
                        </>
                    ) : (
                        <div className={styles.noResults}>
                            <h3 className="font-space-mono uppercase tracking-[-0.44px]">nothing on this filter. criminal.</h3>
                            <p className="font-space-mono text-sm text-black/55 mt-1">try another day — or be the one who posts something.</p>
                        </div>
                    )}
                </div>

                {/* Right: Map */}
                <div className={`${styles.mapContainer} ${mobileTab !== 'map' ? styles.hiddenMobile : ''}`}>
                    <div className={styles.mapWrapper}>
                        <Map
                            events={mapEvents}
                            selectedEventId={selectedEventId}
                            onMarkerClick={handleMarkerClick}
                            onEventOpen={setDetailEvent}
                            resizeSignal={mobileTab}
                        />
                    </div>
                </div>
            </div>

            <EventDetailSheet event={detailEvent} onClose={() => setDetailEvent(null)} />
        </div>
    );
}
