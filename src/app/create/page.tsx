import CreateEventClient from '@/features/frequent-flyer/components/CreateEventClient';
import { getVenuesForCreate } from '@/app/actions';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Submit an event',
    description:
        'Add your event to Frequent Flyer. Tell us what’s happening, where and when, and attach a flyer — it goes live after a quick review.',
    alternates: { canonical: '/create' },
    openGraph: { title: 'Submit an event', url: '/create' },
};

export const dynamic = 'force-dynamic';

export default async function CreatePage() {
    const venues = await getVenuesForCreate();
    return <CreateEventClient venues={venues} />;
}
