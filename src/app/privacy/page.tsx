import type { Metadata } from 'next';
import LegalPage, { legalH2, legalP, legalLi, legalLink } from '@/components/LegalPage';
import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
    title: 'Privacy',
    description: `How ${SITE_NAME} handles data: what is collected, what is not, and who it is shared with.`,
};

/**
 * The privacy policy.
 *
 * Written against what the code actually does rather than from a template —
 * every claim here is checkable in the repo, and the specifics (session replay
 * with masked inputs, localStorage rather than cookies, a click log that stores
 * no IP) are the parts a template would get wrong in the direction that matters.
 */
export default function PrivacyPage() {
    return (
        <LegalPage
            eyebrow="legal"
            title="Privacy policy"
            updated="18 September 2026"
            intro="Frequent Flyer is a small, independently run events site for Los Angeles. There are no visitor accounts and nothing here is sold. This page says exactly what is collected and why."
        >
            <h2 className={legalH2}>The short version</h2>
            <p className={legalP}>
                You can browse the entire site without giving us anything. We do not ask
                you to sign up, we do not sell or share data with advertisers, and we do
                not build advertising profiles. What we do collect is analytics about how
                the site is used, so we can tell whether anyone is finding it useful.
            </p>

            <h2 className={legalH2}>What we collect when you browse</h2>
            <p className={legalP}>
                <strong>Analytics.</strong> We use PostHog and Vercel Analytics to count
                page views, referrers, approximate location (country and region, derived
                from your IP address by the analytics provider — we do not store the IP
                ourselves), device type and browser. PostHog stores a random identifier in
                your browser&apos;s <code className="font-space-mono text-[13px] text-brand">localStorage</code> so
                that a repeat visit can be recognised as a repeat visit. That is the only
                thing we persist on your device; we do not use advertising or tracking
                cookies. Analytics requests are proxied through this site&apos;s own domain
                rather than sent to a third-party domain directly.
            </p>
            <p className={legalP}>
                <strong>Session replay.</strong> PostHog also records anonymised playback
                of browsing sessions — which pages were visited, what was clicked, how far
                the page was scrolled — so we can see where the site is confusing. All
                form inputs are masked before the recording leaves your browser, so
                anything you type is not captured. Replay is disabled entirely on the
                admin area.
            </p>
            <p className={legalP}>
                <strong>Outbound clicks.</strong> When you click through to a venue or
                ticket seller, we log that the click happened: which event, which part of
                the page it came from, and where it went. This log deliberately stores no
                IP address, no browser user agent and no cookie — it is a count, not a
                person. We use it to tell venues how many people we sent them.
            </p>

            <h2 className={legalH2}>What we collect when you submit something</h2>
            <p className={legalP}>
                If you submit an event, claim a venue, or upload a flyer, we store what you
                type into that form along with any image you upload. Submissions go into a
                review queue and are read by a human before anything is published. Please
                do not put personal information you would not want published into a
                listing — the point of the form is publication.
            </p>
            <p className={legalP}>
                If you give us a contact address as part of a submission or a venue claim,
                we use it to reply to you about that submission. We do not add it to a
                mailing list.
            </p>

            <h2 className={legalH2}>Automated processing</h2>
            <p className={legalP}>
                Event listings collected from public sources are processed by automated
                tools, including an AI model, to categorise them and draft short
                descriptions. This applies to event information — venues, dates, lineups —
                not to information about site visitors. A human reviews the result before
                a listing goes live.
            </p>

            <h2 className={legalH2}>Who else touches the data</h2>
            <ul className="list-disc pl-5 mb-4">
                <li className={legalLi}><strong>Vercel</strong> — hosting and page-view analytics.</li>
                <li className={legalLi}><strong>Supabase</strong> — the database and image storage behind the listings.</li>
                <li className={legalLi}><strong>PostHog</strong> — product analytics and session replay (US-hosted).</li>
                <li className={legalLi}><strong>Google</strong> — the AI model used to categorise scraped listings, and web fonts.</li>
                <li className={legalLi}><strong>CARTO</strong> — the basemap tiles on the map view.</li>
            </ul>
            <p className={legalP}>
                Each of these is a service provider processing data on our behalf. We do
                not sell data to anyone, and we do not share it with advertisers.
            </p>

            <h2 className={legalH2}>The public API</h2>
            <p className={legalP}>
                We publish a free, read-only API at{' '}
                <code className="font-space-mono text-[13px] text-brand">/api/v1</code> that
                serves the same event listings the website shows. It requires no account
                and returns no personal data — only public event information. Requests to
                it are rate-limited by IP address, which is held in memory briefly to
                enforce that limit and is not stored. See the{' '}
                <a href="/docs" className={legalLink}>API documentation</a>.
            </p>

            <h2 className={legalH2}>Your choices</h2>
            <ul className="list-disc pl-5 mb-4">
                <li className={legalLi}>
                    Browser &quot;Do Not Track&quot; and content blockers that block analytics
                    will stop analytics collection; the site works fine without it.
                </li>
                <li className={legalLi}>
                    Clearing your browser&apos;s site data removes the PostHog identifier,
                    and you will be counted as a new visitor afterwards.
                </li>
                <li className={legalLi}>
                    You can ask us for a copy of what we hold about you, ask for it to be
                    corrected, or ask for it to be deleted — including an event or venue
                    you submitted. Email{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className={legalLink}>{CONTACT_EMAIL}</a> and
                    we will action it.
                </li>
            </ul>
            <p className={legalP}>
                If you are in the UK, EU or California, the rights described above are the
                ones local law gives you, and the request address is the same.
            </p>

            <h2 className={legalH2}>Children</h2>
            <p className={legalP}>
                The site lists all-ages and 21+ events alike but is not directed at
                children, and we do not knowingly collect information from anyone under 13.
            </p>

            <h2 className={legalH2}>How long we keep things</h2>
            <p className={legalP}>
                Analytics data is retained by our providers on their standard schedules.
                Event listings are removed from the live feed once the event has passed.
                Outbound-click counts are kept indefinitely, since they contain nothing
                identifying.
            </p>

            <h2 className={legalH2}>Changes</h2>
            <p className={legalP}>
                If this policy changes materially, the date at the top of this page
                changes with it.
            </p>

            <h2 className={legalH2}>Contact</h2>
            <p className={legalP}>
                Questions about any of this go to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className={legalLink}>{CONTACT_EMAIL}</a>.
            </p>
        </LegalPage>
    );
}
