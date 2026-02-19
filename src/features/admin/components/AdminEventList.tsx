'use client';

import { useState } from 'react';
import { Event } from '@/features/frequent-flyer/data/events';
import AdminEventCard from './AdminEventCard';

interface AdminEventListProps {
    events: (Event & { status?: string, vibe_score?: number })[];
}

import { Button } from '@/components/ui/button';

export default function AdminEventList({ events }: AdminEventListProps) {
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

    const filteredEvents = events.filter(e => (e.status || 'pending') === filter);

    return (
        <div className="space-y-6">
            <div className="flex gap-2 p-1 bg-muted w-fit rounded-lg">
                {(['pending', 'approved', 'rejected'] as const).map(status => (
                    <Button
                        key={status}
                        variant={filter === status ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter(status)}
                        className="capitalize"
                    >
                        {status}
                        <span className="ml-2 bg-primary-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                            {events.filter(e => (e.status || 'pending') === status).length}
                        </span>
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEvents.map(event => (
                    <AdminEventCard key={event.id} event={event} />
                ))}
            </div>

            {filteredEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p>No {filter} events found.</p>
                </div>
            )}
        </div>
    );
}
