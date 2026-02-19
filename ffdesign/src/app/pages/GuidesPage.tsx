import { Link } from "react-router";

const guides = [
  {
    title: "A Day in Thai Town",
    description: "Explore authentic Thai cuisine, markets, and hidden gems in LA's vibrant Thai neighborhood",
    image: "https://images.unsplash.com/photo-1580007245793-7590f9b81266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwVG93biUyMExvcyUyMEFuZ2VsZXMlMjByZXN0YXVyYW50fGVufDF8fHx8MTc3MDAyMDUxMXww&ixlib=rb-4.1.0&q=80&w=1080",
    readTime: "8 min read",
    slug: "a-day-in-thai-town",
  },
  {
    title: "Silver Lake Hotspots",
    description: "Coffee shops, vintage stores, and scenic views in one of LA's coolest neighborhoods",
    image: "https://images.unsplash.com/photo-1569247538721-640ce4ba6519?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxTaWx2ZXIlMjBMYWtlJTIwTG9zJTIwQW5nZWxlcyUyMGhpcHN0ZXIlMjBjYWZlfGVufDF8fHx8MTc3MDAyMDUxMnww&ixlib=rb-4.1.0&q=80&w=1080",
    readTime: "6 min read",
    slug: "silver-lake-hotspots",
  },
  {
    title: "Venice Beach Vibes",
    description: "From the boardwalk to the canals, experience the eclectic spirit of Venice",
    image: "https://images.unsplash.com/photo-1611858774596-6b2313d2b93c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxWZW5pY2UlMjBCZWFjaCUyMENhbGlmb3JuaWElMjBib2FyZHdhbGt8ZW58MXx8fHwxNzcwMDIwNTEyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    readTime: "10 min read",
    slug: "venice-beach-vibes",
  },
  {
    title: "Arts District Uncovered",
    description: "Street art, galleries, and the best brunch spots in Downtown LA's creative heart",
    image: "https://images.unsplash.com/photo-1599590650293-a944c41829e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxMb3MlMjBBbmdlbGVzJTIwc3RyZWV0JTIwYXJ0JTIwbXVyYWx8ZW58MXx8fHwxNzcwMDIwNTE2fDA&ixlib=rb-4.1.0&q=80&w=1080",
    readTime: "7 min read",
    slug: "arts-district-uncovered",
  },
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-[#FFFAEB]">
      {/* Header */}
      <div className="px-[48px] py-[32px] border-b border-black/10">
        <div className="flex items-center justify-between mb-[32px]">
          <Link
            to="/"
            className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[1.25] not-italic text-[32px] text-black tracking-[-0.96px] uppercase"
          >
            Flyer Board
          </Link>
          <Link
            to="/"
            className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[14px] text-black tracking-[-0.56px] uppercase hover:underline"
          >
            ← Back to Events
          </Link>
        </div>
        <h1 className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[1.2] text-[48px] text-black tracking-[-1.44px] uppercase">
          Los Angeles Guides
        </h1>
        <p className="font-['Space_Grotesk:Regular',sans-serif] text-[18px] text-black/70 mt-[12px]">
          Curated neighborhood guides and insider tips for exploring LA
        </p>
      </div>

      {/* Guides Grid */}
      <div className="px-[48px] py-[48px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[32px] max-w-[1400px]">
          {guides.map((guide, index) => (
            <div
              key={index}
              className="group bg-white shadow-[0px_8px_24px_-8px_rgba(0,0,0,0.15)] hover:shadow-[0px_16px_48px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 cursor-pointer overflow-hidden"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={guide.image}
                  alt={guide.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Content */}
              <div className="p-[32px]">
                <h2 className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[1.3] text-[28px] text-black tracking-[-0.56px] uppercase mb-[12px]">
                  {guide.title}
                </h2>
                <p className="font-['Space_Grotesk:Regular',sans-serif] text-[16px] text-black/70 leading-[1.5] mb-[16px]">
                  {guide.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-['Space_Mono:Regular',sans-serif] text-[12px] text-black/50 uppercase tracking-wide">
                    {guide.readTime}
                  </span>
                  <Link
                    to={`/guides/${guide.slug}`}
                    className="font-['Space_Mono:Regular',sans-serif] text-[14px] text-black uppercase tracking-[-0.56px] group-hover:underline"
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}