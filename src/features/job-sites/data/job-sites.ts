export interface WorkerProfile {
    id: string;
    slug: string;
    name: string;
    trade: string;
    location: string;
    radius: string;
    type: ('Residential' | 'Commercial' | 'Industrial' | 'Data Center')[];
    unionStatus: 'Union' | 'Non-Union';
    yearsExperience: number;
    bio: string;
    avatar: string;
    phone: string;
    email: string;
    certifications: string[];
    availability: 'Available Now' | 'Booked' | 'Weekends Only';
    gallery: {
        url: string;
        caption: string;
    }[];
    pastProjects: string[];
}

export const WORKERS: WorkerProfile[] = [
    {
        id: '1',
        slug: 'mike-the-plumber',
        name: 'Mike "Pipes" O\'Connor',
        trade: 'Plumber',
        location: 'Chicago, IL',
        radius: '50 miles',
        type: ['Commercial', 'Industrial', 'Data Center'],
        unionStatus: 'Union',
        yearsExperience: 12,
        bio: 'Journeyman plumber specializing in high-pressure systems and industrial cooling. 5 years experience in data center cooling infrastructure.',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=256&h=256',
        phone: '(312) 555-0123',
        email: 'mike@pipes.com',
        certifications: ['Master Plumber', 'OSHA 30', 'Medical Gas'],
        availability: 'Available Now',
        gallery: [
            {
                url: 'https://images.unsplash.com/photo-1581094794329-cd11965d158e?auto=format&fit=crop&q=80&w=800',
                caption: 'Industrial Cooling System Install',
            },
            {
                url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=800',
                caption: 'Welding Pipe Joints',
            },
            {
                url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800',
                caption: 'Commercial Boiler Room',
            },
        ],
        pastProjects: ['Meta DeKalb Data Center', 'Willis Tower Renovation', 'O\'Hare Terminal 5'],
    },
    {
        id: '2',
        slug: 'sarah-sparks',
        name: 'Sarah Jenkins',
        trade: 'Electrician',
        location: 'Austin, TX',
        radius: '30 miles',
        type: ['Residential', 'Commercial'],
        unionStatus: 'Non-Union',
        yearsExperience: 8,
        bio: 'Detail-oriented electrician with a focus on smart home integrations and commercial lighting systems. Clean work, every time.',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256&h=256',
        phone: '(512) 555-0199',
        email: 'sarah@jenkinselectric.com',
        certifications: ['Journeyman Electrician', 'Tesla Certified Installer'],
        availability: 'Weekends Only',
        gallery: [
            {
                url: 'https://images.unsplash.com/photo-1621905252507-b35a830137d3?auto=format&fit=crop&q=80&w=800',
                caption: 'Smart Panel Upgrade',
            },
            {
                url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800',
                caption: 'Office Lighting Retrofit',
            },
        ],
        pastProjects: ['The Domain Northside', 'Austin Central Library', 'Various Custom Homes'],
    },
    {
        id: '3',
        slug: 'dave-welds',
        name: 'Dave Rodriguez',
        trade: 'Welder',
        location: 'Detroit, MI',
        radius: '100 miles',
        type: ['Industrial', 'Commercial'],
        unionStatus: 'Union',
        yearsExperience: 20,
        bio: 'Certified structural welder. I build things that don\'t fall down. Structural steel, pipe welding, and custom fabrication.',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256&h=256',
        phone: '(313) 555-0888',
        email: 'dave@rodriguezwelding.com',
        certifications: ['AWS Certified Welder', 'OSHA 10', 'Rigging & Signaling'],
        availability: 'Available Now',
        gallery: [
            {
                url: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=800',
                caption: 'Structural Steel Erection',
            },
            {
                url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=800',
                caption: 'TIG Welding Stainless',
            },
        ],
        pastProjects: ['Ford Rouge Plant', 'Little Caesars Arena', 'Gordie Howe Bridge'],
    },
    {
        id: '4',
        slug: 'alex-hvac',
        name: 'Alex Chen',
        trade: 'HVAC Tech',
        location: 'San Jose, CA',
        radius: '40 miles',
        type: ['Commercial', 'Data Center'],
        unionStatus: 'Non-Union',
        yearsExperience: 6,
        bio: 'Specializing in precision cooling for server rooms and large-scale commercial HVAC systems. 24/7 emergency service available.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256&h=256',
        phone: '(408) 555-0777',
        email: 'alex@cooltech.com',
        certifications: ['EPA 608 Universal', 'NATE Certified'],
        availability: 'Available Now',
        gallery: [
            {
                url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=800',
                caption: 'Rooftop Unit Maintenance',
            },
            {
                url: 'https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&q=80&w=800',
                caption: 'Server Room Cooling',
            },
        ],
        pastProjects: ['Google Bay View', 'Apple Park Visitor Center', 'Equinix SV10'],
    },
];
