import { Link, useParams } from "react-router";

const guidesData = {
  "a-day-in-thai-town": {
    title: "A Day in Thai Town",
    subtitle: "Explore authentic Thai cuisine, markets, and hidden gems in LA's vibrant Thai neighborhood",
    coverImage: "https://images.unsplash.com/photo-1580007245793-7590f9b81266?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwVG93biUyMExvcyUyMEFuZ2VsZXMlMjByZXN0YXVyYW50fGVufDF8fHx8MTc3MDAyMDUxMXww&ixlib=rb-4.1.0&q=80&w=1080",
    author: "Sarah Chen",
    date: "February 1, 2026",
    readTime: "8 min read",
    content: [
      {
        type: "paragraph",
        text: "Tucked between Hollywood and East LA, Thai Town pulses with the energy of Southeast Asia. This compact neighborhood along Hollywood Boulevard has been the heart of LA's Thai community since the 1960s, and today it's a food lover's paradise that rewards exploration.",
      },
      {
        type: "heading",
        text: "Morning: Breakfast Like a Local",
      },
      {
        type: "paragraph",
        text: "Start your day at Sapp Coffee Shop (5183 Hollywood Blvd), opening at 9 AM. This no-frills spot is famous for jade noodles - vibrant green rice noodles in a rich boat noodle broth. Order the boat noodles with everything: blood cakes, liver, and all the offal. If that's too adventurous, their khao mun gai (Thai chicken rice) is a perfect comfort food breakfast.",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1658218615053-955e8af55947?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwcmVzdGF1cmFudCUyMGZvb2QlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzAwMjA5NjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        type: "paragraph",
        text: "After breakfast, walk west to Silom Supermarket (5321 Hollywood Blvd) to grab Thai iced tea and browse the aisles packed with imported goods. The selection of curry pastes, fish sauce brands, and exotic fruits is overwhelming in the best way. Pick up some mango sticky rice for later.",
      },
      {
        type: "heading",
        text: "Midday: Temple and Market Vibes",
      },
      {
        type: "paragraph",
        text: "Visit Wat Thai of Los Angeles (8225 Coldwater Canyon Ave), about a 10-minute drive from Thai Town. This ornate Buddhist temple welcomes visitors and offers a peaceful escape. On Sundays, there's a incredible food market in the parking lot where Thai grandmas serve homestyle dishes you won't find in restaurants.",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1675964042126-1698680db4fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwdGVtcGxlJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc3MDAyMDk2MHww&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        type: "paragraph",
        text: "Back in Thai Town, lunch is at Jitlada (5233 Sunset Blvd). This legendary restaurant serves Southern Thai cuisine that's spicy, funky, and utterly addictive. The menu is overwhelming, so here's what to order: crying tiger beef, pork belly with crispy Chinese broccoli, and the turmeric-laced crab curry. Be prepared to wait - there's always a line.",
      },
      {
        type: "heading",
        text: "Afternoon: Sweet Treats and Shopping",
      },
      {
        type: "paragraph",
        text: "Cool down with Thai shaved ice at Bhan Kanom Thai (5271 Hollywood Blvd). The rainbow-colored layers of coconut milk, jellies, and tropical fruits over fluffy shaved ice are Instagram-worthy and refreshing. Try the one with jackfruit and red rubies (water chestnuts in syrup).",
      },
      {
        type: "paragraph",
        text: "Spend the afternoon browsing Thai Town's shops. Bua Luang Thai Massage (5180 Hollywood Blvd) offers authentic 90-minute massages for under $80. Even if you skip the massage, wander the neighborhood's markets for Thai beauty products, incense, and Buddha statues.",
      },
      {
        type: "heading",
        text: "Evening: Night Market Energy",
      },
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1747396108528-682b02327818?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUaGFpJTIwbWFya2V0JTIwQmFuZ2tvayUyMHN0cmVldHxlbnwxfHx8fDE3NzAwMjA5NjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
      },
      {
        type: "paragraph",
        text: "As the sun sets, Thai Town's neon signs light up and the neighborhood transforms. Head to Ruen Pair (5257 Hollywood Blvd) for dinner. This late-night institution (open until 3 AM on weekends) specializes in Isaan food from northeastern Thailand. The larb (minced meat salad) and som tum (papaya salad) are perfectly balanced between spicy, sour, salty, and sweet.",
      },
      {
        type: "paragraph",
        text: "End your night at one of the neighborhood's karaoke bars. Thai Town has LA's best selection, where locals belt out Thai pop hits until the early morning. Or, if you're stuffed, grab Thai tea at any of the late-night cafes and watch the neighborhood's nocturnal energy unfold.",
      },
      {
        type: "heading",
        text: "Insider Tips",
      },
      {
        type: "list",
        items: [
          "Most restaurants are cash-only or have ATM fees - bring cash",
          "Thai Town is safe, but parking can be tricky. Use the lot at Hollywood & Kingsley",
          "Ask for 'Thai spicy' only if you really mean it - it's significantly hotter than regular spicy",
          "Many shops and restaurants close on Tuesdays",
          "The Thai script on signs indicates authentic spots - don't be intimidated to try them",
        ],
      },
      {
        type: "paragraph",
        text: "Thai Town may be small - just a few blocks along Hollywood Boulevard - but it contains multitudes. This is LA at its most authentic, where immigrant culture thrives and food is a direct line to another country. Come hungry, come curious, and prepare for one of the best eating days of your life.",
      },
    ],
  },
};

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = slug ? guidesData[slug as keyof typeof guidesData] : null;

  if (!guide) {
    return (
      <div className="min-h-screen bg-[#FFFAEB] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-['Space_Grotesk:Bold',sans-serif] text-[48px] mb-4">Guide Not Found</h1>
          <Link to="/guides" className="font-['Space_Mono:Regular',sans-serif] text-[16px] uppercase underline">
            ← Back to Guides
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFAEB]">
      {/* Header */}
      <div className="px-[48px] py-[24px] border-b border-black/10">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[1.25] not-italic text-[32px] text-black tracking-[-0.96px] uppercase"
          >
            Flyer Board
          </Link>
          <Link
            to="/guides"
            className="font-['Space_Mono:Regular',sans-serif] leading-[1.25] not-italic text-[14px] text-black tracking-[-0.56px] uppercase hover:underline"
          >
            ← Back to Guides
          </Link>
        </div>
      </div>

      {/* Cover Image */}
      <div className="relative w-full h-[500px] overflow-hidden">
        <img
          src={guide.coverImage}
          alt={guide.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Article Content */}
      <div className="max-w-[800px] mx-auto px-[48px] py-[64px]">
        {/* Meta */}
        <div className="mb-[32px]">
          <h1 className="font-['Space_Grotesk:Bold',sans-serif] font-bold leading-[1.2] text-[56px] text-black tracking-[-1.68px] uppercase mb-[16px]">
            {guide.title}
          </h1>
          <p className="font-['Space_Grotesk:Regular',sans-serif] text-[20px] text-black/70 mb-[24px] leading-[1.5]">
            {guide.subtitle}
          </p>
          <div className="flex items-center gap-[16px] text-[14px] font-['Space_Mono:Regular',sans-serif] text-black/50 uppercase">
            <span>{guide.author}</span>
            <span>•</span>
            <span>{guide.date}</span>
            <span>•</span>
            <span>{guide.readTime}</span>
          </div>
        </div>

        {/* Article Body */}
        <div className="space-y-[32px]">
          {guide.content.map((block, index) => {
            if (block.type === "paragraph") {
              return (
                <p
                  key={index}
                  className="font-['Space_Grotesk:Regular',sans-serif] text-[18px] text-black leading-[1.7]"
                >
                  {block.text}
                </p>
              );
            }

            if (block.type === "heading") {
              return (
                <h2
                  key={index}
                  className="font-['Space_Grotesk:Bold',sans-serif] font-bold text-[32px] text-black tracking-[-0.64px] uppercase mt-[48px] mb-[16px]"
                >
                  {block.text}
                </h2>
              );
            }

            if (block.type === "image") {
              return (
                <div key={index} className="my-[48px]">
                  <img
                    src={block.url}
                    alt=""
                    className="w-full h-[400px] object-cover shadow-lg"
                  />
                </div>
              );
            }

            if (block.type === "list" && block.items) {
              return (
                <ul key={index} className="space-y-[12px] ml-[24px]">
                  {block.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="font-['Space_Grotesk:Regular',sans-serif] text-[18px] text-black leading-[1.7] list-disc"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }

            return null;
          })}
        </div>

        {/* Back Link */}
        <div className="mt-[64px] pt-[32px] border-t border-black/10">
          <Link
            to="/guides"
            className="font-['Space_Mono:Regular',sans-serif] text-[16px] text-black uppercase tracking-[-0.64px] hover:underline"
          >
            ← Back to All Guides
          </Link>
        </div>
      </div>
    </div>
  );
}
