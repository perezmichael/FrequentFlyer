/**
 * Record that someone left for a venue's page.
 *
 * sendBeacon rather than fetch: the browser is already navigating away, and a
 * normal request gets cancelled mid-flight. Beacons are queued by the browser
 * and delivered regardless — which is the whole point, since the clicks worth
 * counting are exactly the ones where the user leaves.
 *
 * Fire-and-forget by design. A failure here must never delay or block the
 * navigation the user actually asked for.
 */
import { capture } from './analytics';

export type ClickSurface = 'event_page' | 'detail_sheet' | 'map_popup';

export function trackOutbound(
    eventId: string | undefined,
    surface: ClickSurface,
    destination?: string | null,
): void {
    if (!eventId || typeof navigator === 'undefined') return;

    // Recurring nights are projected into the Event shape with a synthetic
    // "recurring-<id>" id that doesn't exist in the events table, so logging
    // one would just 404 on the server.
    if (eventId.startsWith('recurring-')) return;

    // Mirrored into PostHog so the click can be used as a funnel step and tied
    // to a session replay. Supabase stays the system of record — it's ours, it
    // survives changing analytics vendors, and it already backs the admin view.
    capture('outbound_click', { eventId, surface, destination });

    const body = JSON.stringify({ eventId, surface, destination });
    try {
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/click', new Blob([body], { type: 'application/json' }));
            return;
        }
        // Safari has historically been patchy on sendBeacon with a Blob type.
        fetch('/api/click', {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
        }).catch(() => { });
    } catch {
        /* never let analytics break a link */
    }
}
