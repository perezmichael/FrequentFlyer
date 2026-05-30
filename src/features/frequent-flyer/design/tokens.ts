/**
 * Frequent Flyer — design tokens (source of truth).
 *
 * These mirror the CSS custom properties defined in src/app/globals.css.
 * They exist in TS so the /design style-guide page can render live swatches
 * and the type scale from the same values the app is built on.
 *
 * When you change a brand value, change it in BOTH places (here + globals.css)
 * — or better, reference the CSS var. The /design page is the visual check.
 */

export interface ColorToken {
    name: string;
    /** The brand token name used in docs/utilities (e.g. "cream" -> bg-cream). */
    token: string;
    hex: string;
    usage: string;
    /** True when the swatch background is dark — render its label in cream. */
    darkBg?: boolean;
}

export const COLORS: ColorToken[] = [
    { name: 'Cream', token: 'cream', hex: '#FFFAEB', usage: 'App background; inverse text on dark fills' },
    { name: 'Ink', token: 'ink', hex: '#1a1a1a', usage: 'Primary text & solid (black) fills', darkBg: true },
    { name: 'Accent', token: 'accent', hex: '#5d39ac', usage: 'Links, active/secondary states', darkBg: true },
    { name: 'Flyer cream', token: 'flyer', hex: '#efede1', usage: 'Text on dark flyer artwork' },
];

export interface BorderToken {
    name: string;
    value: string;
    usage: string;
}

export const BORDERS: BorderToken[] = [
    { name: 'Strong', value: 'rgba(0,0,0,0.40)', usage: 'Pill outlines (border-black/40)' },
    { name: 'Default', value: 'rgba(0,0,0,0.30)', usage: 'Inactive controls (border-black/30)' },
    { name: 'Faint', value: 'rgba(0,0,0,0.05)', usage: 'Section dividers (border-black/5)' },
];

export interface FontToken {
    name: string;
    /** Tailwind class that applies it. */
    className: string;
    role: string;
    sample: string;
}

export const FONTS: FontToken[] = [
    { name: 'Space Mono', className: 'font-space-mono', role: 'UI, nav, labels, pills — usually UPPERCASE with tight tracking', sample: 'FREQUENT FLYER' },
    { name: 'Space Grotesk', className: 'font-space-grotesk', role: 'Flyer headings & display type', sample: 'Friday Night' },
    { name: 'EB Garamond', className: 'font-serif', role: 'Editorial / serif accents', sample: 'Los Angeles' },
];

export interface TypeStep {
    /** Tailwind arbitrary-size class actually used in the app. */
    className: string;
    px: number;
    usage: string;
}

/** The font sizes actually in use across the app, largest → smallest. */
export const TYPE_SCALE: TypeStep[] = [
    { className: 'text-[64px]', px: 64, usage: 'Hero / display' },
    { className: 'text-[32px]', px: 32, usage: 'Page titles' },
    { className: 'text-[28px]', px: 28, usage: 'Section headings' },
    { className: 'text-[24px]', px: 24, usage: 'Subheadings' },
    { className: 'text-[20px]', px: 20, usage: 'Card titles (large)' },
    { className: 'text-[16px]', px: 16, usage: 'Nav links, body labels' },
    { className: 'text-[14px]', px: 14, usage: 'Body / metadata' },
    { className: 'text-[13px]', px: 13, usage: 'Tabs, secondary UI' },
    { className: 'text-[12px]', px: 12, usage: 'Captions' },
    { className: 'text-[11px]', px: 11, usage: 'Filter pills (smallest)' },
];

export const TRACKING = {
    label: '-0.64px', // nav links, create pill, section labels
    pill: '-0.44px',  // small filter pills
} as const;

export const RADIUS = {
    pill: '9999px',
} as const;

/* ───────────────────────────────────────────────────────────────────────
   Accent color exploration (NOT YET ADOPTED).
   Candidates for the brand accent, compared live on /design against the real
   cream + patterns. Nothing here is wired into the app until one is promoted
   to --ff-accent in globals.css + COLORS above.
   ─────────────────────────────────────────────────────────────────────── */

export interface AccentCandidate {
    name: string;
    hex: string;
    /** Why it's in the running. */
    note: string;
    /** Marks the currently-shipping accent. */
    current?: boolean;
}

export const ACCENT_CANDIDATES: AccentCandidate[] = [
    { name: 'Iris', hex: '#5d39ac', note: 'Current. Creative / nightlife; cool against cream.', current: true },
    { name: 'Deep Violet', hex: '#4C1D95', note: 'A confident, richer purple — intentional, not default.' },
    { name: 'Brick', hex: '#C2371B', note: 'Warm vermillion — energetic, inviting, LA-flyer.' },
    { name: 'Terracotta', hex: '#B5502E', note: 'Earthy warm clay — communal, harmonizes with cream.' },
];

/** WCAG relative luminance of a #rrggbb hex. */
export function luminance(hex: string): number {
    const h = hex.replace('#', '');
    const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const r = toLin(parseInt(h.slice(0, 2), 16) / 255);
    const g = toLin(parseInt(h.slice(2, 4), 16) / 255);
    const b = toLin(parseInt(h.slice(4, 6), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(a: string, b: string): number {
    const la = luminance(a);
    const lb = luminance(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
}

/** AA verdict for a contrast ratio: small text needs 4.5, large/UI needs 3. */
export function aaVerdict(ratio: number): 'AA' | 'AA Large' | 'Fail' {
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3) return 'AA Large';
    return 'Fail';
}
