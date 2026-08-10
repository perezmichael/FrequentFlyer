import { GuideWithItems } from '../types/guides';
import SmartImage from '@/components/SmartImage';
import { withReferral } from '@/lib/outbound';
import Link from 'next/link';

interface GuideDetailProps {
    guide: GuideWithItems;
    onBack: () => void;
}

export default function GuideDetail({ guide, onBack }: GuideDetailProps) {
    if (!guide) return null;

    return (
        <div className="w-full">
            {/* Hero Image */}
            <div className="relative w-full h-[240px] md:h-[500px] overflow-hidden">
                <SmartImage
                    src={guide.cover_image || '/placeholder-guide.jpg'}
                    alt={guide.title}
                    sizes="100vw"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="max-w-[800px] mx-auto px-[24px] py-[64px]">

                {/* Title Block */}
                <div className="mb-[64px]">
                    <h1 className="font-space-grotesk font-bold leading-[1.1] text-[28px] md:text-[64px] text-black tracking-[-1.92px] uppercase mb-[24px]">
                        {guide.title}
                    </h1>
                    <p className="font-space-grotesk font-normal text-[20px] md:text-[24px] text-black/70 leading-[1.4]">
                        {guide.description}
                    </p>
                    <div className="mt-[32px] flex items-center gap-[16px]">
                        <span className="font-space-mono text-[12px] text-black/50 uppercase tracking-wide">
                            Curated By {guide.curator_name || 'Frequent Flyer'}
                        </span>
                        <span className="font-space-mono text-[12px] text-black/50 uppercase tracking-wide">
                            •
                        </span>
                        <span className="font-space-mono text-[12px] text-black/50 uppercase tracking-wide">
                            {guide.items.length} Locations
                        </span>
                    </div>
                </div>

                {/* Content / Venues List */}
                <div className="space-y-[40px] md:space-y-[64px]">
                    {guide.items.sort((a, b) => a.order_index - b.order_index).map((item, index) => (
                        <div key={item.id} className="venue-block">
                            <div className="flex items-baseline justify-between mb-[16px] border-b border-black/10 pb-[8px]">
                                <h2 className="font-space-grotesk font-bold text-[20px] md:text-[32px] text-black tracking-[-0.96px] uppercase">
                                    {index + 1}. {item.venues?.name}
                                </h2>
                                <span className="font-space-mono text-[14px] text-black/50 uppercase">
                                    {item.venues?.neighborhood}
                                </span>
                            </div>

                            {item.venues?.image_url && (
                                /* The aspect ratio moves from the image to this
                                   wrapper: `fill` sizes to its container, so the
                                   container is what has to hold the shape. */
                                <div className="mb-[24px] relative aspect-[3/2] overflow-hidden">
                                    <SmartImage
                                        src={item.venues.image_url}
                                        alt={item.venues.name}
                                        className="grayscale-[20%] hover:grayscale-0 transition-all duration-500"
                                        sizes="(max-width: 840px) 100vw, 800px"
                                    />
                                </div>
                            )}

                            <p className="font-space-grotesk text-[18px] text-black/80 leading-[1.6] mb-[16px]">
                                {item.curator_note || 'No description provided.'}
                            </p>

                            <div className="flex gap-[16px]">
                                {item.venues?.address && (
                                    <p className="font-space-mono text-[12px] text-black/60 uppercase">
                                        📍 {item.venues.address}
                                    </p>
                                )}
                                {item.venues?.url && (
                                    <a href={withReferral(item.venues.url)} target="_blank" rel="noopener noreferrer" className="font-space-mono text-[12px] text-black uppercase underline hover:no-underline">
                                        Website ↗
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-[60px] md:mt-[120px] border-t border-black/10 pt-[32px] text-center">
                    <Link
                        href="/guides"
                        className="font-space-mono text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
                    >
                        Explore More Guides
                    </Link>
                </div>
            </div>
        </div>
    );
}
