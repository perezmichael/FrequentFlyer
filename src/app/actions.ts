'use server';

import { genAI } from '@/lib/gemini';
import { cookies } from 'next/headers';
import { VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';

// ---------------------------------------------------------------------------
// Auth guard — call at the top of every admin server action.
// Middleware protects the page routes, but server actions can be POSTed
// directly, so each action must verify the session independently.
// ---------------------------------------------------------------------------
async function assertAdmin() {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session')?.value;
    if (!process.env.ADMIN_SECRET || session !== process.env.ADMIN_SECRET) {
        throw new Error('Unauthorized');
    }
}

// ---------------------------------------------------------------------------
// Public actions (called from non-admin pages)
// ---------------------------------------------------------------------------

export async function getVibeCheck(eventTitle: string, eventVibes: string[]) {
    try {
        // System instruction is fixed and never contains user data.
        // User-supplied values are passed as a separate user-role message,
        // which prevents prompt injection from hijacking the instructions.
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction:
                'You are Benny, the vibe curator of Los Angeles. ' +
                'When given an event name and vibe tags, respond with exactly ' +
                '1 sentence as a "Vibe Check". Keep it cool, slightly ' +
                'mysterious, and under 20 words. Never use hashtags.',
        });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: `Event name: ${eventTitle}\nVibe tags: ${eventVibes.join(', ')}` }],
            }],
        });

        return result.response.text();
    } catch (error) {
        console.error('Gemini Error:', error);
        return 'The vibes are mysterious... (AI Error)';
    }
}

export async function getVenuesForCreate() {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
        .from('venues')
        .select('id, name, neighborhood')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching venues for create:', error);
        return [];
    }
    return data || [];
}

export async function getGuides() {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
        .from('guides')
        .select(`
            *,
            items: guide_items (
                id,
                order_index,
                curator_note,
                venue_id,
                venues (
                    name,
                    neighborhood,
                    lat,
                    lng,
                    url,
                    image_url
                )
            )
        `);

    if (error) {
        console.error('Error fetching guides:', error);
        return [];
    }

    return data;
}

// ---------------------------------------------------------------------------
// Admin actions — all guarded by assertAdmin()
// ---------------------------------------------------------------------------

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// Fields the admin UI is allowed to write. Anything outside this set is dropped.
const ALLOWED_EVENT_UPDATE_FIELDS = new Set([
    'event_name',
    'event_date',
    'start_time',
    'end_time',
    'flyer_url',
    'event_vibe',
] as const);

type AllowedEventField = typeof ALLOWED_EVENT_UPDATE_FIELDS extends Set<infer T> ? T : never;

function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

const ALLOWED_EVENT_STATUSES = new Set(['pending', 'approved', 'rejected'] as const);
type EventStatus = 'pending' | 'approved' | 'rejected';

function revalidateEventPaths() {
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/events');
    revalidatePath('/events2');
}

export async function approveEvent(id: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    await supabase.from('events').update({ status: 'approved' }).eq('id', id);
    revalidateEventPaths();
}

const ALLOWED_CURATION_LEVELS = new Set(['scraped', 'ff_curated', 'promoted'] as const);

/**
 * Set an event's curation level — independent of status.
 *
 * Approving says "this is real, show it". Curating says "I'd go to this".
 * They're different claims, and only the second one is taste, so it gets its
 * own control rather than riding on approve.
 */
// Venue fields the admin UI may write. Same allowlist discipline as events:
// anything outside this set is dropped before the DB is touched.
const ALLOWED_VENUE_UPDATE_FIELDS = new Set([
    'name',
    'neighborhood',
    'address',
    'url',
    'instagram_handle',
    'lat',
    'lng',
] as const);

/**
 * Edit a venue.
 *
 * Venues were entirely read-only in the app — no update path, no action, no UI
 * — so every correction needed someone with database access. That's untenable
 * for records the scout and flyer importer create automatically: a misread
 * name ("De Rustic Inn" for Ye Rustic Inn), a venue with no pin, a street
 * that's genuinely the venue and needs a real address.
 *
 * lat/lng move together on purpose. A venue with one and not the other is
 * worse than a venue with neither: the map treats a half-coordinate as a real
 * position and drops the pin in the ocean.
 */
export async function updateVenue(id: string, updates: Record<string, unknown>) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid venue id');

    const safe: Record<string, unknown> = {};
    for (const key of ALLOWED_VENUE_UPDATE_FIELDS) {
        if (key in updates) safe[key] = updates[key];
    }

    if (typeof safe.name === 'string') {
        const name = safe.name.trim();
        // The scout and importer both match venues by name; an empty one would
        // orphan every future match against this room.
        if (!name) throw new Error('Venue name cannot be empty');
        safe.name = name;
    }

    for (const k of ['lat', 'lng'] as const) {
        if (!(k in safe)) continue;
        const raw = safe[k];
        if (raw === null || raw === '') { safe[k] = null; continue; }
        const n = Number(raw);
        if (!Number.isFinite(n)) throw new Error(`Invalid ${k}`);
        safe[k] = n;
    }
    // Never leave a venue half-placed.
    if (('lat' in safe) !== ('lng' in safe)) {
        throw new Error('lat and lng must be set together');
    }
    if (safe.lat === null || safe.lng === null) {
        safe.lat = null;
        safe.lng = null;
    }

    if (Object.keys(safe).length === 0) return;

    const { error } = await supabase.from('venues').update(safe).eq('id', id);
    if (error) throw new Error(error.message);

    revalidateEventPaths();
    // A venue's name and neighborhood show on every card and every
    // /[neighborhood] page it appears on.
    revalidatePath('/map');
}

/** Merge keys into an event's metadata without clobbering what's there. */
async function mergeEventMetadata(id: string, patch: Record<string, unknown>) {
    const { data } = await supabase
        .from('events').select('metadata').eq('id', id).maybeSingle();
    return { ...((data?.metadata as object) || {}), ...patch };
}

export async function setEventCuration(id: string, level: string, note?: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    if (!ALLOWED_CURATION_LEVELS.has(level as any)) throw new Error('Invalid curation level');

    const update: Record<string, unknown> = { curation_level: level };

    // Why you picked it, in your words. metadata.justification is the scout's
    // reasoning about its own score — a model explaining itself — and it was
    // the only "why" being stored anywhere. This is the editorial judgment
    // that's actually yours, and it was evaporating every week: 8 picks, zero
    // recorded reasons. It's also the raw material for guide copy later.
    if (typeof note === 'string') {
        update.metadata = await mergeEventMetadata(id, {
            pick_note: note.trim().slice(0, 500),
            pick_noted_at: new Date().toISOString(),
        });
    }

    await supabase.from('events').update(update).eq('id', id);
    revalidateEventPaths();
}

/** Reason accepted here; the canonical buckets live in @/lib/rejectReasons. */
export async function rejectEvent(id: string, reason?: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');

    const update: Record<string, unknown> = { status: 'rejected' };

    // 110 rejected events carried no reason at all. What you chose NOT to show
    // is as much a preference signal as what you picked, and it costs one tap.
    if (typeof reason === 'string' && reason.trim()) {
        update.metadata = await mergeEventMetadata(id, {
            reject_reason: reason.trim().slice(0, 120),
            rejected_at: new Date().toISOString(),
        });
    }

    await supabase.from('events').update(update).eq('id', id);
    revalidateEventPaths();
}

// Used for undo — also accepts 'pending' to revert.
export async function setEventStatus(id: string, status: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    if (!ALLOWED_EVENT_STATUSES.has(status as EventStatus)) {
        throw new Error('Invalid status');
    }
    await supabase.from('events').update({ status }).eq('id', id);
    revalidateEventPaths();
}

export async function setEventsStatus(ids: string[], status: string) {
    await assertAdmin();
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('No event ids');
    if (ids.length > 500) throw new Error('Too many events in one call');
    const cleanIds = ids.filter(isNonEmptyString);
    if (cleanIds.length === 0) throw new Error('No valid event ids');
    if (!ALLOWED_EVENT_STATUSES.has(status as EventStatus)) {
        throw new Error('Invalid status');
    }
    await supabase.from('events').update({ status }).in('id', cleanIds);
    revalidateEventPaths();
}

/**
 * Fields the scout rewrites on every re-match. An editor's value for one of
 * these has to be recorded as deliberate, or tomorrow's 10am run replaces it.
 */
const SCOUT_OWNED_FIELDS = new Set([
    'event_name', 'event_date', 'start_time', 'end_time', 'event_vibe',
]);

export async function updateEvent(id: string, updates: Record<string, unknown>) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');

    // Strip any keys not in the allowlist before touching the DB.
    const safeUpdates: Partial<Record<AllowedEventField, unknown>> = {};
    for (const key of ALLOWED_EVENT_UPDATE_FIELDS) {
        if (key in updates) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) return;

    // Read the current row so we can record what the venue said before this
    // edit, and mark which fields the editor now owns.
    const { data: current } = await supabase
        .from('events')
        .select('event_name, event_date, start_time, end_time, event_vibe, metadata')
        .eq('id', id)
        .maybeSingle();

    const metadata: Record<string, unknown> = { ...((current?.metadata as object) || {}) };
    const locked = new Set<string>(
        Array.isArray(metadata.editor_locked) ? (metadata.editor_locked as string[]) : [],
    );
    // Keep the scraped original the first time a field is overridden, so the
    // divergence stays visible and nothing the venue published is lost.
    const scrapedValues: Record<string, unknown> = {
        ...((metadata.scraped_values as object) || {}),
    };

    for (const key of Object.keys(safeUpdates)) {
        if (!SCOUT_OWNED_FIELDS.has(key)) continue;
        if (!locked.has(key) && current && key in current) {
            scrapedValues[key] = (current as Record<string, unknown>)[key];
        }
        locked.add(key);
    }

    metadata.editor_locked = Array.from(locked);
    if (Object.keys(scrapedValues).length > 0) metadata.scraped_values = scrapedValues;

    await supabase
        .from('events')
        .update({ ...safeUpdates, metadata })
        .eq('id', id);

    revalidateEventPaths();
}

export async function uploadEventFlyer(id: string, fileBase64: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    if (!isNonEmptyString(fileBase64) || !fileBase64.startsWith('data:image/')) {
        throw new Error('Invalid image data');
    }

    const mime = fileBase64.split(';')[0].split(':')[1]; // e.g. image/jpeg
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const buffer = Buffer.from(fileBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const fileName = `flyers/${id}.${ext}`;

    const { error } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, buffer, { contentType: mime, upsert: true });

    if (error) throw new Error('Upload failed: ' + error.message);

    const publicUrl = supabase.storage.from('event-flyers').getPublicUrl(fileName).data.publicUrl;
    await supabase.from('events').update({ flyer_url: publicUrl }).eq('id', id);

    revalidatePath('/admin');
    revalidatePath('/');
    revalidatePath('/events');
    revalidatePath('/events2');

    return { url: publicUrl };
}

// --- Creator Studio Actions ---

async function generateVibeStyleCore(prompt: string) {
    // System instruction is fixed. User-supplied prompt is passed as a
    // separate user message to prevent it from overriding instructions.
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction:
            'You are a Visual Synthesis Engine (Nano Banana). ' +
            'When given a vibe description, return ONLY a valid JSON object ' +
            'with these fields: ' +
            '"backgroundImage" (a CSS gradient string), ' +
            '"backgroundColor" (dominant hex color), ' +
            '"fontColor" (contrasting hex color), ' +
            '"fontFamily" (a Google Font name). ' +
            'No markdown, no explanation, no code fences. JSON only.',
    });

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const text = result.response.text().trim();
        return JSON.parse(text);
    } catch (e) {
        console.error('Gemini Vibe Design Error:', e);
        return {
            backgroundColor: '#000000',
            backgroundImage: 'linear-gradient(45deg, #FF00CC 0%, #333399 100%)',
            fontColor: '#ffffff',
            fontFamily: 'Helvetica',
        };
    }
}

export async function generateVibeStyle(prompt: string) {
    await assertAdmin();
    return generateVibeStyleCore(prompt);
}

// Public flyer-design generator used by the /create form. Length-capped to
// keep prompts (and AI cost) bounded since this is unauthenticated.
export async function generateVibeStylePublic(prompt: string) {
    if (!isNonEmptyString(prompt)) throw new Error('Prompt is required');
    return generateVibeStyleCore(prompt.slice(0, 500));
}

interface PublishEventFormData {
    title: string;
    date: string;
    venue: string;
    vibe: string;
}

function validatePublishFormData(formData: unknown): asserts formData is PublishEventFormData {
    if (!formData || typeof formData !== 'object') throw new Error('Invalid form data');
    const f = formData as Record<string, unknown>;
    if (!isNonEmptyString(f.title)) throw new Error('title is required');
    if (!isNonEmptyString(f.date)) throw new Error('date is required');
    if (!isNonEmptyString(f.venue)) throw new Error('venue is required');
    if (!isNonEmptyString(f.vibe)) throw new Error('vibe is required');
}

export async function publishEvent(formData: unknown, flyerBase64: string) {
    await assertAdmin();
    validatePublishFormData(formData);

    if (!isNonEmptyString(flyerBase64) || !flyerBase64.startsWith('data:image/')) {
        throw new Error('Invalid flyer image');
    }

    // 1. Upload Flyer
    const buffer = Buffer.from(flyerBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    const fileName = `created-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(fileName, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
        });

    if (uploadError) throw new Error('Upload Failed: ' + uploadError.message);

    const publicUrl = supabase.storage.from('event-flyers').getPublicUrl(fileName).data.publicUrl;

    // 2. Create Event Record
    const { data, error } = await supabase.from('events').insert({
        event_name: formData.title,
        event_date: formData.date,
        metadata: { venue_text: formData.venue },
        event_vibe: formData.vibe,
        flyer_url: publicUrl,
        status: 'approved',
    }).select().single();

    if (error) throw new Error('DB Save Failed: ' + error.message);

    return { success: true, event: data };
}

// --- Recurring Event Admin Actions ---

const ALLOWED_RECURRING_UPDATE_FIELDS = new Set([
    'event_name',
    'category',
    'day_of_week',
    'start_time',
    'end_time',
    'description',
] as const);

type AllowedRecurringField = typeof ALLOWED_RECURRING_UPDATE_FIELDS extends Set<infer T> ? T : never;

export async function approveRecurringEvent(id: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    await supabase.from('recurring_events').update({ status: 'approved' }).eq('id', id);
    revalidatePath('/admin');
    revalidatePath('/events');
}

export async function rejectRecurringEvent(id: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    await supabase.from('recurring_events').update({ status: 'rejected' }).eq('id', id);
    revalidatePath('/admin');
    revalidatePath('/events');
}

export async function updateRecurringEvent(id: string, updates: Record<string, unknown>) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');

    const safeUpdates: Partial<Record<AllowedRecurringField, unknown>> = {};
    for (const key of ALLOWED_RECURRING_UPDATE_FIELDS) {
        if (key in updates) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) return;

    await supabase.from('recurring_events').update(safeUpdates).eq('id', id);
    revalidatePath('/admin');
    revalidatePath('/events');
}

// ---------------------------------------------------------------------------
// Public event submission (called from the /create page).
// Unauthenticated: every submission is forced to status 'pending' so it must
// pass through the admin moderation queue before appearing on the site.
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Accepts "HH:MM" or "HH:MM:SS" (the format an <input type="time"> emits).
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export async function submitEvent(input: unknown, flyerBase64?: string) {
    if (!input || typeof input !== 'object') throw new Error('Invalid submission');
    const f = input as Record<string, unknown>;

    if (!isNonEmptyString(f.title)) throw new Error('Event name is required');
    if (!isNonEmptyString(f.date) || !DATE_RE.test(f.date)) throw new Error('A valid date is required');
    if (!isNonEmptyString(f.vibe) || !VIBE_KEYS.includes(f.vibe)) throw new Error('A valid vibe is required');
    if (f.startTime != null && f.startTime !== '' && (!isNonEmptyString(f.startTime) || !TIME_RE.test(f.startTime))) {
        throw new Error('Invalid start time');
    }
    if (f.endTime != null && f.endTime !== '' && (!isNonEmptyString(f.endTime) || !TIME_RE.test(f.endTime))) {
        throw new Error('Invalid end time');
    }

    const title = f.title.trim().slice(0, 200);
    const date = f.date;
    const vibe = f.vibe;
    const description = isNonEmptyString(f.description) ? f.description.trim().slice(0, 1000) : null;
    const startTime = isNonEmptyString(f.startTime) ? f.startTime : null;
    const endTime = isNonEmptyString(f.endTime) ? f.endTime : null;

    // Resolve the venue: use an existing one by id, or create a new row from a
    // free-text name. Either path must yield a venue_id.
    let venueId: string;
    if (isNonEmptyString(f.venueId)) {
        if (!UUID_RE.test(f.venueId)) throw new Error('Invalid venue');
        const { data: existing, error } = await supabase
            .from('venues')
            .select('id')
            .eq('id', f.venueId)
            .single();
        if (error || !existing) throw new Error('Venue not found');
        venueId = existing.id;
    } else if (isNonEmptyString(f.venueName)) {
        const name = f.venueName.trim().slice(0, 200);
        const neighborhood = isNonEmptyString(f.venueNeighborhood)
            ? f.venueNeighborhood.trim().slice(0, 120)
            : 'Los Angeles';
        const { data: created, error } = await supabase
            .from('venues')
            .insert({ name, neighborhood, metadata: { source: 'public_create' } })
            .select('id')
            .single();
        if (error || !created) throw new Error('Could not create venue: ' + (error?.message ?? 'unknown'));
        venueId = created.id;
    } else {
        throw new Error('A venue is required');
    }

    // Optional flyer upload.
    let flyerUrl: string | null = null;
    if (isNonEmptyString(flyerBase64)) {
        if (!flyerBase64.startsWith('data:image/')) throw new Error('Invalid flyer image');
        // Cap at ~8MB of base64 to avoid abuse from an unauthenticated endpoint.
        if (flyerBase64.length > 8_000_000) throw new Error('Flyer image is too large');
        const buffer = Buffer.from(flyerBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const fileName = `submitted-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
            .from('event-flyers')
            .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw new Error('Flyer upload failed: ' + uploadError.message);
        flyerUrl = supabase.storage.from('event-flyers').getPublicUrl(fileName).data.publicUrl;
    }

    const { error: insertError } = await supabase.from('events').insert({
        event_name: title,
        event_date: date,
        start_time: startTime,
        end_time: endTime,
        event_vibe: vibe,
        venue_id: venueId,
        flyer_url: flyerUrl,
        status: 'pending',
        metadata: { justification: description, source: 'public_create' },
    });

    if (insertError) throw new Error('Could not submit event: ' + insertError.message);

    revalidatePath('/admin');
    return { success: true };
}
