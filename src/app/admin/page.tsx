import { supabase } from '@/lib/supabase';
import { getAdminRecurringEvents } from '@/lib/queries';
import AdminEventList from '@/features/admin/components/AdminEventList';
import AdminRecurringEventList from '@/features/admin/components/AdminRecurringEventList';
import { adminLogout } from './login/actions';
import AdminPageClient from './AdminPageClient';

const ensureImage = (url: string) => {
    if (!url) return '/placeholder.jpg';
    return url;
};

export const dynamic = 'force-dynamic';

async function getAdminEvents() {
    /**
     * Paged, because PostgREST silently caps an unbounded select at 1000 rows.
     *
     * There was no .limit() here, which reads like "give me everything" and
     * isn't — the table holds 2,374 events and the admin was being handed the
     * 1,000 with the latest dates. Everything older than that simply wasn't in
     * the page: ~650 past-dated pending rows that could never be reviewed,
     * with nothing in the UI to say they existed.
     *
     * Nothing failed and no error was returned, which is what made it invisible.
     */
    const PAGE = 1000;
    const events: any[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                venues (name, neighborhood, url)
            `)
            .order('event_date', { ascending: false })
            .range(from, from + PAGE - 1);

        if (error) {
            console.error("Admin Fetch Error:", error);
            // Return what we have rather than nothing — a partial queue is
            // still reviewable, an empty one looks like the database is down.
            break;
        }
        events.push(...(data || []));
        if (!data || data.length < PAGE) break;
    }

    return events.map((e: any) => ({
        id: e.id,
        title: e.event_name,
        date: e.event_date,
        location: e.venues?.name || 'Unknown',
        description: e.metadata?.justification || '',
        image: ensureImage(e.flyer_url),
        flyer_url: e.flyer_url || '',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        vibe: e.event_vibe ? [e.event_vibe] : [],
        status: e.status || 'pending',
        startTime: e.start_time || null,
        endTime: e.end_time || null,
        venueName: e.venues?.name || 'Unknown',
        sourceUrl: e.source_url || e.venues?.url || null,
        eventVibe: e.event_vibe || null,
        lockedFields: Array.isArray(e.metadata?.editor_locked) ? e.metadata.editor_locked : [],
        scrapedValues: e.metadata?.scraped_values || {},
        vibe_score: e.metadata?.vibe_score || 0,
        curationLevel: e.curation_level || 'scraped',
        // Your reason for picking it — distinct from metadata.justification,
        // which is the scout explaining its own score.
        pickNote: e.metadata?.pick_note || '',
        // Untagged means the scout wrote it — 2,255 of the 2,288 rows with no
        // metadata.source are curation_level 'scraped'. Defaulting these to
        // 'manual' labelled 2,288 scraped events as hand-entered, which made
        // the source filter's largest bucket a lie.
        source: e.metadata?.source || 'scout',
        lat: e.venues?.lat || 0,
        lng: e.venues?.lng || 0
    }));
}

export default async function AdminPage() {
    const [events, recurringEvents] = await Promise.all([
        getAdminEvents(),
        getAdminRecurringEvents(),
    ]);

    return (
        <div className="container mx-auto px-4 md:px-8 max-w-7xl pt-10 pb-10">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
                    <p className="text-muted-foreground">Curate events from the scout runner.</p>
                </div>
                <form action={adminLogout}>
                    <button
                        type="submit"
                        className="text-sm font-space-mono uppercase tracking-wide text-black/50 hover:text-black transition-colors"
                    >
                        Log out
                    </button>
                </form>
            </div>

            <AdminPageClient
                events={events}
                recurringEvents={recurringEvents}
            />
        </div>
    );
}
