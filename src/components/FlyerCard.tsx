import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { formatEventDateTime } from "@/features/frequent-flyer/data/events";

const svgPaths = {
  p26562d00: "M12.25 5.83333H1.75M9.33333 1.16667V3.5M4.66667 1.16667V3.5M4.55 12.8333H9.45C10.4301 12.8333 10.9201 12.8333 11.2945 12.6426C11.6238 12.4748 11.8915 12.2071 12.0593 11.8778C12.25 11.5035 12.25 11.0134 12.25 10.0333V5.13333C12.25 4.15324 12.25 3.6632 12.0593 3.28885C11.8915 2.95957 11.6238 2.69185 11.2945 2.52407C10.9201 2.33333 10.4301 2.33333 9.45 2.33333H4.55C3.56991 2.33333 3.07986 2.33333 2.70552 2.52407C2.37623 2.69185 2.10852 2.95957 1.94074 3.28885C1.75 3.6632 1.75 4.15324 1.75 5.13333V10.0333C1.75 11.0134 1.75 11.5035 1.94074 11.8778C2.10852 12.2071 2.37623 12.4748 2.70552 12.6426C3.07986 12.8333 3.56991 12.8333 4.55 12.8333Z",
  p2dd543f0: "M7 12.8333C9.33333 10.5 11.6667 8.41066 11.6667 5.83333C11.6667 3.256 9.57733 1.16667 7 1.16667C4.42267 1.16667 2.33333 3.256 2.33333 5.83333C2.33333 8.41066 4.66667 10.5 7 12.8333Z",
  p37b99980: "M7 7.58333C7.9665 7.58333 8.75 6.79983 8.75 5.83333C8.75 4.86684 7.9665 4.08333 7 4.08333C6.0335 4.08333 5.25 4.86684 5.25 5.83333C5.25 6.79983 6.0335 7.58333 7 7.58333Z",
};

export interface FlyerEvent {
  // Adapted to match the frontend shape from page.tsx or general use
  title: string;
  description: string;
  location: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  category?: string;
  price?: string | null;
  neighborhood: string;
  vibe?: string[];
  /** 'ff_curated' earns the pick stamp; anything else renders plain. */
  curationLevel?: string;
}

interface FlyerCardProps {
  image: string;
  event: FlyerEvent;
}

function MarkerPin() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="marker-pin-01">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="marker-pin-01">
          <g id="Icon">
            <path d={svgPaths.p37b99980} stroke="var(--stroke-0, #FFFAEB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
            <path d={svgPaths.p2dd543f0} stroke="var(--stroke-0, #FFFAEB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Calendar() {
  return (
    <div className="relative shrink-0 size-[14px]" data-name="calendar">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g clipPath="url(#clip0_1_69)" id="calendar">
          <path d={svgPaths.p26562d00} id="Icon" stroke="var(--stroke-0, #FFFAEB)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
        <defs>
          <clipPath id="clip0_1_69">
            <rect fill="white" height="14" width="14" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

export default function FlyerCard({ image, event }: FlyerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Map backend "vibe" to frontend "category" if needed
  const category = event.category || (event.vibe && event.vibe[0]) || "Event";
  // No default: this used to print "Free" whenever price was missing,
  // which was every event — including ticketed shows.
  const price = event.price;

  return (
    <motion.div
      className="relative w-full aspect-[389/483] shadow-[0px_19px_46.7px_-14px_rgba(0,0,0,0.45)] cursor-pointer bg-black/5"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => setIsHovered(prev => !prev)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      {/* Image container with blur effect */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={{
          filter: isHovered ? "blur(20px)" : "blur(0px)",
        }}
        transition={{ duration: 0.4 }}
      >
        <img
          alt={event.title}
          className="absolute inset-[-20px] max-w-none object-cover pointer-events-none w-[calc(100%+40px)] h-[calc(100%+40px)]"
          src={image}
        />
      </motion.div>

      {/* Noise overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
            }}
          />
        )}
      </AnimatePresence>

      {/* Event details overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center p-[24px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div className="content-stretch flex flex-col gap-[12px] items-start max-w-full">
              {/* The pick stamp, on flyer artwork rather than cream — so it
                  reads on a dark image the way the cards do on the feed. */}
              {event.curationLevel === 'ff_curated' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-flyer px-2 py-0.5 font-space-mono text-[11px] font-bold uppercase tracking-[-0.44px] text-flyer">
                  ★ FF Pick
                </span>
              )}

              {/* Title and description */}
              <div className="content-stretch flex flex-col gap-[6px] items-start w-full whitespace-pre-wrap">
                <p className="font-space-grotesk font-bold leading-[32px] text-flyer text-[32px] tracking-[-0.48px] uppercase w-full">
                  {event.title}
                </p>
                <p className="font-space-grotesk font-normal leading-[24px] text-[16px] text-white w-full line-clamp-3">
                  {event.description}
                </p>
              </div>

              {/* Divider */}
              <div className="h-0 w-full relative">
                <div className="absolute inset-x-0 h-px bg-flyer opacity-40 top-0.5"></div>
              </div>

              {/* Location */}
              <div className="content-stretch flex gap-[8px] items-center w-full">
                <MarkerPin />
                <p className="font-space-grotesk font-normal leading-[18px] text-flyer text-[14px] tracking-[-0.21px] uppercase flex-1 whitespace-pre-wrap">
                  {event.location}
                </p>
              </div>

              {/* Date */}
              <div className="content-stretch flex gap-[8px] items-center w-full">
                <Calendar />
                <p className="font-space-grotesk font-normal leading-[18px] text-flyer text-[14px] tracking-[-0.21px] uppercase flex-1 whitespace-pre-wrap">
                  {formatEventDateTime(event.date, event.startTime, event.endTime)}
                </p>
              </div>

              {/* Category, Price, Neighborhood */}
              <div className="content-stretch flex gap-[14px] items-center mt-2">
                <p className="font-space-grotesk font-normal leading-[18px] text-flyer text-[14px] tracking-[-0.21px] uppercase">
                  {category}
                </p>
                {price && (
                  <>
                    <div className="w-px h-[14px] bg-[#A3A3A3]"></div>
                    <p className="font-space-grotesk font-normal leading-[18px] text-flyer text-[14px] tracking-[-0.21px] uppercase">
                      {price}
                    </p>
                  </>
                )}
                <div className="w-px h-[14px] bg-[#A3A3A3]"></div>
                <p className="font-space-grotesk font-normal leading-[18px] text-flyer text-[14px] tracking-[-0.21px] uppercase">
                  {event.neighborhood}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
