export interface Place {
    id: string;
    name: string;
    category: 'museum' | 'restaurant' | 'historical' | 'coffee' | 'bar' | 'park' | 'other';
    description: string;
    lat: number;
    lng: number;
    image: string;
}

export const INITIAL_PLACES: Place[] = [
    // NEW ADDITIONS
    {
        id: 'new1',
        name: 'MO+F',
        category: 'restaurant',
        description: 'Vibrant Asian fusion spot by the Mog family. Descendant of Fuji, offering a wide range of Japanese, Chinese, and Korean dishes.',
        lat: 19.4300,
        lng: -99.1650, // Approx for Rio Panuco 128
        image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&q=80&w=1000', // Asian food placeholder
    },
    {
        id: 'new2',
        name: 'Café Toscano',
        category: 'coffee',
        description: 'Charming café directly facing Plaza Río de Janeiro. Perfect for people watching with coffee or brunch.',
        lat: 19.4205,
        lng: -99.1605, // Approx for Orizaba 42
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1000', // Cafe placeholder
    },
    {
        id: 'new3',
        name: 'La Nuclear',
        category: 'bar',
        description: 'Traditional yet urban Pulqueria in Roma. Famous for its murals and authentic pulque curados.',
        lat: 19.4140,
        lng: -99.1580, // Approx for Orizaba 161
        image: 'https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?auto=format&fit=crop&q=80&w=1000', // Pulque/Bar placeholder
    },

    // COFFEE
    {
        id: 'c1',
        name: 'BUNA',
        category: 'coffee',
        description: 'Roma Norte staple with thoughtful, modern design serving locally sourced Mexican coffees.',
        lat: 19.4194,
        lng: -99.1575,
        image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'c2',
        name: 'Quentin Café',
        category: 'coffee',
        description: 'Cool ambiance and thoughtful design in Condesa, perfect for espresso lovers.',
        lat: 19.4150,
        lng: -99.1700,
        image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'c3',
        name: 'El Moro',
        category: 'coffee',
        description: 'Famous churreria serving delicious churros and hot chocolate since 1935.',
        lat: 19.4314,
        lng: -99.1437,
        image: 'https://images.unsplash.com/photo-1616016393356-9a29a67a996f?auto=format&fit=crop&q=80&w=1000',
    },

    // BARS
    {
        id: 'b1',
        name: 'Handshake Speakeasy',
        category: 'bar',
        description: 'Voted #1 bar in the world 2024. Art Deco interior with inventive cocktails.',
        lat: 19.4285,
        lng: -99.1680,
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'b2',
        name: 'Licorería Limantour',
        category: 'bar',
        description: 'Pioneering bar in Roma Norte known for sophisticated atmosphere and creative drinks.',
        lat: 19.4187,
        lng: -99.1625,
        image: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'b3',
        name: 'Baltra Bar',
        category: 'bar',
        description: 'Chic, upset cocktail lounge with nautical motifs and Hemingway vibes.',
        lat: 19.4095,
        lng: -99.1720,
        image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=1000',
    },

    // MUSEUMS
    {
        id: 'm1',
        name: 'Museo Soumaya',
        category: 'museum',
        description: 'Breathtaking modern architecture housing a significant private art collection.',
        lat: 19.4407,
        lng: -99.2047,
        image: 'https://images.unsplash.com/photo-1569949380633-e8c0765d706a?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'm2',
        name: 'Museo Nacional de Antropología',
        category: 'museum',
        description: 'World-renowned museum housing extensive artifacts from Mexico\'s pre-Columbian heritage.',
        lat: 19.4260,
        lng: -99.1863,
        image: 'https://images.unsplash.com/photo-1585671197943-4e43e248231b?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'm3',
        name: 'Museo Frida Kahlo',
        category: 'museum',
        description: 'The Blue House, historic house museum and art museum dedicated to the life and work of Frida Kahlo.',
        lat: 19.3551,
        lng: -99.1624,
        image: 'https://images.unsplash.com/photo-1522069169874-c51c6c9603c9?auto=format&fit=crop&q=80&w=1000',
    },

    // RESTAURANTS
    {
        id: 'r1',
        name: 'Pujol',
        category: 'restaurant',
        description: 'Enrique Olvera\'s globally acclaimed restaurant featuring mole madre.',
        lat: 19.4323,
        lng: -99.1957,
        image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=1000',
    },
    {
        id: 'r2',
        name: 'Contramar',
        category: 'restaurant',
        description: 'Famous for its tuna tostadas and vibrant lunch atmosphere.',
        lat: 19.4198,
        lng: -99.1678,
        image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?auto=format&fit=crop&q=80&w=1000',
    },
];
