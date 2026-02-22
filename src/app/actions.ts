'use server';

import { genAI } from '@/lib/gemini';
import { cookies } from 'next/headers';

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
    'flyer_url',
    'event_vibe',
] as const);

type AllowedEventField = typeof ALLOWED_EVENT_UPDATE_FIELDS extends Set<infer T> ? T : never;

function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

export async function approveEvent(id: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    await supabase.from('events').update({ status: 'approved' }).eq('id', id);
    revalidatePath('/');
    revalidatePath('/admin');
}

export async function rejectEvent(id: string) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');
    await supabase.from('events').update({ status: 'rejected' }).eq('id', id);
    revalidatePath('/');
    revalidatePath('/admin');
}

export async function updateEvent(id: string, updates: Record<string, unknown>) {
    await assertAdmin();
    if (!isNonEmptyString(id)) throw new Error('Invalid event id');

    // Strip any keys not in the allowlist before touching the DB.
    const safeUpdates: Partial<Record<AllowedEventField, unknown>> = {};
    for (const key of ALLOWED_EVENT_UPDATE_FIELDS) {
        if (key in updates) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) return;

    await supabase.from('events').update(safeUpdates).eq('id', id);
    revalidatePath('/');
    revalidatePath('/admin');
}

// --- Creator Studio Actions ---

export async function generateVibeStyle(prompt: string) {
    await assertAdmin();

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
