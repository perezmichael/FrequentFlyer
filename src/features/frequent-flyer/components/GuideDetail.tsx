import { GuideWithItems } from '../types/guides';
import Link from 'next/link';

interface GuideDetailProps {
    guide: GuideWithItems;
    onBack: () => void;
}

export default function GuideDetail({ guide, onBack }: GuideDetailProps) {
    if (!guide) return null;

    return (
        <div className="max-w-[800px] mx-auto px-[24px] md:px-[48px] py-[64px] pt-[120px]">

            {/* Title Block */}
            <div className="mb-[48px]">
                <h1 className="font-space-grotesk font-bold leading-[1.1] text-[48px] md:text-[64px] text-black tracking-[-1.92px] uppercase mb-[24px]">
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

            {/* Cover Image */}
            <div className="mb-[64px]">
                <img
                    src={guide.cover_image || '/placeholder-guide.jpg'}
                    alt={guide.title}
                    className="w-full aspect-[16/9] object-cover rounded-sm shadow-sm"
                />
            </div>

            {/* Content / Venues List */}
            <div className="space-y-[64px]">
                {guide.items.sort((a, b) => a.order_index - b.order_index).map((item, index) => (
                    <div key={item.id} className="venue-block">
                        <div className="flex items-baseline justify-between mb-[16px] border-b border-black/10 pb-[8px]">
                            <h2 className="font-space-grotesk font-bold text-[32px] text-black tracking-[-0.96px] uppercase">
                                {index + 1}. {item.venues?.name}
                            </h2>
                            <span className="font-space-mono text-[14px] text-black/50 uppercase">
                                {item.venues?.neighborhood}
                            </span>
                        </div>

                        {item.venues?.image_url && (
                            <div className="mb-[24px]">
                                <img
                                    src={item.venues.image_url}
                                    alt={item.venues.name}
                                    className="w-full aspect-[3/2] object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-500"
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
                                <a href={item.venues.url} target="_blank" rel="noopener noreferrer" className="font-space-mono text-[12px] text-black uppercase underline hover:no-underline">
                                    Website ↗
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-[120px] border-t border-black/10 pt-[32px] text-center">
                <Link
                    href="/guides"
                    className="font-space-mono text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
                >
                    Explore More Guides
                </Link>
            </div>
        </div>
    );
}
