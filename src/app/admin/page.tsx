import { supabase } from '@/lib/supabase';
import AdminEventList from '@/features/admin/components/AdminEventList';

// Helper to deduce image if missing
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
        .order('event_date', { ascending: true });

    if (error) {
        console.error("Admin Fetch Error:", error);
        return [];
    }

    // Transform to match Event interface
    return events.map((e: any) => ({
        id: e.id,
        title: e.event_name,
        date: e.event_date,
        location: e.venues?.name || 'Unknown',
        description: e.metadata?.justification || '',
        image: ensureImage(e.flyer_url),
        neighborhood: e.venues?.neighborhood || 'Unknown',
        vibe: e.event_vibe ? [e.event_vibe] : [],
        status: e.status || 'pending',
        vibe_score: e.metadata?.vibe_score || 0,
        lat: e.venues?.lat || 0,
        lng: e.venues?.lng || 0
    }));
}

export default async function AdminPage() {
    const events = await getAdminEvents();

    return (
        <div className="container mx-auto py-10 px-4 md:px-8 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
                <p className="text-muted-foreground">Curate events from the scout runner.</p>
            </div>

            <AdminEventList events={events} />
        </div>
    );
}
