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
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>Admin Dashboard</h1>
            <p style={{ marginBottom: '32px', color: '#666' }}>Curate events from the scout runner.</p>

            <AdminEventList events={events} />
        </div>
    );
}
