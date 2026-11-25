/**
 * Seed the Instagram-sourced events for Thanksgiving weekend 2026 (Post 1,
 * Thu 11/26 – Sun 11/29, plus Gary Wilson on Mon 11/30), with their flyers,
 * and stamp the picks.
 *
 * Every event here was read off a poster by hand and checked against the web
 * where the web had anything. Most of these live only on Instagram, so for
 * many the poster is the only source — the fields copy what it prints and
 * nothing more. No time printed → start_time stays NULL. No price printed →
 * price stays out of metadata, same rule as seed-ff-picks.mjs.
 *
 * Flyers are read from flyer-inbox/thanksgiving-2026/ (gitignored). The
 * matching, upload and dry-run logic lives in scripts/lib/flyer-seed.mjs.
 *
 * Usage:
 *   node scripts/seed-thanksgiving-2026.mjs --dry-run    # print the plan, write nothing
 *   node scripts/seed-thanksgiving-2026.mjs              # apply
 */

import { runSeed } from './lib/flyer-seed.mjs';

// Existing rows are matched by name and only have blanks filled — the venue
// list is hand-curated. Every address is copied from a poster or the venue's
// own site; none is inferred.
const VENUES = [
    { name: 'Zebulon' }, // exists; nothing to fill from these posters
    { name: 'Blind Barber Highland Park', neighborhood: 'Highland Park', address: '5715 N Figueroa St, Los Angeles, CA 90042', url: 'https://blindbarber.com/pages/los-angeles-highland-park' },
    { name: 'Revenge Of', neighborhood: 'Glassell Park', address: '3420 Eagle Rock Blvd, Los Angeles, CA 90065' },
    { name: 'Slow Jamz Gallery', neighborhood: 'Arts District', address: '2448 E 8th St, Los Angeles, CA 90021' },
    { name: 'Café Santo', neighborhood: 'Montebello', address: '520 Whittier Blvd, Montebello, CA 90640' },
    { name: 'Kids of Immigrants', neighborhood: 'East Hollywood', address: '4873 Melrose Ave, Los Angeles, CA 90029' },
    { name: 'The Pop-Hop', neighborhood: 'Highland Park', address: '5002 York Blvd, Los Angeles, CA 90042', url: 'https://thepophop.com' },
    { name: 'York Manor', neighborhood: 'Highland Park', address: '4908 York Blvd, Los Angeles, CA 90042' },
    { name: 'Junior High', neighborhood: 'Glendale', address: '603 S Brand Blvd, Glendale, CA 91204', url: 'https://juniorhighlosangeles.com' },
    { name: 'Brain Dead Studios', neighborhood: 'Fairfax', address: '611 N Fairfax Ave, Los Angeles, CA 90036' },
    { name: 'Little Lions Social Club', neighborhood: 'Arts District', address: '689 Imperial St, Los Angeles, CA 90021', url: 'https://llsc.club' },
    { name: 'Senses Cafe', neighborhood: 'Downtown', address: '426 E 12th St, Los Angeles, CA 90015' },
    { name: 'Louma Bakery', neighborhood: 'Santa Monica', address: '3223 Wilshire Blvd, Santa Monica, CA 90403' },
];

// `pick: true` is the FF Picks stamp (curation_level 'ff_curated'), which is
// what /admin/kit's Picks tab builds the carousel from.
const EVENTS = [
    {
        name: 'Damn the Man: F**k Black Friday — Free Pinball All Day',
        date: '2026-11-27', start: '11:00', end: '22:00', venue: 'Revenge Of',
        vibe: 'Community', price: 'Free', pick: true, score: 8,
        flyer: 'revenge-of-damn-the-man.jpg',
        description: 'Every pinball machine at Revenge Of is on free play all day — skip the doorbusters and give yourself the gift of pinball.',
    },
    {
        name: 'Dina 5 Hour Set',
        date: '2026-11-27', start: '21:00', end: '02:00', venue: 'Blind Barber Highland Park',
        vibe: 'DJ Night', price: 'Free before 10PM, $10 after', pick: true, score: 8,
        flyer: 'dina-5-hour-set.jpg', performers: ['Dina'],
        description: 'Dina plays five hours of perreo, hip-hop and dembow. Free before 10PM, $10 at the door after.',
    },
    {
        name: 'Black Friday Flea Market',
        date: '2026-11-27', start: '11:00', end: '16:00', venue: 'Slow Jamz Gallery',
        vibe: 'Market', pick: false, score: 6, promoter: 'Slow Jamz', age: 'All Ages',
        flyer: 'slow-jamz-flea.jpg',
        description: 'Clothes, merch, vintage, tattoos, a photobooth, food, drinks and music.',
    },
    ...['2026-11-27', '2026-11-28', '2026-11-29'].map(date => ({
        name: 'Black Friday Big Record Sale',
        date, start: '09:00', end: '13:00', venue: 'Café Santo',
        vibe: 'Market', pick: false, score: 6, promoter: 'El Marchante & Café Santo',
        flyer: 'black-friday-record-sale.jpg',
        description: '1,000+ records across Black Friday weekend, presented by El Marchante and Café Santo.',
    })),
    {
        name: 'Now Serving × Synonym Holiday Market',
        date: '2026-11-28', start: '10:00', end: '15:30', venue: 'Zebulon',
        vibe: 'Market', pick: true, score: 8, promoter: 'Now Serving & Synonym',
        flyer: 'now-serving-synonym.jpg',
        url: 'https://ma.to/event/synonym-holiday-market-28-nov-2026',
        description: 'A Shop Small Saturday holiday market from the Chinatown cookbook shop Now Serving and Synonym, with about 25 vendors including Perro y Arena.',
    },
    {
        name: 'Support Your Small Business Saturday',
        date: '2026-11-28', start: '12:00', end: '18:00', venue: 'Kids of Immigrants',
        vibe: 'Market', pick: true, score: 8, promoter: 'Kids of Immigrants',
        flyer: 'kids-of-immigrants.jpg', performers: ['Prabs', 'Jstagirl', 'Jive MF'],
        description: 'Kids of Immigrants and Mom n Dad Vintage Shop host 18 local vendors with food and drinks, sounds by Prabs, Jstagirl and Jive MF, and film portraits by Thalia Gochez.',
    },
    {
        name: 'We Met On York: Small Biz Market',
        date: '2026-11-28', start: '12:00', end: '17:00', venue: 'York Manor',
        vibe: 'Market', price: 'Free', pick: false, score: 7,
        flyer: 'we-met-on-york.jpg',
        description: 'A Small Business Saturday market with 40+ vendors — art and stationery, home goods, jewelry, vintage and clothing, food and drinks, interactive booths and a DJ.',
    },
    {
        name: 'Radical Clothes Swap',
        date: '2026-11-28', start: '12:00', end: '15:00', venue: 'The Pop-Hop',
        vibe: 'Community', price: 'Free', pick: false, score: 6,
        flyer: 'radical-clothes-swap.jpg',
        description: 'Free clothes for all. Swap up to 10 items — clothes only, no shoes, accessories, undergarments or hosiery.',
    },
    {
        name: 'Lo Girl — "The Fields EP" Release Party',
        date: '2026-11-29', start: '19:30', venue: 'Junior High',
        vibe: 'Live Music', price: '$13', pick: true, score: 8,
        flyer: 'lo-girl-the-fields.jpg', performers: ['Lo Girl', 'Roger Halloway', 'Jopenga'],
        description: 'Lo Girl celebrates The Fields EP with support from Roger Halloway and Jopenga, plus ceramics by Margaret Leyva and photos by Rebeca Castillo. Doors 7PM.',
    },
    {
        name: 'Brain Dead Ceramic Vendor Fair',
        date: '2026-11-29', start: '12:00', end: '17:00', venue: 'Brain Dead Studios',
        vibe: 'Market', pick: true, score: 8,
        flyer: 'brain-dead-ceramic-fair.jpg',
        description: 'A holiday ceramics fair on the Brain Dead Studios patio with Nonporous Ceramics, Gianni Lottie, Elias Hernandez, Beck Shadbourne, Zakka Bakka and more.',
    },
    {
        name: 'Jazz Cats Vol. 006',
        date: '2026-11-29', venue: 'Little Lions Social Club',
        vibe: 'Live Music', pick: true, score: 8, promoter: "JIJI's Jazz Club",
        flyer: 'jazz-cats-006.jpg', performers: ['noamz', 'yinomi'],
        url: 'https://llsc.club',
        description: "Tea, live music and a cat lounge — JIJI's Jazz Club at Little Lions Social Club with noamz and yinomi. Reservations only at LLSC.club.",
    },
    {
        name: 'Sexy Angel Music',
        date: '2026-11-29', start: '11:00', end: '16:00', venue: 'Senses Cafe',
        vibe: 'Live Music', price: 'Free', pick: false, score: 7,
        flyer: 'senses-sexy-angel-music.jpg', performers: ['Rachana', 'Executive Lunch'],
        description: 'A free daytime bill with Rachana, Executive Lunch and more. Food by Twentieth Street Garden, drinks by Senses.',
    },
    {
        name: 'Cars & Coffee',
        date: '2026-11-29', start: '08:00', end: '10:00', venue: 'Louma Bakery',
        vibe: 'Community', pick: false, score: 5, promoter: 'Louma Bakery × Kindred Motorworks',
        flyer: 'cars-and-coffee-louma.jpg',
        description: 'A Sunday-morning car meet from Louma Bakery and Kindred Motorworks.',
    },
    {
        name: 'Gary Wilson',
        date: '2026-11-30', venue: 'Zebulon',
        vibe: 'Live Music', price: 'Free', pick: true, score: 9,
        flyer: 'gary-wilson-zebulon.jpg', performers: ['Gary Wilson'],
        description: 'A free night with Gary Wilson at Zebulon.',
    },
];

runSeed({
    inbox: 'flyer-inbox/thanksgiving-2026',
    source: 'instagram flyer, hand-verified',
    venues: VENUES,
    events: EVENTS,
}).catch(err => { console.error(err); process.exit(1); });
