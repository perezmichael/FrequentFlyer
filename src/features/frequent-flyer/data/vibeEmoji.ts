import { VIBES } from './vibes';
import { RECURRING_CATEGORIES } from './recurringCategories';

/**
 * Resolve a free-text event category to a representative emoji.
 *
 * The scout's `event_vibe` is whatever Gemini writes, not a fixed enum — there
 * are 80+ distinct values in the DB ("Film Series", "Music (DJ Set)", "Standup
 * Comedy", "D.I.Y. Music Show"…). Exact-key lookups against VIBES therefore
 * missed almost everything and fell back to a generic 📍 pin, which is why the
 * map read as a field of identical markers.
 *
 * Strategy: exact match first (cheap, and keeps curated vocabularies
 * authoritative), then keyword matching, then the pin as a true last resort.
 * Order matters — the first matching rule wins, so put specific terms above
 * generic ones ("dance party" before "party", "live music" before "music").
 */

const FALLBACK_EMOJI = '📍';

/**
 * Non-event pin types (the /map page plots venues and guides alongside
 * events). A pin is the right icon for a venue, but make it deliberate rather
 * than an unresolved fallback, and give guides their own mark.
 */
const EXACT_OVERRIDES: Record<string, string> = {
    Venue: '📍',
    Guide: '🗺️',
};

const KEYWORD_RULES: Array<[RegExp, string]> = [
    [/comedy|stand[\s-]?up|improv|sketch show|open mic night/, '😂'],
    [/film|screening|cinema|movie|documentary|video/, '🎥'],
    [/karaoke/, '🎤'],
    [/open mic/, '🎙️'],
    [/trivia|quiz|pub quiz/, '🧠'],
    [/bingo/, '🎱'],
    [/board game|game night|gaming|arcade|cornhole|bowling|\bgame\b/, '🎲'],
    [/vinyl|record|listening/, '💿'],
    [/dj|disco|rave|club night|dance/, '🎧'],
    [/jazz|blues|soul|funk/, '🎷'],
    [/punk|metal|hardcore|noise/, '🎸'],
    [/concert|band|live music|music|gig|showcase|set\b/, '🎶'],
    [/book|reading|literary|poetry|zine|author/, '📖'],
    [/art|gallery|exhibition|mural|paint|craft|ceramic|draw/, '🎨'],
    [/market|flea|vendor|pop[\s-]?up|bazaar|swap/, '🛍️'],
    [/happy hour|drink|cocktail|beer|brew|wine|cider|bar\b/, '🍹'],
    [/food|taco|dinner|brunch|supper|bake|chef|tasting/, '🍽️'],
    [/yoga|wellness|meditat|sound bath|breathwork|healing/, '🧘'],
    [/workshop|class|lecture|talk|seminar|learn|education/, '🛠️'],
    [/run|bike|skate|sport|fitness|hike|yoga/, '🏃'],
    [/festival|celebration|holiday|anniversary|birthday|new year/, '🎉'],
    [/community|meetup|social|mixer|network/, '🌳'],
    [/drag|burlesque|cabaret|variety|performance|theat|dance party/, '🎭'],
    [/fashion|thrift|vintage|style/, '👗'],
    [/night/, '🌙'],
];

/** Pull the leading emoji out of a label like "🎶 Music". */
function emojiFromLabel(label: string | undefined): string | null {
    if (!label) return null;
    const first = label.split(' ')[0];
    return first || null;
}

export function resolveVibeEmoji(vibe: string | undefined | null): string {
    if (!vibe) return FALLBACK_EMOJI;

    if (EXACT_OVERRIDES[vibe]) return EXACT_OVERRIDES[vibe];

    // 1. Curated vocabularies win — they're hand-assigned.
    const exact = emojiFromLabel(VIBES[vibe] || RECURRING_CATEGORIES[vibe]);
    if (exact) return exact;

    // 2. Keyword match against the free-text category.
    const text = vibe.toLowerCase();
    for (const [pattern, emoji] of KEYWORD_RULES) {
        if (pattern.test(text)) return emoji;
    }

    return FALLBACK_EMOJI;
}

/**
 * The emoji that best represents a group of events at one pin: resolve each
 * event first, then take the most common emoji. Counting resolved emoji rather
 * than raw category strings is what makes a venue with "Music", "Live Music"
 * and "Music Performance" read as 🎶 instead of scattering across three
 * one-off strings and picking an arbitrary winner.
 */
export function representativeEmoji(vibes: Array<string | undefined>): string {
    const counts = new Map<string, number>();
    for (const v of vibes) {
        const emoji = resolveVibeEmoji(v);
        if (emoji === FALLBACK_EMOJI) continue; // don't let unknowns outvote real ones
        counts.set(emoji, (counts.get(emoji) || 0) + 1);
    }
    let best = FALLBACK_EMOJI;
    let bestN = 0;
    for (const [emoji, n] of counts) {
        if (n > bestN) {
            bestN = n;
            best = emoji;
        }
    }
    return best;
}
