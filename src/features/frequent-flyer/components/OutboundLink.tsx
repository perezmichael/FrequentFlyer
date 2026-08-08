'use client';

import { withReferral } from '@/lib/outbound';
import { trackOutbound, type ClickSurface } from '@/lib/trackClick';

/**
 * A link that leaves the site for a venue's own page.
 *
 * Wraps the two things every outbound link needs and neither should be
 * remembered by hand: UTM tags so the venue can see the referral in their own
 * analytics, and a click log so we know which listings people actually acted
 * on. Existing as a component means a new outbound link can't quietly ship
 * without both.
 *
 * The event page is a server component, so the tracking has to live in a
 * client boundary somewhere — this is it.
 */
export default function OutboundLink({
    href,
    eventId,
    surface,
    className,
    children,
}: {
    href: string | null | undefined;
    eventId?: string;
    surface: ClickSurface;
    className?: string;
    children: React.ReactNode;
}) {
    if (!href) return null;
    const tagged = withReferral(href);

    return (
        <a
            href={tagged}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            // Logged on click rather than on the anchor's default action, so a
            // middle-click or cmd-click into a new tab still counts — those are
            // real intent and used to be invisible.
            onClick={() => trackOutbound(eventId, surface, tagged)}
        >
            {children}
        </a>
    );
}
