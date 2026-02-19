import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import svgPaths from "@/imports/svg-hoda6qldfy";

interface FlyerEvent {
  title: string;
  description: string;
  location: string;
  date: string;
  category: string;
  price: string;
  neighborhood: string;
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

  return (
    <motion.div
      className="relative w-full aspect-[389/483] shadow-[0px_19px_46.7px_-14px_rgba(0,0,0,0.45)] cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
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
              {/* Title and description */}
              <div className="content-stretch flex flex-col gap-[6px] items-start w-full whitespace-pre-wrap">
                <p className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[32px] text-[#efede1] text-[32px] tracking-[-0.48px] uppercase w-full">
                  {event.title}
                </p>
                <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[24px] text-[16px] text-white w-full">
                  {event.description}
                </p>
              </div>

              {/* Divider */}
              <div className="h-0 w-full">
                <div className="absolute inset-[-1px_0_0_0]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 346 1">
                    <line stroke="var(--stroke-0, #EFEDE1)" strokeOpacity="0.4" x2="346" y1="0.5" y2="0.5" />
                  </svg>
                </div>
              </div>

              {/* Location */}
              <div className="content-stretch flex gap-[2px] items-center w-full">
                <MarkerPin />
                <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[18px] text-[#efede1] text-[14px] tracking-[-0.21px] uppercase flex-1 whitespace-pre-wrap">
                  {event.location}
                </p>
              </div>

              {/* Date */}
              <div className="content-stretch flex gap-[2px] items-center w-full">
                <Calendar />
                <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[18px] text-[#efede1] text-[14px] tracking-[-0.21px] uppercase flex-1 whitespace-pre-wrap">
                  {event.date}
                </p>
              </div>

              {/* Category, Price, Neighborhood */}
              <div className="content-stretch flex gap-[14px] items-center">
                <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[18px] text-[#efede1] text-[14px] tracking-[-0.21px] uppercase">
                  {event.category}
                </p>
                <div className="flex h-[19px] items-center justify-center w-0">
                  <div className="flex-none rotate-90">
                    <div className="h-0 w-[19px]">
                      <div className="absolute inset-[-1px_0_0_0]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 1">
                          <line stroke="var(--stroke-0, #A3A3A3)" x2="19" y1="0.5" y2="0.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[18px] text-[#efede1] text-[14px] tracking-[-0.21px] uppercase">
                  {event.price}
                </p>
                <div className="flex h-[19px] items-center justify-center w-0">
                  <div className="flex-none rotate-90">
                    <div className="h-0 w-[19px]">
                      <div className="absolute inset-[-1px_0_0_0]">
                        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19 1">
                          <line stroke="var(--stroke-0, #A3A3A3)" x2="19" y1="0.5" y2="0.5" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[18px] text-[#efede1] text-[14px] tracking-[-0.21px] uppercase">
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