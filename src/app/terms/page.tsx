import type { Metadata } from 'next';
import LegalPage, { legalH2, legalP, legalLi, legalLink } from '@/components/LegalPage';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
    title: 'Terms',
    description: `The terms for using ${SITE_NAME}, including the free public events API.`,
};

const CONTACT = 'frequentflyerla@gmail.com';

/**
 * Terms of service.
 *
 * Two audiences in one document: people reading listings, and developers or AI
 * agents calling the API. The API section is the one that has to be precise —
 * it is the licence a connector review will actually read.
 */
export default function TermsPage() {
    return (
        <LegalPage
            eyebrow="legal"
            title="Terms of service"
            updated="18 September 2026"
            intro="Frequent Flyer is a free events guide for Los Angeles, run by one person. These are the terms for using the site and the public API."
        >
            <h2 className={legalH2}>Using the site</h2>
            <p className={legalP}>
                Frequent Flyer is free to use and needs no account. Use it lawfully and
                don&apos;t try to break it — no attempts to disrupt the service, gain
                unauthorised access, or scrape it in a way that degrades it for other
                people. The API below exists precisely so that you don&apos;t need to
                scrape.
            </p>

            <h2 className={legalH2}>Accuracy — please read this one</h2>
            <p className={legalP}>
                Listings are gathered from public sources and from submissions, then
                reviewed by a human. Even so, <strong>details change and listings can be
                wrong</strong>. Shows get cancelled, times move, venues change their door
                policy, and a price we recorded last week may not be the price tonight.
            </p>
            <p className={legalP}>
                Always check the venue&apos;s or promoter&apos;s own page before you travel
                or buy. Every listing links to its source for exactly this reason.
                Frequent Flyer is not the organiser of any event listed here, does not
                sell tickets, and cannot help with refunds, entry disputes or anything
                else between you and a venue.
            </p>
            <p className={legalP}>
                The site is provided &quot;as is&quot;, without warranties of any kind.
                To the extent the law allows, we are not liable for losses arising from
                relying on a listing — including a wasted trip to an event that was
                cancelled, moved or sold out.
            </p>

            <h2 className={legalH2}>Submitting events and venues</h2>
            <p className={legalP}>
                When you submit an event, claim a venue or upload a flyer, you confirm
                that you have the right to share what you are submitting, and you give us
                permission to publish, display and adapt it on the site and through the
                API. You keep ownership of your own material.
            </p>
            <p className={legalP}>
                Don&apos;t submit anything you don&apos;t have the rights to, anything
                misleading, or anything unlawful. We review every submission and can
                decline, edit or remove any of it, for any reason. A venue claim is a
                request to be recognised as that venue — it is reviewed, not granted
                automatically.
            </p>

            <h2 className={legalH2}>The public API</h2>
            <p className={legalP}>
                We publish a free, read-only API at{' '}
                <code className="font-space-mono text-[13px] text-brand">/api/v1</code>,
                described by an OpenAPI document at{' '}
                <code className="font-space-mono text-[13px] text-brand">/api/openapi.json</code>.
                It needs no key and no account. It is intended for AI assistants,
                connectors and applications that want to answer questions about what is
                happening in Los Angeles.
            </p>
            <p className={legalP}>You may use it if you:</p>
            <ul className="list-disc pl-5 mb-4">
                <li className={legalLi}>
                    <strong>Attribute us.</strong> Name Frequent Flyer as the source and
                    link to the event&apos;s page on this site — every response includes
                    a <code className="font-space-mono text-[13px] text-brand">frequent_flyer_url</code> for
                    that purpose.
                </li>
                <li className={legalLi}>
                    <strong>Stay within the rate limit</strong> of 60 requests per minute,
                    and cache responses rather than re-requesting the same data in a loop.
                </li>
                <li className={legalLi}>
                    <strong>Don&apos;t present it as your own.</strong> Bulk
                    redistribution, reselling the feed, or republishing it as an
                    independent events database is not permitted without asking us first.
                </li>
                <li className={legalLi}>
                    <strong>Don&apos;t strip the caveats.</strong> If you surface a price
                    or a time, carry through what the data says — including that a{' '}
                    <code className="font-space-mono text-[13px] text-brand">null</code> price
                    means unknown, not free.
                </li>
            </ul>
            <p className={legalP}>
                The API is offered as a free service with no uptime guarantee. We may
                change the response shape, add or remove fields, adjust the rate limit, or
                withdraw access — including for a specific client that is abusing it.
                Breaking changes to the{' '}
                <code className="font-space-mono text-[13px] text-brand">v1</code> shape will
                go behind a new version path rather than changing{' '}
                <code className="font-space-mono text-[13px] text-brand">v1</code> underneath
                you. Full documentation is at <a href="/docs" className={legalLink}>/docs</a>.
            </p>
            <p className={legalP}>
                There is also a write endpoint at{' '}
                <code className="font-space-mono text-[13px] text-brand">/api/agent/submit</code> for
                agents contributing listings. Everything posted there enters the same human
                review queue and does not go live automatically. Don&apos;t use it to post
                spam, duplicates, or events outside Los Angeles.
            </p>

            <h2 className={legalH2}>Payments</h2>
            <p className={legalP}>
                Frequent Flyer does not sell tickets and does not take payments. When you
                buy a ticket you are buying it from the venue, promoter or ticketing
                company we linked you to, under their terms, not ours.
            </p>

            <h2 className={legalH2}>Content belonging to other people</h2>
            <p className={legalP}>
                Listings describe events run by other people, and flyers are usually the
                work of the promoter or artist. They are shown here to help people find
                the event. If you own material shown on this site and would like it
                removed, email{' '}
                <a href={`mailto:${CONTACT}`} className={legalLink}>{CONTACT}</a> and we
                will take it down promptly — there is no process to navigate, just ask.
            </p>

            <h2 className={legalH2}>Changes</h2>
            <p className={legalP}>
                These terms may change; the date at the top of this page changes with
                them. Continuing to use the site or the API after a change means the new
                terms apply.
            </p>

            <h2 className={legalH2}>Contact</h2>
            <p className={legalP}>
                <a href={`mailto:${CONTACT}`} className={legalLink}>{CONTACT}</a>
            </p>
        </LegalPage>
    );
}
