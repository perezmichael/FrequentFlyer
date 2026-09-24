import type { Metadata } from 'next';

/**
 * Still a placeholder, so it's kept out of the index — thin content competing
 * for the site's own queries helps nobody. The canonical stays because the
 * trailing-slash twin exists either way.
 */
export const metadata: Metadata = {
    title: 'Tips',
    alternates: { canonical: '/tips' },
    robots: { index: false, follow: true },
};

export default function TipsPage() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '1rem',
            textAlign: 'center'
        }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Tips</h1>
            <p style={{ color: '#666' }}>This is a placeholder for the Tips page.</p>
        </div>
    );
}
