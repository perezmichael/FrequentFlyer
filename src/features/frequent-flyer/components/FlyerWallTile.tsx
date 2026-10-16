'use client';

import { Event } from '@/features/frequent-flyer/data/events';
import { hasRealImage } from '@/features/frequent-flyer/data/vibePlaceholders';
import GeneratedFlyer from './GeneratedFlyer';

interface FlyerWallTileProps {
    event: Event;
    /** Render the generated flyer instead of the image — a venue photo
     *  already shown on an earlier tile, which would read as a duplicate. */
    forcePlaceholder?: boolean;
    onOpen: (event: Event) => void;
}

/**
 * One flyer on the /events wall, shown whole at its own shape — square,
 * portrait or landscape — rather than cropped into a shared frame. The art is
 * the point, so the only text is the title, small, underneath; date, venue
 * and the rest open in the same EventDetailSheet the home feed uses.
 *
 * Hover draws a hairline outline a few pixels off the art — the cue that the
 * tile opens something — and focus-visible draws the same one for keyboards.
 *
 * A plain <img> rather than SmartImage: SmartImage always renders `fill`,
 * which needs a sized box, and here the image's own height is the point.
 * Nothing is lost — images are served unoptimized anyway (next.config.mjs).
 */
export default function FlyerWallTile({ event, forcePlaceholder = false, onOpen }: FlyerWallTileProps) {
    const showImage = hasRealImage(event.image) && !forcePlaceholder;

    return (
        <button
            type="button"
            onClick={() => onOpen(event)}
            className="group flex flex-col items-center gap-[12px] w-full text-center cursor-pointer outline-none"
        >
            <div className="relative w-full rounded-[6px] outline outline-1 outline-offset-[5px] outline-transparent transition-[outline-color,transform] duration-150 ease-out group-hover:outline-ink group-focus-visible:outline-ink group-active:scale-[0.98]">
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
                        className="block w-full h-auto min-h-[120px] max-h-[640px] object-contain rounded-[6px] bg-black/[0.04]"
                    />
                ) : (
                    <div className="relative w-full aspect-[4/5] rounded-[6px] overflow-hidden">
                        <GeneratedFlyer title={event.title} vibe={event.vibe?.[0]} neighborhood={event.neighborhood} />
                    </div>
                )}
            </div>

            <p className="w-full px-[4px] font-space-mono text-[11px] leading-[1.3] uppercase tracking-[-0.44px] text-black/55 truncate transition-colors duration-150 group-hover:text-ink">
                {event.title}
            </p>
        </button>
    );
}
