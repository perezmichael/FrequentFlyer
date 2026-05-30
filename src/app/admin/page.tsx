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
    const { data: events, error } = await supabase
        .from('events')
        .select(`
            *,
            venues (name, neighborhood)
        `)
        .order('event_date', { ascending: false });

    if (error) {
        console.error("Admin Fetch Error:", error);
        return [];
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
        vibe_score: e.metadata?.vibe_score || 0,
        source: e.metadata?.source || 'manual',
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
