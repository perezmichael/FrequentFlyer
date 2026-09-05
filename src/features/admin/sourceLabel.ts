/**
 * Where an event came from, as one of a small number of labels.
 *
 * `metadata.source` is written by whatever created the row, and one writer —
 * the flyer importer — stores the filename it read:
 *
 *     "flyer image: imgi_2_766242003_17877562272685128_8857871893837861713_n.jpg"
 *
 * That is genuinely useful when you're looking at a single event and want to
 * know which flyer produced it, but it makes the value unusable as a *category*:
 * 24 of the table's 31 distinct sources are filenames matching exactly one
 * event. The admin's source filter rendered one pill per value, so the row was
 * 32 buttons wide and the only one that mattered — the single `public_create`
 * from a person filling out the form — sat somewhere in the middle of it.
 *
 * So group for filtering, keep the raw string on the row for detail. Anything
 * unrecognised passes through unchanged rather than being bucketed into
 * "other", because a new writer showing up should be visible, not hidden.
 */

/** A person filled out the form on the site. The one source with a human waiting. */
export const SUBMITTED = 'Submitted';

export function sourceLabel(raw?: string | null): string {
    // The scout doesn't tag its rows — 2,255 of the 2,288 untagged events are
    // curation_level 'scraped', the rest are ones you later promoted by hand.
    if (!raw || raw === 'scout' || raw === 'master_scout') return 'Scout';

    if (raw === 'public_create') return SUBMITTED;

    if (raw.startsWith('flyer image:') || raw === 'flyer supplied by editor') {
        return 'Flyer';
    }

    if (raw === 'seed_script') return 'Seed';
    if (raw === 'manual') return 'Manual';

    return raw;
}
