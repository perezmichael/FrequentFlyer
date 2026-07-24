import { getVibePlaceholder } from '@/features/frequent-flyer/data/vibePlaceholders';

interface GeneratedFlyerProps {
    title: string;
    vibe?: string;
    neighborhood?: string;
    /** Extra classes for the outer fill element. */
    className?: string;
}

/**
 * On-brand stand-in for events with no real flyer. Instead of a generic gradient
 * card, this renders a zine-style typographic "flyer": near-black ink ground, a
 * warm brick keyline, the event title set big in Space Grotesk, and the vibe as
 * an uppercase mono stamp. Reads as intentional, not "image missing".
 */
export default function GeneratedFlyer({ title, vibe, neighborhood, className }: GeneratedFlyerProps) {
    const { emoji } = getVibePlaceholder(vibe);

    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                background: '#1a1a1a',
                borderTop: '3px solid #C2371B',
                padding: '14px 14px 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflow: 'hidden',
            }}
        >
            {/* Faint oversized emoji watermark */}
            <span
                aria-hidden
                style={{
                    position: 'absolute',
                    right: '-8px',
                    bottom: '-14px',
                    fontSize: '96px',
                    lineHeight: 1,
                    opacity: 0.1,
                    filter: 'grayscale(0.2)',
                    pointerEvents: 'none',
                }}
            >
                {emoji}
            </span>

            <span
                className="font-space-mono"
                style={{
                    fontSize: '10px',
                    letterSpacing: '-0.2px',
                    textTransform: 'uppercase',
                    color: '#C2371B',
                    fontWeight: 700,
                    position: 'relative',
                }}
            >
                {vibe || 'Event'}
            </span>

            <h3
                className="font-space-grotesk"
                style={{
                    fontSize: '19px',
                    lineHeight: 1.05,
                    fontWeight: 700,
                    color: '#efede1',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.5px',
                    margin: 0,
                    position: 'relative',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}
            >
                {title}
            </h3>

            <span
                className="font-space-mono"
                style={{
                    fontSize: '10px',
                    letterSpacing: '-0.2px',
                    textTransform: 'uppercase',
                    color: 'rgba(239,237,225,0.55)',
                    position: 'relative',
                }}
            >
                {neighborhood && neighborhood !== 'Unknown' ? neighborhood : 'Los Angeles'}
            </span>
        </div>
    );
}
