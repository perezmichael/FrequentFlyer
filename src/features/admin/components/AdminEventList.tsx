'use client';

import { useState } from 'react';
import { Event } from '@/features/frequent-flyer/data/events';
import AdminEventCard from './AdminEventCard';

interface AdminEventListProps {
    events: (Event & { status?: string, vibe_score?: number })[];
}

export default function AdminEventList({ events }: AdminEventListProps) {
    const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

    const filteredEvents = events.filter(e => (e.status || 'pending') === filter);

    return (
        <div>
            <div className="flex gap-4 mb-6">
                {(['pending', 'approved', 'rejected'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded font-bold capitalize ${filter === status
                                ? 'bg-black text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                    >
                        {status} ({events.filter(e => (e.status || 'pending') === status).length})
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredEvents.map(event => (
                    <AdminEventCard key={event.id} event={event} />
                ))}
            </div>

            {filteredEvents.length === 0 && (
                <div className="text-gray-500 py-10 text-center">
                    No {filter} events found.
                </div>
            )}
        </div>
    );
}
