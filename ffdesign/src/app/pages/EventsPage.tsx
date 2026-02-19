import FlyerCard from "@/app/components/FlyerCard";
import imgImage102 from "figma:asset/f8b639f9120aec392cf4052ace231cd249d84cd1.png";
import imgImage104 from "figma:asset/a11c5fcc-a0e4-4b7f-91f1-b867e0b4c0f5.png";
import imgImage103 from "figma:asset/fdc5c84e-4cda-4dd3-82bf-74a4a7607c89.png";

export default function EventsPage() {
  const events = [
    {
      image: imgImage102,
      event: {
        title: "Midnight Montrose",
        description: "A night of jazz and cocktails",
        location: "The Blue Note",
        date: "FRI, FEB 3, 9 PM",
        category: "Music",
        price: "$20",
        neighborhood: "Downtown",
      },
    },
    {
      image: imgImage104,
      event: {
        title: "Sunset Sessions",
        description: "Live acoustic performances",
        location: "Rooftop Garden",
        date: "SAT, FEB 4, 6 PM",
        category: "Music",
        price: "Free",
        neighborhood: "Arts District",
      },
    },
    {
      image: imgImage103,
      event: {
        title: "Urban Grind",
        description: "Hip-hop showcase",
        location: "The Warehouse",
        date: "SAT, FEB 4, 10 PM",
        category: "Music",
        price: "$15",
        neighborhood: "Eastside",
      },
    },
    {
      image: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800",
      event: {
        title: "Gallery Opening",
        description: "Contemporary art exhibition",
        location: "Modern Arts Gallery",
        date: "FRI, FEB 10, 7 PM",
        category: "Art",
        price: "Free",
        neighborhood: "Westside",
      },
    },
    {
      image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800",
      event: {
        title: "Indie Rock Night",
        description: "Local bands showcase",
        location: "Echo Park Venue",
        date: "SAT, FEB 11, 8 PM",
        category: "Music",
        price: "$12",
        neighborhood: "Echo Park",
      },
    },
    {
      image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800",
      event: {
        title: "Farmers Market",
        description: "Fresh local produce & crafts",
        location: "Grand Park",
        date: "SUN, FEB 12, 9 AM",
        category: "Food",
        price: "Free",
        neighborhood: "Downtown",
      },
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-[32px] w-full">
      {events.map((eventData, index) => (
        <FlyerCard key={index} image={eventData.image} event={eventData.event} />
      ))}
    </div>
  );
}
