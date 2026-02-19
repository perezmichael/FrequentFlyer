import { BrowserRouter, Routes, Route, Link } from "react-router";
import EventsPage from "@/app/pages/EventsPage";
import MapPage from "@/app/pages/MapPage";
import GuidesPage from "@/app/pages/GuidesPage";
import GuideDetailPage from "@/app/pages/GuideDetailPage";
import TipsBill from "@/app/components/TipsBill";
import imgGrokImage from "figma:asset/1893368d705218527efd9ade041367862791d2cb.png";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:slug" element={<GuideDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function HomePage() {
  return (
    <div className="bg-[#e5e5e2] relative min-h-screen w-full">
      {/* Header */}
      <header className="relative pt-[19px] px-[32px]">
        <div className="flex items-start justify-between">
          {/* Logo and title */}
          <div className="flex items-center gap-[16px]">
            <div className="h-[64px] w-[123px]">
              <img
                alt="Frequent Flyer Logo"
                className="block max-w-none size-full"
                height="64"
                src={imgGrokImage}
                width="123"
              />
            </div>
            <div className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase whitespace-nowrap">
              <p className="mb-0">Frequent Flyer</p>
              <p>Los Angeles</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex gap-[32px] items-center pt-[18px]">
            <Link
              to="/"
              className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
            >
              events
            </Link>
            <Link
              to="/map"
              className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
            >
              map
            </Link>
            <Link
              to="/guides"
              className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline"
            >
              guides
            </Link>
            <TipsBill />
          </nav>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-[32px] mt-[32px]">
        <div className="flex gap-[16px]">
          <p className="decoration-solid font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] underline uppercase">
            Upcoming
          </p>
          <p className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[#5d39ac] text-[16px] tracking-[-0.64px] uppercase">
            archive
          </p>
        </div>
        <p className="font-['Space_Grotesk:Regular',sans-serif] font-normal leading-[1.25] text-[16px] text-black tracking-[-0.64px] mt-[21px]">
          *Hover over a flyer for details
        </p>
      </div>

      {/* Flyers Grid */}
      <div className="px-[32px] mt-[24px] pb-[80px]">
        <EventsPage />
      </div>
    </div>
  );
}