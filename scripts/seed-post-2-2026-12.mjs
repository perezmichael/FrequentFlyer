/**
 * Seed the Instagram-sourced events for Post 2 — the week after Thanksgiving,
 * Mon 11/30 – Sun 12/6 2026 — with their flyers, and stamp the picks.
 *
 * Same rules as seed-thanksgiving-2026.mjs: copy only what the poster prints,
 * NULL what it doesn't. Where an address came from somewhere other than the
 * poster, the venue line says so.
 *
 * Flyers are read from flyer-inbox/post-2-2026-12/ (gitignored).
 *
 * Usage:
 *   node scripts/seed-post-2-2026-12.mjs --dry-run    # print the plan, write nothing
 *   node scripts/seed-post-2-2026-12.mjs              # apply
 */

import { runSeed } from './lib/flyer-seed.mjs';

const VENUES = [
    // Already in the database.
    { name: 'UCB Theatre', address: '5919 Franklin Ave, Los Angeles, CA 90028' },
    { name: 'Bar Bandini', address: '2150 Sunset Blvd, Los Angeles, CA 90026' },
    { name: 'Junior High' },
    { name: 'York Manor' },
    // New.
    { name: "Nico's", neighborhood: 'Atwater Village', address: '3111 Glendale Blvd #2, Los Angeles, CA 90039', geocodeQuery: '3111 Glendale Blvd, Los Angeles, CA 90039' },
    { name: 'NOAH Los Angeles', neighborhood: 'Hollywood', address: '911 N Orange Dr, Los Angeles, CA 90038' },
    { name: 'Bar Stella', neighborhood: 'Silver Lake', address: '3930 Sunset Blvd, Los Angeles, CA 90029' },
    { name: 'The Broad', neighborhood: 'Downtown', address: '221 S Grand Ave, Los Angeles, CA 90012', url: 'https://www.thebroad.org' }, // address: museum's own site; not "The Broad Stage" in Santa Monica
    { name: 'Extinction Records', neighborhood: 'Whittier', address: '9211 Greenleaf Ave, Whittier, CA 90605' },
    { name: 'Leimert Park Village', neighborhood: 'Leimert Park', address: '43rd St & Degnan Blvd, Los Angeles, CA 90008', geocodeQuery: 'Degnan Boulevard, Leimert Park, Los Angeles' },
    { name: 'Temple Grounds', neighborhood: 'Echo Park', address: '1650 W Temple St, Los Angeles, CA 90026' },
    { name: 'Palihouse West Hollywood', neighborhood: 'West Hollywood', address: '8465 Holloway Dr, West Hollywood, CA 90069' }, // address: not on the poster
    { name: 'Forager Crafts', neighborhood: 'Frogtown', address: '2915 Knox Ave, Unit 103, Los Angeles, CA 90039', geocodeQuery: '2915 Knox Ave, Los Angeles, CA 90039' }, // address: their Instagram post
    { name: 'Luft Los Angeles', neighborhood: 'Venice', address: '1930 Lincoln Blvd, Venice, CA 90291' },
    { name: 'La Más', neighborhood: 'Frogtown', address: '2806 Clearwater St, Los Angeles, CA 90039' },
    { name: 'El Rey Theatre', neighborhood: 'Mid-Wilshire', address: '5515 Wilshire Blvd, Los Angeles, CA 90036', url: 'https://www.theelrey.com' }, // address: not on the poster
    { name: 'Blue Note Los Angeles', neighborhood: 'Hollywood', address: '6372 Sunset Blvd, Los Angeles, CA 90028', url: 'https://www.bluenotejazz.com/la/' }, // address: club's own listings
];

const EVENTS = [
    {
        name: 'Show Me Your D*ck: A Lifetime of Dating in a Larger Body',
        date: '2026-12-01', start: '20:30', venue: 'UCB Theatre',
        vibe: 'Comedy', pick: true, score: 8,
        flyer: 'show-me-your-d-ucb.jpg', performers: ['Cara Meyers'],
        description: "Cara Meyers' solo show about dating in a larger body, directed by Margot Leitman. A 2026 Hollywood Fringe solo theatre nominee.",
    },
    {
        name: "Windkin — JIJI's Jazz Club × Nico's",
        date: '2026-12-02', start: '19:00', venue: "Nico's",
        vibe: 'Live Music', price: '$15', pick: true, score: 8, promoter: "JIJI's Jazz Club",
        flyer: 'jijis-nicos-windkin.jpg', performers: ['Windkin'],
        description: "JIJI's Jazz Club takes over Baby Battista, the wine bar inside Nico's, for a live set from Windkin.",
    },
    {
        name: 'Snoh Aalegra — One Night Only',
        date: '2026-12-02', venue: 'El Rey Theatre',
        vibe: 'Live Music', pick: false, score: 7,
        flyer: 'snoh-aalegra-el-rey.jpg', performers: ['Snoh Aalegra'],
        url: 'https://alegendarylove.com',
        description: 'Snoh Aalegra plays one night only in Los Angeles at the El Rey. Limited capacity.',
    },
    // 1st + 3rd Fridays. recurring_events can't express "1st and 3rd" — the
    // app renders every recurring row as weekly — so each date is its own event.
    ...['2026-12-04', '2026-12-18'].map(date => ({
        name: 'Somos NELA Night Market',
        date, start: '18:00', end: '21:00', venue: 'La Más',
        vibe: 'Market', pick: false, score: 7, promoter: 'La Más',
        flyer: 'somos-nela-night-market.jpg',
        description: 'A bilingual night market from La Más — food, drinks, crafts, apothecary, art and community resources. Mercado de noche: comida, bebidas, artesanías, boticaria, arte y recursos.',
    })),
    {
        name: 'The Record Club × NOAH: A Tribe Called Quest — Midnight Marauders',
        date: '2026-12-03', start: '19:00', venue: 'NOAH Los Angeles',
        vibe: 'Listening Session', pick: true, score: 8, promoter: 'The Record Club',
        flyer: 'record-club-noah-atcq.jpg',
        description: 'TRC 073: an intentional listening session of A Tribe Called Quest’s Midnight Marauders in high-fidelity sound.',
    },
    {
        name: 'Skin Contact: Wine Bar Gay Night',
        date: '2026-12-03', start: '19:00', end: '00:00', venue: 'Bar Bandini',
        vibe: 'Nightlife', pick: true, score: 8,
        flyer: 'skin-contact-bandini.jpg',
        description: 'A holiday gay night at the Echo Park wine bar.',
    },
    {
        name: 'Club Sandwich_05 — Run Club',
        date: '2026-12-03', start: '18:00', venue: 'Luft Los Angeles',
        vibe: 'Run Club', pick: false, score: 6,
        flyer: 'club-sandwich-luft.jpg', performers: ['shonswett'],
        url: 'https://www.instagram.com/p/DgJCl_sRSWZ/',
        description: 'The monthly Club Sandwich run heads out from Luft, led by _kwaves and picolasnico, with shonswett on the turntables. Register ahead for a limited-edition shirt and so they know how much pizza to order.',
    },
    {
        name: 'Libra — Disco to Brazil, All Night Long',
        date: '2026-12-04', start: '21:00', venue: 'Bar Stella',
        vibe: 'DJ Night', pick: true, score: 8,
        flyer: 'bar-stella-libra.jpg', performers: ['Libra'],
        description: 'Disco to Brazil, all night long, at Bar Stella in Silver Lake.',
    },
    {
        name: "Guadalupe's Map Pointz House Party at The Broad",
        date: '2026-12-05', start: '12:00', end: '18:00', venue: 'The Broad',
        vibe: 'Dance Party', price: 'Free', pick: true, score: 9, promoter: 'Map Pointz · Veteranas & Rucas',
        flyer: 'house-party-the-broad.jpg', performers: ['DJ Trajic', 'Bae Bae', 'DJ Hi-C'],
        description: 'Guadalupe Rosales’ Map Pointz archive throws a free house party: DJ sets by DJ Trajic, Bae Bae and DJ Hi-C, a car show by Nokturnal Worldwide, tattoos by Commonground Studio and Inner Realmz, drinks by Chicas on the Rocks, and food from Felix Frutero and Hippie Churro.',
    },
    {
        name: 'Lower Class Brats, The Stitches, Naked Aggression, S.C.R.S., Rails, Trigger Damage',
        date: '2026-12-05', start: '19:00', venue: 'Extinction Records',
        vibe: 'Live Music', price: '$10 presale', age: 'All Ages', pick: true, score: 8, promoter: 'Nothing Less Booking',
        flyer: 'lower-class-brats-extinction.jpg',
        performers: ['Lower Class Brats', 'The Stitches', 'Naked Aggression', 'S.C.R.S.', 'Rails', 'Trigger Damage'],
        description: 'Six punk bands for $10. Doors 6:30PM, show 7PM. Tickets on Eventbrite.',
    },
    {
        name: 'Frogtown Holiday Hop at Forager Crafts',
        date: '2026-12-05', start: '12:00', end: '17:00', venue: 'Forager Crafts',
        vibe: 'Market', price: 'Free', pick: false, score: 8, promoter: 'Frogtown Arts',
        flyer: 'frogtown-holiday-hop.webp',
        url: 'https://www.instagram.com/p/Df-3FRcD7Jh/',
        performers: ['Maneatingplant', 'Gabrielle Lessard', 'Sweet Butterfly Bake Shop', "Kate's Closet", 'Jim Kisiel',
            'Rough Draft Leathercraft', 'Srimoyee Handmade', 'LA Is Not a Desert', 'Rebecca Holopter', 'Michael Osborne'],
        description: 'The 4th annual Frogtown Holiday Hop: about 20 stops along the LA River with art shows, pop-ups, food, drinks and music. Forager’s studio hosts a dozen-plus makers — jewelry, leather goods, prints, 10-minute pet portraits — plus the Maneatingplant vegan food truck. Dogs welcome; walk, bike or rideshare. Frogtown Arts is also collecting canned and non-perishable food for NELA Mercadito through 12/10 — drop-offs at The Left Bank (2479 Fletcher Dr) and Frogtown Brewery (2931 Gilroy St).',
    },
    {
        name: 'First Saturdays Holiday Market',
        date: '2026-12-05', start: '10:00', end: '17:00', venue: 'Leimert Park Village',
        vibe: 'Market', price: 'Free', pick: true, score: 8, promoter: 'Leimert Park Village Merchants Association',
        flyer: 'leimert-first-saturdays.jpg',
        description: 'Shop Black, support local: a free holiday market at 43rd St & Degnan Blvd with All Chill Ice Cream, Harun Coffee, The World Stage, Sole Folks, Ride On! Bike Co-op, Neighbors Skate Shop and more.',
    },
    {
        name: 'Gracie So Beautiful: Alive With Friends — VHS Release Show',
        date: '2026-12-06', start: '18:00', end: '22:00', venue: 'Junior High',
        vibe: 'Live Music', price: '$10', age: 'All Ages', pick: true, score: 8,
        flyer: 'gracie-so-beautiful-vhs.jpg',
        performers: ['Gracie Martin', 'Taylor Plas', 'Enrique Cesar', 'Ashton Livesay', 'Gracyn Blu', 'Broodfaye'],
        description: 'Gracie Martin releases Gracie So Beautiful: Alive With Friends on VHS, with live music from Taylor Plas, Enrique Cesar, Ashton Livesay and Gracyn Blu and a DJ set by Broodfaye. Rare VHS on sale. Accessible pricing available.',
    },
    {
        name: 'Temple Art Market',
        date: '2026-12-06', start: '11:00', end: '16:00', venue: 'Temple Grounds',
        vibe: 'Market', pick: true, score: 7,
        flyer: 'temple-art-market.jpg',
        description: 'Shop local, shop small: the monthly Temple Art Market’s holiday edition at Temple Grounds in Echo Park.',
    },
    {
        name: "Olivia's Table × Palihouse West Hollywood",
        date: '2026-12-06', start: '18:00', end: '21:00', venue: 'Palihouse West Hollywood',
        vibe: 'Food & Drink', pick: true, score: 7,
        flyer: 'olivias-table-palihouse.jpg',
        description: "A candlelit supper club dinner from Olivia's Table at Palihouse West Hollywood.",
    },
    {
        name: 'York Manor Market',
        date: '2026-12-06', start: '10:00', end: '16:00', venue: 'York Manor',
        vibe: 'Market', pick: false, score: 6,
        flyer: 'york-manor-market.jpg',
        description: 'A Sunday market at York Manor in Highland Park.',
    },
    ...['2026-12-06', '2026-12-07'].map(date => ({
        name: 'Isaiah Rashad — Live Band Coast to Coast',
        date, venue: 'Blue Note Los Angeles',
        vibe: 'Live Music', pick: false, score: 7,
        flyer: 'isaiah-rashad-blue-note.jpg', performers: ['Isaiah Rashad'],
        description: 'Isaiah Rashad with a live band at the Blue Note — two shows each night.',
    })),
];

runSeed({
    inbox: 'flyer-inbox/post-2-2026-12',
    source: 'instagram flyer, hand-verified (post 2)',
    venues: VENUES,
    events: EVENTS,
}).catch(err => { console.error(err); process.exit(1); });
