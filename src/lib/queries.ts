import 'server-only';
import { supabase } from '@/lib/supabase';
import { Event } from '@/features/frequent-flyer/data/events';
import { GuideWithItems } from '@/features/frequent-flyer/types/guides';
import { RecurringEvent } from '@/features/frequent-flyer/data/recurringEvents';

export async function getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
        .from('events')
        .select(`
      id,
      event_name,
      event_date,
      start_time,
      end_time,
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

    return data.map((e: any) => ({
        id: e.id,
        title: e.event_name,
        date: e.event_date,
        startTime: e.start_time || null,
        endTime: e.end_time || null,
        location: `${e.venues?.name || 'Unknown'}, ${e.venues?.neighborhood || 'LA'}`,
        description: e.metadata?.justification || 'No description available',
        lat: e.venues?.lat || 34.0522,
        lng: e.venues?.lng || -118.2437,
        image: e.flyer_url || '/placeholder.jpg',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        vibe: e.event_vibe ? [e.event_vibe] : ['Event'],
        url: e.venues?.url,
    }));
}

export async function getVenues() {
    const { data, error } = await supabase
        .from('venues')
        .select('*');

    if (error) {
        console.error('Error fetching venues:', error);
        return [];
    }
    return data || [];
}

export async function getGuides(): Promise<GuideWithItems[]> {
    const { data, error } = await supabase
        .from('guides')
        .select(`
            *,
            items:guide_items(
                *,
                venues(*)
            )
        `)
        ;

    if (error) {
        console.error('Error fetching guides:', error);
        return [];
    }
    return data || [];
}

export async function getRecurringEvents(): Promise<RecurringEvent[]> {
    const { data, error } = await supabase
        .from('recurring_events')
        .select(`
            id, event_name, category, day_of_week, start_time, end_time,
            recurrence, description,
            venues (name, neighborhood, lat, lng, url, image_url)
        `)
        .eq('status', 'approved')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching recurring events:', error);
        return [];
    }

    return (data || []).map((e: any) => ({
        id: e.id,
        event_name: e.event_name,
        category: e.category,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        recurrence: e.recurrence,
        description: e.description,
        venue_name: e.venues?.name || 'Unknown',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        lat: e.venues?.lat || 34.0522,
        lng: e.venues?.lng || -118.2437,
        venue_url: e.venues?.url,
        venue_image: e.venues?.image_url,
    }));
}

export async function getAdminRecurringEvents(): Promise<(RecurringEvent & { status: string })[]> {
    const { data, error } = await supabase
        .from('recurring_events')
        .select(`
            id, event_name, category, day_of_week, start_time, end_time,
            recurrence, description, status,
            venues (name, neighborhood, lat, lng, url, image_url)
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error fetching admin recurring events:', error);
        return [];
    }

    return (data || []).map((e: any) => ({
        id: e.id,
        event_name: e.event_name,
        category: e.category,
        day_of_week: e.day_of_week,
        start_time: e.start_time,
        end_time: e.end_time,
        recurrence: e.recurrence,
        description: e.description,
        status: e.status || 'pending',
        venue_name: e.venues?.name || 'Unknown',
        neighborhood: e.venues?.neighborhood || 'Unknown',
        lat: e.venues?.lat || 34.0522,
        lng: e.venues?.lng || -118.2437,
        venue_url: e.venues?.url,
        venue_image: e.venues?.image_url,
    }));
}
