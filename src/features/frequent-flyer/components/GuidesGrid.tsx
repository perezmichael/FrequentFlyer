import { GuideWithItems } from '../types/guides';

interface GuidesGridProps {
    guides: GuideWithItems[];
    onSelectGuide: (guide: GuideWithItems) => void;
}

function calculateReadTime(itemCount: number): string {
    const minutes = Math.max(2, itemCount * 2);
    return `${minutes} MIN READ`;
}

export default function GuidesGrid({ guides, onSelectGuide }: GuidesGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-[48px] gap-y-[40px] md:gap-y-[64px]">
            {guides.map((guide) => (
                <div
                    key={guide.id}
                    onClick={() => onSelectGuide(guide)}
                    className="group shadow-[0px_8px_24px_-8px_rgba(0,0,0,0.15)] hover:shadow-[0px_16px_48px_-12px_rgba(0,0,0,0.25)] transition-all duration-300"
                    style={{ backgroundColor: 'white', cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                >
                    {/* Image — padding-bottom trick for reliable 16:9 */}
                    <div style={{ position: 'relative', paddingBottom: '56.25%', overflow: 'hidden', backgroundColor: '#e5e5e5' }}>
                        {guide.cover_image && (
                            <img
                                src={guide.cover_image}
                                alt={guide.title}
                                className="transition-transform duration-500 group-hover:scale-105"
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                loading="lazy"
                                decoding="async"
                            />
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-[20px] md:p-[28px]" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <h2 className="text-[24px] md:text-[36px]" style={{
                            fontFamily: 'var(--font-space-grotesk)',
                            fontWeight: 700,
                            lineHeight: 1.1,
                            textTransform: 'uppercase',
                            letterSpacing: '-0.72px',
                            color: '#000',
                            marginBottom: '14px',
                        }}>
                            {guide.title}
                        </h2>
                        <p style={{
                            fontFamily: 'var(--font-space-grotesk)',
                            fontSize: '18px',
                            color: 'rgba(0,0,0,0.65)',
                            lineHeight: 1.55,
                            flexGrow: 1,
                            marginBottom: '28px',
                        }}>
                            {guide.description}
                        </p>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '14px',
                            borderTop: '1px solid rgba(0,0,0,0.1)',
                        }}>
                            <span style={{
                                fontFamily: 'var(--font-space-mono)',
                                fontSize: '11px',
                                color: 'rgba(0,0,0,0.45)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                {calculateReadTime(guide.items.length)}
                            </span>
                            <span style={{
                                fontFamily: 'var(--font-space-mono)',
                                fontSize: '11px',
                                color: '#000',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                            }}>
                                READ MORE →
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
