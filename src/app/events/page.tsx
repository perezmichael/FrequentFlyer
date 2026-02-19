import { Suspense } from 'react';
import EventsPageClient from '@/features/frequent-flyer/components/EventsPageClient';
import { supabase } from '@/lib/supabase';
import { Event } from '@/features/frequent-flyer/data/events';

// Force dynamic rendering since we are fetching live data
export const dynamic = 'force-dynamic';

async function getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select(`
      id,
      event_name,
      event_date,
      event_vibe,
      flyer_url,
      metadata,
      venues (
        name,
        neighborhood,
        lat,
        lng,
        url
      )
    `)
        .order('event_date', { ascending: true })
        .eq('status', 'approved');

    if (error) {
        console.error('Error fetching events:', error);
        return [];
    }

    // Transform Database events to Frontend Event shape
    return data.map((e: any) => ({
        id: e.id,
        title: e.event_name,
        date: e.event_date, // Keep as ISO string, frontend parses it
        location: `${e.venues?.name || 'Unknown'}, ${e.venues?.neighborhood || 'LA'}`,
        description: e.metadata?.justification || 'No description available',
        lat: e.venues?.lat || 34.0522, // Fallback to LA center
        lng: e.venues?.lng || -118.2437,
        image: e.flyer_url || '/placeholder.jpg',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        vibe: e.event_vibe ? [e.event_vibe] : ['Event'], // Wrap single category in array
        url: e.venues?.url // Optional extra
    }));
}

export default async function EventsPage() {
    const events = await getEvents();

    return (
        <Suspense fallback={<div>Loading events...</div>}>
            <EventsPageClient initialEvents={events} />
        </Suspense>
    );
}
