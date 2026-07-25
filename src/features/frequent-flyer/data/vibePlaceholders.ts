import { resolveVibeEmoji } from './vibeEmoji';

export interface VibePlaceholder {
    bg: string;
    emoji: string;
}

export const VIBE_GRADIENTS: Record<string, VibePlaceholder> = {
    'Music':                          { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)', emoji: '🎶' },
    'Nightlife':                      { bg: 'linear-gradient(135deg, #0f0c29 0%, #302b63 60%, #24243e 100%)', emoji: '🌙' },
    'Art & Cultural':                 { bg: 'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)', emoji: '🎨' },
    'Food & Drink':                   { bg: 'linear-gradient(135deg, #b57b3a 0%, #6b3a1f 100%)', emoji: '🍹' },
    'Community':                      { bg: 'linear-gradient(135deg, #3a7b52 0%, #1a4a2e 100%)', emoji: '🌳' },
    'Markets & Flea Markets':         { bg: 'linear-gradient(135deg, #c97b2a 0%, #7a4010 100%)', emoji: '🛍️' },
    'Wellness':                       { bg: 'linear-gradient(135deg, #5b8c7a 0%, #2d4a3e 100%)', emoji: '🧘' },
    'Cultural Celebrations':          { bg: 'linear-gradient(135deg, #c0392b 0%, #8e44ad 100%)', emoji: '🏮' },
    'Film Screenings & Movie Nights': { bg: 'linear-gradient(135deg, #1c1c1c 0%, #4a4a4a 100%)', emoji: '🎥' },
    'Workshops & Classes':            { bg: 'linear-gradient(135deg, #2c3e50 0%, #4a7fa5 100%)', emoji: '🛠️' },
    'Outdoor Adventures':             { bg: 'linear-gradient(135deg, #2d6a2d 0%, #4a9e4a 100%)', emoji: '🏞️' },
    'Improv & Comedy':                { bg: 'linear-gradient(135deg, #8e4a15 0%, #c4752a 100%)', emoji: '🎭' },
    'Charity & Benefit':              { bg: 'linear-gradient(135deg, #1a6b8a 0%, #0d3d52 100%)', emoji: '💛' },
    'Holiday & Seasonal':             { bg: 'linear-gradient(135deg, #8b1a1a 0%, #c0392b 100%)', emoji: '🎉' },
    'Sports':                         { bg: 'linear-gradient(135deg, #1a4a8a 0%, #2e7d32 100%)', emoji: '🏃' },
    'Pop-Up':                         { bg: 'linear-gradient(135deg, #4a2c7a 0%, #7b52ab 100%)', emoji: '🏗️' },
    // Recurring event categories
    'Happy Hour':                     { bg: 'linear-gradient(135deg, #d4a030 0%, #8b6914 100%)', emoji: '🍸' },
    'Trivia':                         { bg: 'linear-gradient(135deg, #2a6478 0%, #1a3a4a 100%)', emoji: '🧠' },
    'Karaoke':                        { bg: 'linear-gradient(135deg, #a12a7b 0%, #5c1a4a 100%)', emoji: '🎤' },
    'Bingo':                          { bg: 'linear-gradient(135deg, #b33a3a 0%, #6b1a1a 100%)', emoji: '🎱' },
    'Open Mic':                       { bg: 'linear-gradient(135deg, #3a6b3a 0%, #1a4a1a 100%)', emoji: '🎙️' },
    'DJ Night':                       { bg: 'linear-gradient(135deg, #1a1a3a 0%, #3a2a6b 100%)', emoji: '🎧' },
    'Live Music':                     { bg: 'linear-gradient(135deg, #2a1a4a 0%, #4a2a7b 100%)', emoji: '🎵' },
    'Comedy Night':                   { bg: 'linear-gradient(135deg, #c4752a 0%, #8e4a15 100%)', emoji: '😂' },
    'Game Night':                     { bg: 'linear-gradient(135deg, #2a5a2a 0%, #4a8a4a 100%)', emoji: '🎲' },
    'Vinyl Night':                    { bg: 'linear-gradient(135deg, #2c2c2c 0%, #5a5a5a 100%)', emoji: '💿' },
    'Industry Night':                 { bg: 'linear-gradient(135deg, #4a3a1a 0%, #7a6a3a 100%)', emoji: '🍻' },
    'Dance Night':                    { bg: 'linear-gradient(135deg, #6b1a4a 0%, #a12a7b 100%)', emoji: '💃' },
};

export const DEFAULT_PLACEHOLDER: VibePlaceholder = {
    bg: 'linear-gradient(135deg, #2c2c2c 0%, #4a4a4a 100%)',
    emoji: '📍',
};

export const hasRealImage = (url: string | undefined | null): boolean =>
    !!url && url !== '/placeholder.jpg' && url !== '/nanobanana_placeholder.png';

export const getVibePlaceholder = (vibe: string | undefined): VibePlaceholder => {
    const exact = vibe ? VIBE_GRADIENTS[vibe] : undefined;
    if (exact) return exact;
    // Free-text categories from the scout ("Music (DJ Set)") don't hit the
    // table above, which left every generated flyer with the same 📍 watermark.
    // Keep the neutral gradient but resolve a meaningful emoji.
    return { ...DEFAULT_PLACEHOLDER, emoji: resolveVibeEmoji(vibe) };
};
