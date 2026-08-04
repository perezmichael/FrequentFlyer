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
                // Type sits over photography, so it needs a floor to read
                // against — a top-down scrim rather than dimming the whole
                // image and dulling the art.
                const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.62);
                scrim.addColorStop(0, 'rgba(0,0,0,0.55)');
                scrim.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = scrim;
                ctx.fillRect(0, 0, W, H * 0.62);
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
        ctx.fillStyle = BRICK;
        ctx.fillRect(0, 0, SIDEBAR_W, H);
        ctx.save();
        ctx.translate(SIDEBAR_W / 2, H - 60);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = CREAM;
        ctx.textAlign = 'left';
        ctx.font = `700 34px ${fonts.mono}, monospace`;
        ctx.fillText('FREQUENT FLYER EVENTS', 0, 12);
        ctx.restore();

        // --- headline ----------------------------------------------------
        const left = SIDEBAR_W + 54;
        const maxW = W - left - 60;
        let y = 150;

        ctx.textAlign = 'left';
        ctx.fillStyle = CREAM;
        ctx.font = `700 76px ${fonts.grotesk}, sans-serif`;
        for (const line of wrap(ctx, headline, maxW)) {
            ctx.fillText(line, left, y);
            y += 84;
        }

        // --- the three arrows that sit under the headline ----------------
        y += 8;
        ctx.font = `700 48px ${fonts.grotesk}, sans-serif`;
        ctx.fillText('→ → →', left, y);
        y += 76;

        // --- date range and optional teaser ------------------------------
        ctx.font = `700 30px ${fonts.mono}, monospace`;
        ctx.fillStyle = '#9BE7D2';
        for (const line of wrap(ctx, rangeLine.toUpperCase(), maxW)) {
            ctx.fillText(line, left, y);
            y += 40;
        }
        if (teaser.trim()) {
            ctx.fillStyle = '#F2EFA0';
            for (const line of wrap(ctx, teaser.toUpperCase(), maxW)) {
                ctx.fillText(line, left, y);
                y += 40;
            }
        }

        // --- logo, bottom right ------------------------------------------
        try {
            const logo = await loadImage('/images/fflogo20.png');
            const lw = 210;
            const lh = (logo.height / logo.width) * lw;
            ctx.drawImage(logo, W - lw - 48, H - lh - 48, lw, lh);
        } catch {
            // A missing logo shouldn't cost you the slide.
        }

        setError(null);
    }, [artUrl, headline, rangeLine, teaser, fonts]);

    useEffect(() => { draw(); }, [draw]);

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
                        className="w-full rounded-[10px] border border-black/10"
                        style={{ aspectRatio: `${W} / ${H}` }}
                    />
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
                    </div>

                    <div>
                        <label className={label} htmlFor="cover-headline">Headline</label>
                        <input id="cover-headline" className={field} value={headline}
                            onChange={e => setHeadline(e.target.value)} />
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

                    {error && (
                        <p className="font-space-mono text-[11px] text-brand">{error}</p>
                    )}
                </div>
            </div>
        </section>
    );
}
