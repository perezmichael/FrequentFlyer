import { supabase } from '@/lib/supabase';
import KitClient, { KitEvent } from './KitClient';

export const dynamic = 'force-dynamic';

/**
 * The upcoming Thursday→Sunday block. If today is already inside one
 * (Thu/Fri/Sat/Sun), use the block we're standing in rather than skipping a
 * week — the kit is most useful mid-weekend, not only on Mondays.
 */
function weekendWindow(now = new Date()) {
    const day = now.getDay(); // 0 Sun … 6 Sat
    const start = new Date(now);
    if (day === 0) {
        start.setDate(now.getDate() - 3); // Sunday belongs to the block that began Thursday
    } else {
        start.setDate(now.getDate() + ((4 - day + 7) % 7)); // next Thursday
    }
    const end = new Date(start);
    end.setDate(start.getDate() + 3);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(start), to: iso(end) };
}

/** Today → N days out, for building a kit that isn't this weekend's. */
function rollingWindow(days: number, now = new Date()) {
    const end = new Date(now);
    end.setDate(now.getDate() + days);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(now), to: iso(end) };
}

export default async function KitPage({
    searchParams,
}: {
    searchParams?: { days?: string };
}) {
    // Default is the weekend block; ?days=N widens it, so a flyer for a show
    // three weeks out is still reachable without editing code.
    const days = Number(searchParams?.days);
    const { from, to } = Number.isFinite(days) && days > 0
        ? rollingWindow(Math.min(days, 90))
        : weekendWindow();

    const { data, error } = await supabase
        .from('events')
        .select('id, event_name, event_date, start_time, end_time, flyer_url, event_vibe, curation_level, venues (name, neighborhood)')
        .gte('event_date', from)
        .lte('event_date', to)
        .eq('status', 'approved')
        .order('event_date', { ascending: true });

    if (error) console.error('Kit fetch error:', error);

    const events: KitEvent[] = (data || []).map((e: any) => ({
        id: e.id,
        title: (e.event_name || '').trim(),
        date: e.event_date,
        startTime: e.start_time,
        endTime: e.end_time,
        flyerUrl: e.flyer_url || null,
        vibe: e.event_vibe || null,
        venue: e.venues?.name || '',
        neighborhood: e.venues?.neighborhood || '',
        isPick: e.curation_level === 'ff_curated',
    }));

    return <KitClient events={events} from={from} to={to} activeDays={Number.isFinite(days) && days > 0 ? days : null} />;
}
