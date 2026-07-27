'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveVibeEmoji } from '@/features/frequent-flyer/data/vibeEmoji';

export interface KitEvent {
    id: string;
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    flyerUrl: string | null;
    vibe: string | null;
    venue: string;
    neighborhood: string;
    isPick: boolean;
}

/* Instagram portrait. The flyer sits above a cream caption panel, which is the
   shape of the carousel that already runs on the account. */
const W = 1080;
const H = 1350;
const PANEL_H = 300;
const CREAM = '#FDFBF3';
const INK = '#1a1a1a';
const BRICK = '#C2371B';

/** "9:00 PM" from a Postgres time. Returns '' for null/garbage. */
function clockTime(t: string | null): string {
    if (!t) return '';
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return '';
    let h = Number(m[1]);
    const min = m[2];
    const suffix = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${min} ${suffix}`;
}

/** "THURSDAY JUL.30 8:00 PM - 11:00 PM" — the caption's first line. */
function dateLine(e: KitEvent): string {
    const d = new Date(`${e.date}T00:00:00`);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const start = clockTime(e.startTime);
    const end = clockTime(e.endTime);
    const time = start && end ? `${start} - ${end}` : start;
    return `${weekday} ${month}.${day}${time ? ` ${time}` : ''}`.toUpperCase();
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // storage sends ACAO:* so the canvas stays exportable
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`image failed: ${src}`));
        img.src = src;
    });
}

/** Greedy wrap that measures against the live canvas context. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width <= maxWidth || !line) {
            line = next;
        } else {
            lines.push(line);
            line = word;
            if (lines.length === maxLines) break;
        }
    }
    if (lines.length < maxLines && line) lines.push(line);
    if (lines.length === maxLines) {
        // Ellipsize the last line rather than letting it run off the slide.
        let last = lines[maxLines - 1];
        if (ctx.measureText(last).width > maxWidth) {
            while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
            lines[maxLines - 1] = `${last}…`;
        }
    }
    return lines;
}

export default function KitClient({ events, from, to }: { events: KitEvent[]; from: string; to: string }) {
    // Default to the events that actually have a flyer — the carousel format is
    // flyer-driven, and a slide without one is a different (branded) look.
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(events.filter(e => e.flyerUrl && e.title).map(e => e.id))
    );
    const [fonts, setFonts] = useState<{ grotesk: string; mono: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [tileSize, setTileSize] = useState(170);
    const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

    useEffect(() => {
        const styles = getComputedStyle(document.body);
        const grotesk = styles.getPropertyValue('--font-space-grotesk').trim() || 'sans-serif';
        const mono = styles.getPropertyValue('--font-space-mono').trim() || 'monospace';
        document.fonts.ready.then(() => setFonts({ grotesk, mono }));
    }, []);

    const chosen = useMemo(
        () => events.filter(e => selected.has(e.id)),
        [events, selected]
    );

    const drawSlide = useCallback(async (canvas: HTMLCanvasElement, e: KitEvent, f: { grotesk: string; mono: string }) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = W;
        canvas.height = H;

        const artH = H - PANEL_H;

        // --- artwork ---------------------------------------------------
        let drew = false;
        if (e.flyerUrl) {
            try {
                const img = await loadImage(e.flyerUrl);
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, W, artH);
                ctx.clip();

                // Backdrop: the same flyer, cover-fit and blurred. Flyers arrive
                // in every ratio (this venue's are landscape), and cover-fitting
                // the real one would slice the band name off. Contain it instead
                // and let a blurred copy fill the gap, so the art is never cut.
                const cover = Math.max(W / img.width, artH / img.height) * 1.15;
                ctx.filter = 'blur(48px)';
                ctx.drawImage(
                    img,
                    (W - img.width * cover) / 2, (artH - img.height * cover) / 2,
                    img.width * cover, img.height * cover,
                );
                ctx.filter = 'none';

                // The flyer itself, whole.
                const fit = Math.min(W / img.width, artH / img.height);
                const w = img.width * fit;
                const h = img.height * fit;
                ctx.drawImage(img, (W - w) / 2, (artH - h) / 2, w, h);
                ctx.restore();
                drew = true;
            } catch {
                drew = false; // fall through to the branded card
            }
        }

        if (!drew) {
            // The same honest fallback the app uses: a branded typographic card,
            // never a stock photo standing in for a flyer we don't have.
            ctx.fillStyle = INK;
            ctx.fillRect(0, 0, W, artH);
            ctx.fillStyle = CREAM;
            ctx.textAlign = 'left';
            ctx.font = `700 76px ${f.grotesk}, sans-serif`;
            const titleLines = wrap(ctx, e.title.toUpperCase(), W - 140, 4);
            titleLines.forEach((ln, i) => ctx.fillText(ln, 70, artH / 2 - (titleLines.length - 1) * 44 + i * 88));
            ctx.fillStyle = BRICK;
            ctx.font = `700 30px ${f.mono}, monospace`;
            ctx.fillText((e.vibe || 'EVENT').toUpperCase(), 70, 90);
            ctx.fillStyle = 'rgba(253,251,243,0.55)';
            ctx.fillText((e.neighborhood || 'LOS ANGELES').toUpperCase(), 70, artH - 60);
        }

        // --- caption panel ---------------------------------------------
        ctx.fillStyle = CREAM;
        ctx.fillRect(0, artH, W, PANEL_H);

        ctx.textAlign = 'center';
        const cx = W / 2;
        let y = artH + 74;

        // date + time
        ctx.fillStyle = INK;
        ctx.font = `700 44px ${f.grotesk}, sans-serif`;
        ctx.fillText(dateLine(e), cx, y);
        y += 62;

        // event name (wraps to two lines if long)
        ctx.font = `700 38px ${f.grotesk}, sans-serif`;
        const nameLines = wrap(ctx, e.title.toUpperCase(), W - 100, 2);
        nameLines.forEach(ln => { ctx.fillText(ln, cx, y); y += 46; });
        y += 6;

        // venue
        ctx.font = `500 34px ${f.grotesk}, sans-serif`;
        ctx.fillText(`📍 ${[e.venue, e.neighborhood].filter(Boolean).join(', ').toUpperCase()}`, cx, y);
        y += 46;

        // category
        const emoji = resolveVibeEmoji(e.vibe);
        ctx.fillText(`${emoji} ${(e.vibe || 'EVENT').toUpperCase()}`, cx, y);
    }, []);

    // Redraw whenever the selection or fonts change.
    useEffect(() => {
        if (!fonts) return;
        chosen.forEach(e => {
            const c = canvasRefs.current[e.id];
            if (c) drawSlide(c, e, fonts);
        });
    }, [chosen, fonts, drawSlide]);

    const download = (e: KitEvent) => {
        const c = canvasRefs.current[e.id];
        if (!c) return;
        c.toBlob(blob => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const slug = (e.title || 'slide').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
            a.href = url;
            a.download = `${e.date}-${slug}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
    };

    const downloadAll = async () => {
        setBusy(true);
        for (const e of chosen) {
            download(e);
            await new Promise(r => setTimeout(r, 400)); // browsers throttle rapid-fire downloads
        }
        setBusy(false);
    };

    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const range = `${new Date(`${from}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(`${to}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    return (
        <div className="min-h-screen bg-cream px-6 py-10">
            <h1 className="font-space-grotesk text-[32px] font-bold text-ink">Carousel kit</h1>
            <p className="font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink/60 mt-1">
                {range} · {chosen.length} slides selected · {events.length} events in window
            </p>

            <div className="flex gap-3 mt-5">
                <button
                    onClick={downloadAll}
                    disabled={busy || !chosen.length}
                    className="rounded-full border border-black/40 px-5 py-2 font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink hover:bg-ink hover:text-cream transition-colors disabled:opacity-40"
                >
                    {busy ? 'Downloading…' : `Download all (${chosen.length})`}
                </button>
                <button
                    onClick={() => setSelected(new Set(events.filter(e => e.flyerUrl && e.title).map(e => e.id)))}
                    className="rounded-full border border-black/30 px-5 py-2 font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink/70 hover:border-black/60"
                >
                    Reset to flyers only
                </button>

                <div className="ml-auto flex items-center gap-2">
                    <span className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/50">Size</span>
                    {([['S', 130], ['M', 170], ['L', 240]] as const).map(([label, px]) => (
                        <button
                            key={label}
                            onClick={() => setTileSize(px)}
                            className={`rounded-full border px-3 py-1.5 font-space-mono text-[11px] uppercase tracking-[-0.44px] transition-colors ${
                                tileSize === px ? 'bg-ink text-cream border-ink' : 'border-black/30 text-ink/60 hover:border-black/60'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Everything in the window, so nothing is silently dropped. */}
            <div className="mt-8 flex flex-wrap gap-2">
                {events.map(e => {
                    const on = selected.has(e.id);
                    return (
                        <button
                            key={e.id}
                            onClick={() => toggle(e.id)}
                            title={e.flyerUrl ? 'Has a flyer' : 'No flyer — renders as a branded card'}
                            className={`rounded-full border px-3 py-1.5 font-space-mono text-[11px] uppercase tracking-[-0.44px] transition-colors ${
                                on ? 'bg-ink text-cream border-ink' : 'border-black/30 text-ink/60'
                            }`}
                        >
                            {e.flyerUrl ? '' : '○ '}{e.title || '(untitled)'}
                        </button>
                    );
                })}
            </div>

            {/* Contact-sheet density: the whole point is judging the set at a
                glance, so tiles pack full-width rather than capping at the
                feed's 3 columns (which only exists because the feed shares the
                screen with the map). */}
            <div
                className="mt-10 grid gap-4"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))` }}
            >
                {chosen.map(e => (
                    <button
                        key={e.id}
                        onClick={() => download(e)}
                        title={`Download ${e.title || 'slide'}`}
                        className="group relative block w-full text-left"
                    >
                        <canvas
                            ref={el => { canvasRefs.current[e.id] = el; }}
                            className="w-full rounded-[10px] border border-black/10 transition-transform duration-200 group-hover:-translate-y-0.5"
                            style={{ aspectRatio: `${W} / ${H}` }}
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[10px] bg-ink/85 px-2 py-1.5 text-center font-space-mono text-[10px] uppercase tracking-[-0.44px] text-cream opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                            Download PNG
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
