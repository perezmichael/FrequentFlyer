import CreateEventClient from '@/features/frequent-flyer/components/CreateEventClient';
import { getVenuesForCreate } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function CreatePage() {
    const venues = await getVenuesForCreate();
    return <CreateEventClient venues={venues} />;
}
