import { Suspense } from 'react';
import MapPageClient from '@/features/frequent-flyer/components/MapPageClient';
import { supabase } from '@/lib/supabase';
import { Event } from '@/features/frequent-flyer/data/events';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';

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

async function getVenues() {
    const { data, error } = await supabase
        .from('venues')
        .select('*');

    if (error) {
        console.error('Error fetching venues:', error);
        return [];
    }
    return data || [];
}

async function getGuides(): Promise<GuideWithItems[]> {
    const { data, error } = await supabase
        .from('guides')
        .select(`
            *,
            items:guide_items(
                *,
                venues(*)
            )
        `)
        .eq('is_published', true);

    if (error) {
        console.error('Error fetching guides:', error);
        return [];
    }
    return data || [];
}

export default async function MapPage() {
    const [events, venues, guides] = await Promise.all([
        getEvents(),
        getVenues(),
        getGuides()
    ]);

    return (
        <Suspense fallback={<div>Loading map...</div>}>
            <MapPageClient initialEvents={events} venues={venues} guides={guides} />
        </Suspense>
    );
}
