export interface Event {
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    location: string;
    description: string;
    /**
     * Venue coordinates. Null when the venue hasn't been geocoded — the map
     * skips those pins rather than inventing a location. (These used to default
     * to downtown LA, which stacked every un-geocoded venue's events onto one
     * bogus DTLA pin.)
     */
    lat: number | null;
    lng: number | null;
    image: string;
    /**
     * True when `image` is the event's OWN flyer rather than a venue photo
     * standing in for one.
     *
     * The feed hides a repeated picture, which is right for a venue photo —
     * 45 Human Resources events share one, and a wall of identical thumbnails
     * reads worse than typographic cards. It's wrong for a flyer: a series
     * poster legitimately covers several dates ("CANYON ECHO PARK SUMMER
     * EVENTS: Aug 02 Bruce, Aug 09 Seedy…", or a two-day festival), and
     * suppressing it left the second day looking like it had no artwork.
     */
    imageIsFlyer?: boolean;
    neighborhood: string;
    vibe: string[];
    /**
     * A named, time-boxed grouping — a festival week, an art walk, a season.
     *
     * Deliberately a tag on the event rather than a table: a collection is only
     * interesting while it's happening, and tying its visibility to whether any
     * tagged event is still upcoming means it appears and disappears on its own
     * with nothing to clean up afterwards.
     */
    collection?: string | null;
    /** Display name for the collection ("Sound & Fury"). */
    collectionLabel?: string | null;
    /**
     * Sold out at the source. Shown on the card, because a listing that doesn't
     * say so sends someone across town for nothing — the same failure as the
     * old "Free entry" on ticketed shows.
     */
    soldOut?: boolean;
    /** Door price as the venue states it ("$15", "Free with RSVP"). Null when
     *  unknown — the UI stays silent rather than guessing, since it used to
     *  claim "Free entry" on every event including ticketed shows. */
    price?: string | null;
    /** Link out to the event's own page (falls back to the venue calendar). */
    url?: string | null;
    /** 'scraped' | 'ff_curated' | 'promoted' — drives tiered card treatment. */
    curationLevel?: 'scraped' | 'ff_curated' | 'promoted';
    /** The scout's 1-10 score against vibedoc.md; orders cards within a day. */
    vibeScore?: number | null;
    /**
     * The bill, headliner first. Only the detail page loads these — the feed
     * renders 300+ cards and doesn't need a join per card to draw one.
     * Feeds schema.org `performer`, which is what makes an individual act
     * findable rather than only the event it plays.
     */
    performers?: string[];
    /** Street address where the venue has one. Feeds schema.org PostalAddress. */
    venueAddress?: string | null;
}

// "7 PM" / "7:30 PM" from a "HH:MM[:SS]" string.
function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

// Combine an event's date and optional start/end times into a display string,
// e.g. "Sat, Aug 1 · 7 PM – 2 AM". Falls back to the raw date if unparseable.
/**
 * The date and time as separate strings, for places that stack them rather
 * than run them together — a narrow stamp wrapping mid-time reads as
 * "WED, AUG 5 · 6" / "PM", which is worse than two deliberate lines.
 */
/**
 * Tidy a scraped price string.
 *
 * Eventbrite renders "From" and "$13.39" as separate nodes, so the scraper
 * concatenated them into "From$13.39". Normalising on read fixes every
 * surface at once and keeps future scrapes clean without a re-run.
 */
export function formatPrice(price?: string | null): string | null {
    if (!price) return null;
    return price
        .replace(/([A-Za-z])(\$)/g, '$1 $2')  // From$13 -> From $13
        .replace(/\s+/g, ' ')
        .trim() || null;
}

export function formatEventDateParts(
    date: string,
    startTime?: string | null,
    endTime?: string | null,
): { date: string; time: string | null } {
    const d = new Date(`${date}T00:00:00`);
    const datePart = isNaN(d.getTime())
        ? date
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (!startTime) return { date: datePart, time: null };
    const timePart = endTime
        ? `${formatTime(startTime)} – ${formatTime(endTime)}`
        : formatTime(startTime);
    return { date: datePart, time: timePart };
}

export function formatEventDateTime(
    date: string,
    startTime?: string | null,
    endTime?: string | null,
): string {
    // Same source as formatEventDateParts, so the one-line and stacked
    // renderings can't disagree about a date.
    const { date: datePart, time } = formatEventDateParts(date, startTime, endTime);
    return time ? `${datePart} · ${time}` : datePart;
}

export const events: Event[] = [
    {
        id: '1',
        title: 'The Preheat: Thanksgiving Eve Party',
        date: 'Wed Nov 26, 4:00 PM - 2:00 AM',
        location: 'Bar Flores, Echo Park',
        description: 'Come hangout with us for one of the biggest party nights of the year! DJ Bles & Friends.',
        lat: 34.0763,
        lng: -118.2574,
        image: '/events/thepreheat.png',
        neighborhood: 'Echo Park',
        vibe: ['Nightlife', 'Music'],
    },
    {
        id: '2',
        title: 'Friendsgiving Party',
        date: 'Wed Nov 26, 6:00 PM - Late',
        location: 'Semi Tropic Wines, Echo Park',
        description: 'Friendsgiving Party at Semi Tropic Wines. Food & Drink.',
        lat: 34.0750,
        lng: -118.2600,
        image: '/events/friendsgivingparty.png',
        neighborhood: 'Echo Park',
        vibe: ['Food & Drink', 'Community'],
    },
    {
        id: '3',
        title: 'Preciosita Presents: La Posada',
        date: 'Wed Nov 26, 9:00 PM - Late',
        location: 'The Virgil, East Hollywood',
        description: 'Reggaeton, Cumbias, Dembow, Merengue, Banda y Mas. Hosted by Edenxjay. DJ Preciosa & DJ Cali Ally. Free tamales until supplies last!',
        lat: 34.0907,
        lng: -118.2856,
        image: '/events/preciosita.png',
        neighborhood: 'East Hollywood',
        vibe: ['Cultural Celebrations', 'Music', 'Nightlife'],
    },
    {
        id: '4',
        title: 'Bar Flores Thanksgiving',
        date: 'Thu Nov 27, 8:00 PM - 2:00 AM',
        location: 'Bar Flores, Echo Park',
        description: 'Bring us your leftovers! Or a toy over $15. Your bartenders: Karla Flores, Michelle, Ronnie, Lani.',
        lat: 34.0763,
        lng: -118.2574,
        image: '/events/barfloresthanksgiving.png',
        neighborhood: 'Echo Park',
        vibe: ['Community', 'Charity & Benefit', 'Food & Drink'],
    },
    {
        id: '5',
        title: 'Pisos Sobre Mesas',
        date: 'Fri Nov 28, 9:00 PM - Late',
        location: 'The Association, DTLA',
        description: 'Everyone free all night! Music.',
        lat: 34.0484,
        lng: -118.2483,
        image: '/events/pisossobresmesas.png',
        neighborhood: 'DTLA',
        vibe: ['Nightlife', 'Music'],
    },
    {
        id: '6',
        title: 'SOLENE Cyber Jazz Speakeasy',
        date: 'Sat Nov 29, 7:00 PM',
        location: 'Gold Diggers, East Hollywood',
        description: 'Futuristic & Formal Dress Highly Encouraged. Feat. Salome Hajj + Johnny B33.',
        lat: 34.0906,
        lng: -118.3056,
        image: '/events/solene.png',
        neighborhood: 'East Hollywood',
        vibe: ['Nightlife', 'Music'],
    },
    {
        id: '7',
        title: 'Outdoor Drawing Workshop',
        date: 'Sun Nov 30, 10:00 AM - 1:00 PM',
        location: 'Echo Park Lake',
        description: 'C.W. Moss Outdoor aka Plein Air Drawing Workshop. Meet at the Lady of the Lake.',
        lat: 34.0727,
        lng: -118.2606,
        image: '/events/outdoordrawing.png',
        neighborhood: 'Echo Park',
        vibe: ['Art & Cultural', 'Workshops & Classes', 'Outdoor Adventures'],
    },
    {
        id: '8',
        title: 'The Great Rock n\' Roll Holiday Flea Market',
        date: 'Sun Nov 30, 11:00 AM - 4:00 PM',
        location: 'The Regent Theatre, DTLA',
        description: 'Supporting Local. 40+ Vendors, Gifting, Vinyl, Vintage.',
        lat: 34.0475,
        lng: -118.2486,
        image: '/events/regent.png',
        neighborhood: 'DTLA',
        vibe: ['Markets & Flea Markets', 'Music'],
    },
    {
        id: '9',
        title: 'SNOHOUSE',
        date: 'Sun Nov 30, 9:00 PM - Late',
        location: 'The Love Song Bar, DTLA',
        description: 'Ska, Punk, Soul & More. Vinyl Selections. Last Supper Club donating to LA Food Bank.',
        lat: 34.0478,
        lng: -118.2475,
        image: '/events/snohouse.png',
        neighborhood: 'DTLA',
        vibe: ['Music', 'Nightlife', 'Charity & Benefit'],
    },
];
