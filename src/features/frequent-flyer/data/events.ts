export interface Event {
    id: string;
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    location: string;
    description: string;
    lat: number;
    lng: number;
    image: string;
    neighborhood: string;
    vibe: string[];
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
export function formatEventDateTime(
    date: string,
    startTime?: string | null,
    endTime?: string | null,
): string {
    const d = new Date(`${date}T00:00:00`);
    const datePart = isNaN(d.getTime())
        ? date
        : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    if (!startTime) return datePart;
    const timePart = endTime
        ? `${formatTime(startTime)} – ${formatTime(endTime)}`
        : formatTime(startTime);
    return `${datePart} · ${timePart}`;
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
