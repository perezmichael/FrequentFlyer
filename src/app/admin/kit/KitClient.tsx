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
    sourceUrl: string | null;
    vibeScore: number | null;
}

/** Selection modes. "Suggested" is the only one that curates. */
type Mode = 'suggested' | 'flyers' | 'all';

/** Scores at or above this read as on-manifesto rather than merely real. */
const SUGGEST_MIN_SCORE = 7;

function pickFor(mode: Mode, events: KitEvent[]): KitEvent[] {
    if (mode === 'all') return events.filter(e => e.title);
    if (mode === 'flyers') return events.filter(e => e.flyerUrl && e.title);
    return events.filter(
        e => e.flyerUrl && e.title && (e.vibeScore ?? 0) >= SUGGEST_MIN_SCORE,
    );
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

/** "MONDAY AUG.3" — matches the caption's own date styling. */
function dayHeading(date: string): string {
    const d = new Date(`${date}T00:00:00`);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    return `${weekday} ${month}.${d.getDate()}`.toUpperCase();
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

export default function KitClient({ events, from, to, activeDays }: {
    events: KitEvent[]; from: string; to: string; activeDays: number | null;
}) {
    // Opens on Suggested: scored against vibedoc.md, not merely "has artwork".
    const [mode, setMode] = useState<Mode>('suggested');
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(pickFor('suggested', events).map(e => e.id))
    );

    const applyMode = (m: Mode) => {
        setMode(m);
        setSelected(new Set(pickFor(m, events).map(e => e.id)));
    };

    const toggleVenue = (name: string) => setMutedVenues(prev => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name); else next.add(name);
        return next;
    });
    const [fonts, setFonts] = useState<{ grotesk: string; mono: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const [tileSize, setTileSize] = useState(170);
    // Venue is the unit you actually shape a carousel in — dropping five
    // CINEMA LANDs at once, not clicking five chips.
    const [mutedVenues, setMutedVenues] = useState<Set<string>>(new Set());
    const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

    useEffect(() => {
        const styles = getComputedStyle(document.body);
        const grotesk = styles.getPropertyValue('--font-space-grotesk').trim() || 'sans-serif';
        const mono = styles.getPropertyValue('--font-space-mono').trim() || 'monospace';
        document.fonts.ready.then(() => setFonts({ grotesk, mono }));
    }, []);

    const venues = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const e of events) if (e.venue) counts[e.venue] = (counts[e.venue] || 0) + 1;
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [events]);

    const visible = useMemo(
        () => events.filter(e => !mutedVenues.has(e.venue)),
        [events, mutedVenues],
    );

    // A muted venue drops out of the set even if the mode selected it.
    const chosen = useMemo(
        () => visible.filter(e => selected.has(e.id)),
        [visible, selected]
    );

    // Grouped by date so the set reads as a week rather than a pile. Only days
    // that actually have slides get a heading.
    const byDay = useMemo(() => {
        const groups: Record<string, KitEvent[]> = {};
        for (const e of chosen) (groups[e.date] = groups[e.date] || []).push(e);
        return Object.keys(groups).sort().map(date => ({ date, items: groups[date] }));
    }, [chosen]);

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
                {range} · {chosen.length} slides selected · {visible.length} of {events.length} events in play
            </p>

            {/* A flyer often lands weeks before the date. Without this the kit
                could only ever see the coming weekend. */}
            <div className="flex items-center gap-2 mt-5">
                <span className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/50">Window</span>
                {([['Weekend', null], ['7 days', 7], ['14 days', 14], ['30 days', 30]] as const).map(([label, d]) => {
                    const on = activeDays === d;
                    return (
                        <a
                            key={label}
                            href={d ? `/admin/kit?days=${d}` : '/admin/kit'}
                            className={`rounded-full border px-3 py-1.5 font-space-mono text-[11px] uppercase tracking-[-0.44px] no-underline transition-colors ${
                                on ? 'bg-ink text-cream border-ink' : 'border-black/30 text-ink/60 hover:border-black/60'
                            }`}
                        >
                            {label}
                        </a>
                    );
                })}
            </div>

            <div className="flex gap-3 mt-4">
                <button
                    onClick={downloadAll}
                    disabled={busy || !chosen.length}
                    className="rounded-full border border-black/40 px-5 py-2 font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink hover:bg-ink hover:text-cream transition-colors disabled:opacity-40"
                >
                    {busy ? 'Downloading…' : `Download all (${chosen.length})`}
                </button>
                {/* Suggested is the only one that curates. Flyers is what this
                    page used to do by default — it picked 46 of 50 events one
                    weekend and averaged a lower vibe score than the four it
                    dropped, so it was filtering, not choosing. */}
                {([
                    ['suggested', 'Suggested', `on-manifesto (score ${SUGGEST_MIN_SCORE}+) with a flyer`],
                    ['flyers', 'Flyers', 'anything with artwork'],
                    ['all', 'All', 'everything in the window'],
                ] as const).map(([m, label, hint]) => (
                    <button
                        key={m}
                        onClick={() => applyMode(m)}
                        title={hint}
                        className={`rounded-full border px-4 py-2 font-space-mono text-[13px] uppercase tracking-[-0.44px] transition-colors ${
                            mode === m ? 'bg-ink text-cream border-ink' : 'border-black/30 text-ink/70 hover:border-black/60'
                        }`}
                    >
                        {label} ({pickFor(m, visible).length})
                    </button>
                ))}

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

            {/* Venues first: the coarse dial. Muting one removes its events
                from every mode at once. */}
            <div className="mt-8">
                <div className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/50 mb-2">
                    Venues — click to mute
                </div>
                <div className="flex flex-wrap gap-2">
                    {venues.map(([name, count]) => {
                        const muted = mutedVenues.has(name);
                        return (
                            <button
                                key={name}
                                onClick={() => toggleVenue(name)}
                                className={`rounded-full border px-3 py-1.5 font-space-mono text-[11px] uppercase tracking-[-0.44px] transition-colors ${
                                    muted
                                        ? 'border-black/20 text-ink/30 line-through'
                                        : 'border-black/40 text-ink hover:border-black/70'
                                }`}
                            >
                                {name} · {count}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Per-event control, scoped to the venues still in play, behind a
                disclosure — at the 30-day window this is 269 chips. */}
            <details className="mt-5">
                <summary className="cursor-pointer font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/50">
                    Individual events ({visible.length}) — click to add or drop
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                    {visible.map(e => {
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
                                {e.vibeScore !== null && (
                                    <span className={on ? 'text-cream/55' : 'text-ink/35'}> · {e.vibeScore}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </details>

            {/* Contact-sheet density: the whole point is judging the set at a
                glance, so tiles pack full-width rather than capping at the
                feed's 3 columns (which only exists because the feed shares the
                screen with the map). */}
            {byDay.map(({ date, items }) => (
              <section key={date} className="mt-10">
                <h2 className="font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink border-b border-black/10 pb-2 mb-4">
                    {dayHeading(date)}
                    <span className="text-ink/40"> · {items.length} {items.length === 1 ? 'slide' : 'slides'}</span>
                </h2>
                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${tileSize}px, 1fr))` }}
                >
                {items.map(e => (
                    <div key={e.id} className="flex flex-col gap-2">
                        <canvas
                            ref={el => { canvasRefs.current[e.id] = el; }}
                            className="w-full rounded-[10px] border border-black/10"
                            style={{ aspectRatio: `${W} / ${H}` }}
                        />
                        <button
                            onClick={() => download(e)}
                            className="rounded-full border border-black/40 px-3 py-1.5 font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink transition-colors hover:bg-ink hover:text-cream"
                        >
                            Download PNG
                        </button>
                        {/* Open the event's own page to confirm the flyer and
                            the listed time before this goes out. A plain link
                            under the CTA — a hover-only corner badge was too
                            small a target. */}
                        <div className="flex items-center justify-center gap-2 font-space-mono text-[10px] uppercase tracking-[-0.44px]">
                            {e.vibeScore !== null && (
                                <span className="text-ink/45" title="Vibe score against vibedoc.md">
                                    {e.vibeScore}/10
                                </span>
                            )}
                            {e.isPick && <span className="text-brand" title="An FF Pick">★</span>}
                            {e.sourceUrl && (
                                <a
                                    href={e.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand underline underline-offset-2"
                                >
                                    source ↗
                                </a>
                            )}
                        </div>
                    </div>
                ))}
                </div>
              </section>
            ))}
        </div>
    );
}
