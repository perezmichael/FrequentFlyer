/**
 * Shared shell for /privacy and /terms.
 *
 * Both pages are long-form prose, which nothing else in the product is — the
 * type scale here is deliberately larger and looser than the feed's, because
 * these are read in paragraphs rather than scanned in cards. Everything else
 * stays on the brand: cream, ink, mono labels in uppercase.
 */

export const legalH2 =
    'font-space-mono uppercase text-[12px] tracking-[-0.44px] text-black/50 mt-12 mb-3';

export const legalP =
    'font-space-grotesk text-[16px] leading-[1.65] text-black/75 mb-4 max-w-[62ch]';

export const legalLi =
    'font-space-grotesk text-[16px] leading-[1.6] text-black/75 mb-2.5 max-w-[62ch]';

export const legalLink = 'text-brand underline underline-offset-2 hover:opacity-70';

export default function LegalPage({
    eyebrow,
    title,
    updated,
    intro,
    children,
}: {
    eyebrow: string;
    title: string;
    updated: string;
    intro: string;
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-cream pt-[100px] grain-soft">
            <div className="page-container py-12 max-w-[760px]">
                <p className="stamp text-[12px] mb-5">{eyebrow}</p>
                <h1 className="font-space-grotesk text-[40px] sm:text-[52px] leading-[0.95] font-bold text-ink mb-4">
                    {title}
                </h1>
                <p className="font-space-grotesk text-[17px] text-black/70 max-w-[58ch] mb-3">
                    {intro}
                </p>
                <p className="font-space-mono text-[12px] uppercase tracking-[-0.44px] text-black/40">
                    Last updated {updated}
                </p>

                {/* Cross-links live in the site footer, which renders on these
                    pages — repeating them here just doubled the same row. */}
                <div className="mt-4">{children}</div>
            </div>
        </div>
    );
}
