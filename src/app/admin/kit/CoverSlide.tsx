'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The carousel's cover slide.
 *
 * The kit already makes every event slide; the cover was the one piece still
 * being laid out by hand in Figma each week, which is where most of the time
 * went. This doesn't replace the artwork — bring your own MidJourney piece or
 * a flyer you're repurposing — it replaces the type layout, which is the part
 * that isn't a creative decision.
 *
 * With no artwork it falls back to a typographic cover in the brand's own
 * colours, so a week without art doesn't block a post.
 */

const W = 1080;
const H = 1350;
const CREAM = '#FFFAEB';
const INK = '#1a1a1a';
const BRICK = '#C2371B';

/** Left-hand band carrying the rotated wordmark, as on the current covers. */
const SIDEBAR_W = 76;

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('could not read that image'));
        img.src = src;
    });
}

/** Normalise any CSS colour into the 6-digit hex <input type="color"> wants. */
function toHexColor(c: string): string {
    if (!c) return '#000000';
    if (c.startsWith('#')) {
        return c.length === 4 ? '#' + c.slice(1).split('').map(x => x + x).join('') : c.slice(0, 7);
    }
    const m = c.match(/\d+/g);
    if (m && m.length >= 3) {
        const h = (n: string) => Number(n).toString(16).padStart(2, '0');
        return `#${h(m[0])}${h(m[1])}${h(m[2])}`;
    }
    return '#000000';
}

/**
 * The handful of colours the artwork is actually made of.
 *
 * Sampling a downscaled copy and bucketing into a coarse RGB grid is enough —
 * the point isn't a perfect quantiser, it's giving you type colours that came
 * out of your own image rather than out of a generic picker.
 */
function extractPalette(img: HTMLImageElement, count = 6): string[] {
    const w = 64, h = 80;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;               // skip transparent
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // 32-step grid: fine enough to separate hues, coarse enough that
        // near-identical pixels land together.
        const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
        const cur = buckets.get(key);
        if (cur) { cur.r += r; cur.g += g; cur.b += b; cur.n++; }
        else buckets.set(key, { r, g, b, n: 1 });
    }

    return [...buckets.values()]
        .sort((a, b) => b.n - a.n)
        .slice(0, count)
        .map(v => {
            const hx = (n: number) => Math.round(n / v.n).toString(16).padStart(2, '0');
            return `#${hx(v.r)}${hx(v.g)}${hx(v.b)}`;
        });
}

/** Greedy wrap measured against the live context. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width <= maxWidth || !line) line = next;
        else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
}

/**
 * Words a line shouldn't end on. The eye expects what follows a preposition
 * or article, so breaking after one strands it.
 */
const WEAK_LINE_ENDINGS = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'to', 'of', 'for', 'and', 'or',
    'with', 'from', 'by', 'this', 'your',
]);

/**
 * Wrap a headline across two lines, choosing the break deliberately.
 *
 * Greedy wrapping filled the first line and left whatever didn't fit, which on
 * "Things to do in LA this week" stranded "week" alone. Pure balance — the
 * most even split — gives "Things to do in / LA this week", which is even but
 * breaks after a preposition.
 *
 * So: score each candidate on how uneven the lines are, then penalise any
 * break that leaves a function word dangling.
 *
 * That still won't always match your ear — on the default headline it picks
 * "Things to do / in LA this week" where you might want "Things to do in LA /
 * this week", and both are defensible. A "|" anywhere in the headline forces
 * the break there, so taste beats the heuristic when you want it to.
 */
function balancedHeadline(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
): string[] {
    // Manual override: "Things to do in LA | this week" breaks exactly there.
    if (text.includes('|')) {
        return text.split('|').map(part => part.trim()).filter(Boolean);
    }

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length < 2) return [text];
    if (ctx.measureText(text).width <= maxWidth) return [text];

    const width = (s: string) => ctx.measureText(s).width;
    // A break has to be worth more than this much imbalance to be taken.
    const WEAK_PENALTY = maxWidth * 0.45;

    let best: { lines: string[]; score: number } | null = null;
    for (let i = 1; i < words.length; i++) {
        const first = words.slice(0, i).join(' ');
        const second = words.slice(i).join(' ');
        const w1 = width(first), w2 = width(second);
        // Both halves must fit; otherwise fall through to the greedy wrap.
        if (w1 > maxWidth || w2 > maxWidth) continue;

        let score = Math.abs(w1 - w2);
        if (WEAK_LINE_ENDINGS.has(words[i - 1].toLowerCase())) score += WEAK_PENALTY;
        if (!best || score < best.score) best = { lines: [first, second], score };
    }

    // Three lines or more (a long custom headline) — greedy is fine there.
    return best ? best.lines : wrap(ctx, text, maxWidth);
}

/**
 * A soft dark halo behind the letterforms.
 *
 * Set before drawing text and cleared after, so it never leaks into the next
 * shape — a stray shadow on the sidebar rectangle is a very visible bug.
 */
function applyHalo(ctx: CanvasRenderingContext2D, on: boolean) {
    ctx.shadowColor = on ? 'rgba(0,0,0,0.55)' : 'transparent';
    ctx.shadowBlur = on ? 14 : 0;
    ctx.shadowOffsetY = on ? 2 : 0;
}

export default function CoverSlide({
    dateRange,
    fonts,
}: {
    /** e.g. "Monday Aug 4 – Sunday Aug 10" — prefilled, still editable. */
    dateRange: string;
    fonts: { grotesk: string; mono: string } | null;
}) {
    const [headline, setHeadline] = useState('Things to do in LA this week');
    const [rangeLine, setRangeLine] = useState(dateRange);
    const [teaser, setTeaser] = useState('');
    const [artUrl, setArtUrl] = useState<string | null>(null);
    const [artName, setArtName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Type colours. Defaults are the brand's, but artwork wins often enough
    // that every one of them is overridable.
    const [headlineColor, setHeadlineColor] = useState(CREAM);
    const [dateColor, setDateColor] = useState('#9BE7D2');
    const [teaserColor, setTeaserColor] = useState('#F2EFA0');
    const [sidebarColor, setSidebarColor] = useState(BRICK);
    const [sidebarTextColor, setSidebarTextColor] = useState(CREAM);
    /** Colours lifted out of the uploaded artwork. */
    const [palette, setPalette] = useState<string[]>([]);
    /** Which field an eyedropper click should fill, if any. */
    const [picking, setPicking] = useState<null | 'headline' | 'date' | 'teaser' | 'sidebar' | 'sidebarText'>(null);
    // How hard to darken behind the type. Bright artwork barely needs it, and
    // a fixed scrim was flattening images that didn't.
    const [scrim, setScrim] = useState<'none' | 'light' | 'strong'>('light');
    // Shadow the letterforms instead of the picture. A scrim buys legibility
    // by dulling the artwork; a halo behind the type buys it without touching
    // the image, which is how posters have always handled this.
    const [halo, setHalo] = useState(true);

    useEffect(() => { setRangeLine(dateRange); }, [dateRange]);

    // Object URLs are revoked on replace so a long session doesn't leak them.
    useEffect(() => () => { if (artUrl) URL.revokeObjectURL(artUrl); }, [artUrl]);

    const draw = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !fonts) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = W;
        canvas.height = H;

        // --- artwork, or the brand fallback -----------------------------
        if (artUrl) {
            try {
                const art = await loadImage(artUrl);
                const scale = Math.max(W / art.width, H / art.height);
                ctx.drawImage(
                    art,
                    (W - art.width * scale) / 2, (H - art.height * scale) / 2,
                    art.width * scale, art.height * scale,
                );
                // Type sits over photography, so it usually needs a floor to
                // read against — a top-down gradient rather than an overall
                // dim, which would flatten the artwork. Strength is a control:
                // a bright illustration often needs none at all.
                const alpha = scrim === 'none' ? 0 : scrim === 'strong' ? 0.72 : 0.45;
                if (alpha > 0) {
                    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
                    grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, W, H * 0.62);
                }
            } catch {
                setError('That file could not be read as an image.');
                return;
            }
        } else {
            ctx.fillStyle = INK;
            ctx.fillRect(0, 0, W, H);
        }

        // --- vertical wordmark band -------------------------------------
        // Brick either way. A dark translucent band over dark artwork read as
        // a smudge — the wordmark was legible but the band wasn't, and it's
        // the one element tying the cover to the rest of the brand.
        applyHalo(ctx, false);      // never shadow the band itself
        ctx.fillStyle = sidebarColor;
        ctx.fillRect(0, 0, SIDEBAR_W, H);
        ctx.save();
        ctx.translate(SIDEBAR_W / 2, H - 60);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = sidebarTextColor;
        ctx.textAlign = 'left';
        ctx.font = `700 34px ${fonts.mono}, monospace`;
        // The band already gives this contrast; a halo here just muddies it.
        applyHalo(ctx, false);
        ctx.fillText('FREQUENT FLYER EVENTS', 0, 12);
        ctx.restore();

        // --- headline ----------------------------------------------------
        const left = SIDEBAR_W + 54;
        const maxW = W - left - 60;
        let y = 150;

        ctx.textAlign = 'left';
        applyHalo(ctx, halo);
        ctx.fillStyle = headlineColor;
        ctx.font = `700 76px ${fonts.grotesk}, sans-serif`;
        for (const line of balancedHeadline(ctx, headline, maxW)) {
            ctx.fillText(line, left, y);
            y += 84;
        }

        // --- the three arrows that sit under the headline ----------------
        y += 8;
        ctx.fillStyle = headlineColor;
        ctx.font = `700 48px ${fonts.grotesk}, sans-serif`;
        ctx.fillText('→ → →', left, y);
        y += 76;

        // --- date range and optional teaser ------------------------------
        ctx.font = `700 30px ${fonts.mono}, monospace`;
        ctx.fillStyle = dateColor;
        for (const line of wrap(ctx, rangeLine.toUpperCase(), maxW)) {
            ctx.fillText(line, left, y);
            y += 40;
        }
        if (teaser.trim()) {
            ctx.fillStyle = teaserColor;
            for (const line of wrap(ctx, teaser.toUpperCase(), maxW)) {
                ctx.fillText(line, left, y);
                y += 40;
            }
        }

        // --- logo, bottom right ------------------------------------------
        applyHalo(ctx, false);
        try {
            const logo = await loadImage('/images/fflogo20.png');
            const lw = 210;
            const lh = (logo.height / logo.width) * lw;
            ctx.drawImage(logo, W - lw - 48, H - lh - 48, lw, lh);
        } catch {
            // A missing logo shouldn't cost you the slide.
        }

        setError(null);
    }, [artUrl, headline, rangeLine, teaser, fonts, scrim, halo,
        headlineColor, dateColor, teaserColor, sidebarColor, sidebarTextColor]);

    useEffect(() => { draw(); }, [draw]);

    // Read the artwork's own colours so the swatches are its colours.
    useEffect(() => {
        if (!artUrl) { setPalette([]); return; }
        let cancelled = false;
        loadImage(artUrl)
            .then(img => { if (!cancelled) setPalette(extractPalette(img)); })
            .catch(() => { if (!cancelled) setPalette([]); });
        return () => { cancelled = true; };
    }, [artUrl]);

    /**
     * Eyedropper. Reads the pixel under the click straight off the rendered
     * canvas, so it samples the composited slide — artwork, scrim and all —
     * which is what you're actually looking at.
     */
    const onCanvasClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
        if (!picking) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.round((ev.clientX - rect.left) * (W / rect.width));
        const y = Math.round((ev.clientY - rect.top) * (H / rect.height));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
        const hex = `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
        ({
            headline: setHeadlineColor, date: setDateColor, teaser: setTeaserColor,
            sidebar: setSidebarColor, sidebarText: setSidebarTextColor,
        })[picking](hex);
        setPicking(null);
    };

    const onPickArt = (file: File | undefined) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Pick an image file.'); return; }
        if (artUrl) URL.revokeObjectURL(artUrl);
        setArtUrl(URL.createObjectURL(file));
        setArtName(file.name);
        setError(null);
    };

    const download = () => {
        canvasRef.current?.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '00-cover.png'; // sorts first in the folder you upload from
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    const field = 'w-full rounded-md border border-black/25 bg-cream px-2.5 py-1.5 font-space-mono text-[12px] text-ink';
    const label = 'block font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/55 mb-1';

    return (
        <section className="mt-8 rounded-[12px] border border-black/15 p-4">
            <h2 className="font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink mb-3">
                Cover slide
            </h2>

            <div className="flex flex-col gap-5 md:flex-row">
                <div className="md:w-[220px] shrink-0">
                    <canvas
                        ref={canvasRef}
                        onClick={onCanvasClick}
                        className="w-full rounded-[10px] border border-black/10"
                        style={{ aspectRatio: `${W} / ${H}`, cursor: picking ? 'crosshair' : 'default' }}
                    />
                    {picking && (
                        <p className="mt-1 text-center font-space-mono text-[10px] uppercase tracking-[-0.44px] text-brand">
                            click the slide to sample a colour
                        </p>
                    )}
                    <button
                        onClick={download}
                        className="mt-2 w-full rounded-full border border-black/40 px-3 py-1.5 font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink transition-colors hover:bg-ink hover:text-cream"
                    >
                        Download PNG
                    </button>
                </div>

                <div className="flex-1 space-y-3">
                    <div>
                        <label className={label} htmlFor="cover-art">
                            Artwork — your MidJourney piece or a flyer you&rsquo;re repurposing
                        </label>
                        <input
                            id="cover-art" type="file" accept="image/*"
                            onChange={e => onPickArt(e.target.files?.[0])}
                            className="block w-full font-space-mono text-[11px] text-ink/70 file:mr-3 file:rounded-full file:border file:border-black/40 file:bg-transparent file:px-3 file:py-1 file:font-space-mono file:text-[11px] file:uppercase file:tracking-[-0.44px]"
                        />
                        <p className="mt-1 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/40">
                            {artName ? `using ${artName}` : 'no artwork — falling back to the branded cover'}
                        </p>

                        {artUrl && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/55">
                                    Darken behind type
                                </span>
                                {(['none', 'light', 'strong'] as const).map(level => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => setScrim(level)}
                                        className={`rounded-full border px-2.5 py-0.5 font-space-mono text-[10px] uppercase tracking-[-0.44px] ${
                                            scrim === level ? 'bg-ink text-cream border-ink' : 'border-black/30 text-ink/60 hover:border-black/60'
                                        }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        )}

                        <label className="mt-2 flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox" checked={halo}
                                onChange={e => setHalo(e.target.checked)}
                                className="accent-brand"
                            />
                            <span className="font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/55">
                                Shadow behind text
                            </span>
                            <span className="font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/35">
                                — lets you keep the scrim off
                            </span>
                        </label>
                    </div>

                    <div>
                        <label className={label} htmlFor="cover-headline">Headline</label>
                        <input id="cover-headline" className={field} value={headline}
                            onChange={e => setHeadline(e.target.value)} />
                        <p className="mt-1 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/40">
                            lines balance automatically — type | to force a break
                        </p>
                    </div>

                    <div>
                        <label className={label} htmlFor="cover-range">Date range</label>
                        <input id="cover-range" className={field} value={rangeLine}
                            onChange={e => setRangeLine(e.target.value)} />
                    </div>

                    <div>
                        <label className={label} htmlFor="cover-teaser">Teaser (optional)</label>
                        <input id="cover-teaser" className={field} value={teaser}
                            placeholder="scroll for the free ones"
                            onChange={e => setTeaser(e.target.value)} />
                    </div>

                    <div className="pt-1">
                        <p className={label}>Colours</p>
                        {palette.length === 0 && (
                            <p className="mb-2 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/40">
                                upload artwork to pull its palette
                            </p>
                        )}
                        <div className="space-y-2">
                            {([
                                ['Headline', headlineColor, setHeadlineColor, 'headline'],
                                ['Date', dateColor, setDateColor, 'date'],
                                ['Teaser', teaserColor, setTeaserColor, 'teaser'],
                                ['Side bar', sidebarColor, setSidebarColor, 'sidebar'],
                                ['Side bar text', sidebarTextColor, setSidebarTextColor, 'sidebarText'],
                            ] as const).map(([name, value, set, key]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className="w-[86px] shrink-0 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/55">
                                        {name}
                                    </span>

                                    {/* Colours out of the artwork, then the brand's own. */}
                                    {[...palette, CREAM, INK, BRICK].slice(0, 9).map((c, i) => (
                                        <button
                                            key={`${key}-${c}-${i}`}
                                            type="button"
                                            onClick={() => set(c)}
                                            title={c}
                                            className="rounded-full border border-black/20"
                                            style={{
                                                width: 18, height: 18, background: c,
                                                outline: toHexColor(value).toLowerCase() === toHexColor(c).toLowerCase()
                                                    ? `2px solid ${BRICK}` : 'none',
                                                outlineOffset: 2,
                                            }}
                                        />
                                    ))}

                                    <label
                                        title="Custom colour"
                                        className="relative shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/20"
                                        style={{ width: 18, height: 18, background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                                    >
                                        <input
                                            type="color" value={toHexColor(value)}
                                            onChange={e => set(e.target.value)}
                                            className="absolute inset-0 cursor-pointer opacity-0"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => setPicking(picking === key ? null : key)}
                                        title="Sample a colour from the slide"
                                        className={`shrink-0 rounded-full border px-2 py-0.5 font-space-mono text-[10px] uppercase tracking-[-0.44px] ${
                                            picking === key ? 'border-brand bg-brand text-cream' : 'border-black/30 text-ink/60 hover:border-black/60'
                                        }`}
                                    >
                                        pick
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <p className="font-space-mono text-[11px] text-brand">{error}</p>
                    )}
                </div>
            </div>
        </section>
    );
}
