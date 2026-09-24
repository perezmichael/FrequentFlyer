import type { Metadata } from 'next';

/**
 * The page itself is a client component, which cannot export metadata — hence
 * a layout for one route. Without it /agents and /agents/ are two identical
 * URLs with no canonical between them.
 */
export const metadata: Metadata = {
    title: 'For agents and crawlers',
    description:
        'Where Frequent Flyer’s event data comes from, and how automated clients can read it.',
    alternates: { canonical: '/agents' },
    openGraph: { title: 'For agents and crawlers', url: '/agents' },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
