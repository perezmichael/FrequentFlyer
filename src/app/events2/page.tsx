import { Suspense } from 'react';
import Events2PageClient from '@/features/frequent-flyer/components/Events2PageClient';
import { events } from '@/features/frequent-flyer/data/events';

export default function Events2Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Events2PageClient events={events} />
        </Suspense>
    );
}
