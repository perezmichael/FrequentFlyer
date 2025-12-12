export interface AuraAnalysis {
    sentiment: 'positive' | 'negative' | 'neutral' | 'energetic' | 'calm' | 'mystical' | 'nature' | 'passion';
    colors: string[];
    speed: number;
    description: string;
    keywords: string[];
}

const PALETTES = {
    positive: ['#FFD700', '#FFA500', '#FF6347'], // Gold, Orange, Tomato
    negative: ['#483D8B', '#2F4F4F', '#000000'], // Dark Slate Blue, Dark Slate Gray, Black
    neutral: ['#D3D3D3', '#F5F5F5', '#FFFFFF'], // Light Gray, White Smoke, White
    energetic: ['#FF00FF', '#00FFFF', '#FFFF00'], // Magenta, Cyan, Yellow
    calm: ['#E0FFFF', '#AFEEEE', '#B0E0E6'], // Light Cyan, Pale Turquoise, Powder Blue
    mystical: ['#9370DB', '#8A2BE2', '#4B0082'], // Medium Purple, Blue Violet, Indigo
    nature: ['#228B22', '#32CD32', '#90EE90'], // Forest Green, Lime Green, Light Green
    passion: ['#DC143C', '#FF1493', '#FF69B4'], // Crimson, Deep Pink, Hot Pink
};

const KEYWORD_MAP: Record<string, { sentiment: string; palette: string[] }> = {
    // Positive
    happy: { sentiment: 'positive', palette: PALETTES.positive },
    joy: { sentiment: 'positive', palette: PALETTES.positive },
    good: { sentiment: 'positive', palette: PALETTES.positive },
    great: { sentiment: 'positive', palette: PALETTES.positive },
    awesome: { sentiment: 'positive', palette: PALETTES.positive },
    smile: { sentiment: 'positive', palette: PALETTES.positive },

    // Passion / Love
    love: { sentiment: 'passion', palette: PALETTES.passion },
    heart: { sentiment: 'passion', palette: PALETTES.passion },
    passion: { sentiment: 'passion', palette: PALETTES.passion },
    fire: { sentiment: 'passion', palette: PALETTES.passion },

    // Energetic
    excited: { sentiment: 'energetic', palette: PALETTES.energetic },
    energy: { sentiment: 'energetic', palette: PALETTES.energetic },
    party: { sentiment: 'energetic', palette: PALETTES.energetic },
    fast: { sentiment: 'energetic', palette: PALETTES.energetic },
    dance: { sentiment: 'energetic', palette: PALETTES.energetic },
    hype: { sentiment: 'energetic', palette: PALETTES.energetic },

    // Negative
    sad: { sentiment: 'negative', palette: PALETTES.negative },
    bad: { sentiment: 'negative', palette: PALETTES.negative },
    angry: { sentiment: 'negative', palette: PALETTES.negative },
    tired: { sentiment: 'negative', palette: PALETTES.negative },
    dark: { sentiment: 'negative', palette: PALETTES.negative },
    gloom: { sentiment: 'negative', palette: PALETTES.negative },

    // Calm
    calm: { sentiment: 'calm', palette: PALETTES.calm },
    peace: { sentiment: 'calm', palette: PALETTES.calm },
    relax: { sentiment: 'calm', palette: PALETTES.calm },
    chill: { sentiment: 'calm', palette: PALETTES.calm },
    water: { sentiment: 'calm', palette: PALETTES.calm },
    sky: { sentiment: 'calm', palette: PALETTES.calm },

    // Mystical
    magic: { sentiment: 'mystical', palette: PALETTES.mystical },
    dream: { sentiment: 'mystical', palette: PALETTES.mystical },
    space: { sentiment: 'mystical', palette: PALETTES.mystical },
    star: { sentiment: 'mystical', palette: PALETTES.mystical },
    mystery: { sentiment: 'mystical', palette: PALETTES.mystical },
    purple: { sentiment: 'mystical', palette: PALETTES.mystical },

    // Nature
    nature: { sentiment: 'nature', palette: PALETTES.nature },
    green: { sentiment: 'nature', palette: PALETTES.nature },
    forest: { sentiment: 'nature', palette: PALETTES.nature },
    tree: { sentiment: 'nature', palette: PALETTES.nature },
    life: { sentiment: 'nature', palette: PALETTES.nature },
    grow: { sentiment: 'nature', palette: PALETTES.nature },
};

// Simple string hashing to get a deterministic number
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

export function analyzeVibe(text: string): AuraAnalysis {
    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    let detectedKeywords: string[] = [];
    let dominantPalette = PALETTES.neutral;
    let sentiment: AuraAnalysis['sentiment'] = 'neutral';
    let matchFound = false;

    // Keyword matching
    for (const word of words) {
        for (const [key, value] of Object.entries(KEYWORD_MAP)) {
            if (word.includes(key)) {
                detectedKeywords.push(key);
                dominantPalette = value.palette;
                // @ts-ignore
                sentiment = value.sentiment;
                matchFound = true;
            }
        }
    }

    // Fallback: Deterministic "Random" based on hash if no match found
    if (!matchFound && text.trim().length > 0) {
        const hash = hashCode(lowerText);
        const paletteKeys = Object.keys(PALETTES) as Array<keyof typeof PALETTES>;
        const randomKey = paletteKeys[hash % paletteKeys.length];

        dominantPalette = PALETTES[randomKey];
        // @ts-ignore
        sentiment = randomKey;

        // Add a "pseudo-keyword" based on the sentiment to show something
        detectedKeywords.push('mystery');
    }

    // Determine speed
    let speed = 1;
    if (text.includes('!')) speed += 0.5;
    if (text.length > 50) speed += 0.2;
    if (detectedKeywords.some(k => ['energy', 'fast', 'excited', 'party'].includes(k))) speed += 1;
    if (detectedKeywords.some(k => ['calm', 'relax', 'slow', 'peace'].includes(k))) speed = 0.5;

    // Generate description
    const descriptions = [
        "Your aura is radiating a distinct energy.",
        "The vibes are shifting.",
        "A fascinating emotional landscape.",
        "Pure digital resonance.",
        "The algorithm senses a disturbance.",
        "Harmonic frequencies detected.",
    ];
    // Use hash for description selection too
    const hash = hashCode(lowerText);
    const randomDesc = descriptions[hash % descriptions.length];

    return {
        sentiment,
        colors: dominantPalette,
        speed,
        description: detectedKeywords.length > 0
            ? `Detected: ${detectedKeywords.join(', ')}. ${randomDesc}`
            : `An enigma. ${randomDesc}`,
        keywords: detectedKeywords
    };
}
