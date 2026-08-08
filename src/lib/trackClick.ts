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
