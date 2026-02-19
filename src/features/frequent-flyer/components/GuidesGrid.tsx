import { GuideWithItems } from '../types/guides';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

interface GuidesGridProps {
    guides: GuideWithItems[];
    onSelectGuide: (guide: GuideWithItems) => void;
}

export default function GuidesGrid({ guides, onSelectGuide }: GuidesGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] max-w-[1400px]">
            {guides.map((guide) => (
                <div
                    key={guide.id}
                    className="group bg-white shadow-[0px_8px_24px_-8px_rgba(0,0,0,0.15)] hover:shadow-[0px_16px_48px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => onSelectGuide(guide)}
                >
                    {/* Image */}
                    <div className="relative aspect-[16/9] overflow-hidden">
                        <img
                            src={guide.cover_image || '/placeholder-guide.jpg'}
                            alt={guide.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>

                    {/* Content */}
                    <div className="p-[32px]">
                        <h2 className="font-space-grotesk font-bold leading-[1.3] text-[28px] text-black tracking-[-0.56px] uppercase mb-[12px]">
                            {guide.title}
                        </h2>
                        <p className="font-space-grotesk font-normal text-[16px] text-black/70 leading-[1.5] mb-[16px] line-clamp-3">
                            {guide.description}
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="font-space-mono text-[12px] text-black/50 uppercase tracking-wide">
                                {guide.items.length} Places
                            </span>
                            <span
                                className="font-space-mono text-[14px] text-black uppercase tracking-[-0.56px] group-hover:underline"
                            >
                                Read More →
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
