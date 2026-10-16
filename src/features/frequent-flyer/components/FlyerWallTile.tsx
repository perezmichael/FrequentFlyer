'use client';

import { Event, formatEventDateTime } from '@/features/frequent-flyer/data/events';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import GeneratedFlyer from './GeneratedFlyer';

interface FlyerWallTileProps {
    event: Event;
    /** Render the generated flyer instead of the image — a venue photo
     *  already shown on an earlier tile, which would read as a duplicate. */
    forcePlaceholder?: boolean;
    /** Further dates for the same flyer, collapsed into this tile. */
    moreDates?: number;
    onOpen: (event: Event) => void;
}

/**
 * One flyer on the /events wall, shown whole at its own shape — square,
 * portrait or landscape — rather than cropped into a shared frame. Details sit
 * under the art instead of blurring over it; the full listing opens in the
 * same EventDetailSheet the home feed uses.
 *
 * A plain <img> rather than SmartImage: SmartImage always renders `fill`,
 * which needs a sized box, and here the image's own height is the point.
 * Nothing is lost — images are served unoptimized anyway (next.config.mjs).
 */
export default function FlyerWallTile({ event, forcePlaceholder = false, moreDates = 0, onOpen }: FlyerWallTileProps) {
    const showImage = hasRealImage(event.image) && !forcePlaceholder;

    return (
        <button
            type="button"
            onClick={() => onOpen(event)}
            className="group flex flex-col gap-[10px] text-left cursor-pointer"
        >
            <div className="relative w-full transition-transform duration-200 ease-out group-hover:-translate-y-[3px] group-active:scale-[0.98]">
                {showImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                        src={event.image!}
                        alt={event.title}
                        loading="lazy"
                        decoding="async"
                        // min-h holds a slot while loading so the column
                        // doesn't collapse and jump; max-h stops one very tall
                        // poster from owning the whole column.
                        className="block w-full h-auto min-h-[120px] max-h-[640px] object-contain bg-black/[0.04] shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)]"
                    />
                ) : (
                    <div className="relative w-full aspect-[4/5]">
                        <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-[3px] min-w-0">
                <p className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-black/55">
                    {formatEventDateTime(event.date, event.startTime, event.endTime)}
                    {moreDates > 0 && <span className="text-brand"> · +{moreDates} more date{moreDates !== 1 ? 's' : ''}</span>}
                </p>
                <h3 className="font-space-grotesk font-bold text-[15px] leading-[1.2] tracking-[-0.3px] text-ink line-clamp-2 group-hover:underline underline-offset-2 decoration-1">
                    {event.title}
                </h3>
                <p className="font-space-grotesk text-[13px] leading-[1.3] text-black/55 truncate">
                    {/* Scraped locations often already end in the
                        neighborhood ("Lyric Hyperion, Silver Lake"). */}
                    {event.neighborhood && !event.location?.toLowerCase().includes(event.neighborhood.toLowerCase())
                        ? `${event.location} · ${event.neighborhood}`
                        : event.location}
                </p>
                {event.curationLevel === 'ff_curated' && (
                    <span className="self-start mt-[4px] inline-flex items-center gap-1 rounded-full border border-brand/50 px-2 py-0.5 font-space-mono text-[10px] font-bold uppercase tracking-[-0.44px] text-brand">
                        ★ FF Pick
                    </span>
                )}
            </div>
        </button>
    );
}
