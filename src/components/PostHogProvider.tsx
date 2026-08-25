'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import {
    POSTHOG_KEY,
    POSTHOG_PROXY,
    POSTHOG_UI_HOST,
    analyticsEnabled,
} from '@/lib/analytics';

/** Module-level rather than a ref: init must happen once per page load, not
 *  once per mount of this component. */
let initialized = false;

/**
 * The App Router does not reload the document when you navigate, so PostHog's
 * automatic page-view capture would only ever fire once — on the first paint —
 * and every route after that would be invisible. Capturing by hand off the
 * pathname is the supported way around it.
 *
 * useSearchParams opts the subtree into client-side rendering, which is why
 * this sits in its own component behind a Suspense boundary; without that the
 * whole tree would be forced dynamic.
 */
function PostHogPageview() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!analyticsEnabled || !pathname) return;

        let url = window.origin + pathname;
        const qs = searchParams?.toString();
        if (qs) url += `?${qs}`;
        posthog.capture('$pageview', { $current_url: url });

        // Replay exists to understand visitors, not to record me editing
        // venues — and those admin forms carry addresses and handles. Stopping
        // is one-way for the rest of the session on purpose: quietly resuming
        // after someone leaves /admin is the kind of surprise a recording tool
        // should never spring.
        if (pathname.startsWith('/admin')) posthog.stopSessionRecording();
    }, [pathname, searchParams]);

    return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (!analyticsEnabled || initialized) return;
        initialized = true;

        posthog.init(POSTHOG_KEY as string, {
            api_host: POSTHOG_PROXY,
            ui_host: POSTHOG_UI_HOST,

            // Captured manually in PostHogPageview — see the note there.
            capture_pageview: false,
            // Gives a real bounce/duration figure instead of inferring one.
            capture_pageleave: true,

            /* Storage, and the honest trade behind it.
             *
             * Recognising a returning visitor requires persisting an id on the
             * device; there is no way to have that answer without storing
             * something. localStorage rather than a cookie keeps the footprint
             * small and nothing is sent to a third-party domain (see the
             * proxy), but it is still client-side storage, and with UK and
             * Netherlands traffic in the mix that is a consent question worth
             * deciding deliberately.
             *
             * To go fully stateless instead, set persistence: 'memory'. Every
             * visit then looks new — which forfeits the exact question this
             * was installed to answer. */
            persistence: 'localStorage',

            // Anonymous visitors still get a person profile, otherwise
            // retention cohorts have nobody to retain.
            person_profiles: 'always',

            // At this traffic level replay is the point: a week's sessions can
            // be watched individually, which beats any aggregate.
            disable_session_recording:
                typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'),
            session_recording: {
                maskAllInputs: true,
            },
        });
    }, []);

    return (
        <>
            <Suspense fallback={null}>
                <PostHogPageview />
            </Suspense>
            {children}
        </>
    );
}
