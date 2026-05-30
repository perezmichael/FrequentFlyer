'use client';

import { useState } from 'react';
import { Event } from '@/features/frequent-flyer/data/events';
import { RecurringEvent } from '@/features/frequent-flyer/data/recurringEvents';
import AdminEventList from '@/features/admin/components/AdminEventList';
import AdminRecurringEventList from '@/features/admin/components/AdminRecurringEventList';

interface AdminPageClientProps {
    events: (Event & {
        status?: string;
        vibe_score?: number;
        source?: string;
        flyer_url?: string;
    })[];
    recurringEvents: (RecurringEvent & { status: string })[];
}

export default function AdminPageClient({ events, recurringEvents }: AdminPageClientProps) {
    const [tab, setTab] = useState<'events' | 'regulars'>('events');

    const pillBase =
        'font-space-mono text-[14px] uppercase tracking-[-0.48px] px-[18px] py-[9px] rounded-full border transition-colors whitespace-nowrap cursor-pointer';
    const pillActive = 'bg-black text-[#FFFAEB] border-black';
    const pillInactive = 'bg-transparent text-black border-black/30 hover:border-black';

    return (
        <>
            <div className="flex gap-[8px] mb-8">
                <button
                    onClick={() => setTab('events')}
                    className={`${pillBase} ${tab === 'events' ? pillActive : pillInactive}`}
                >
                    Events
                </button>
                <button
                    onClick={() => setTab('regulars')}
                    className={`${pillBase} ${tab === 'regulars' ? pillActive : pillInactive}`}
                >
                    Regulars
                </button>
            </div>

            {tab === 'events' ? (
                <AdminEventList events={events} />
            ) : (
                <AdminRecurringEventList events={recurringEvents} />
            )}
        </>
    );
}
