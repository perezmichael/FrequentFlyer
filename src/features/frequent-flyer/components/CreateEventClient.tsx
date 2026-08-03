'use client';

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { VIBES, VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';
import { formatEventDateTime } from '@/features/frequent-flyer/data/events';
import { submitEvent, generateVibeStylePublic } from '@/app/actions';

type VenueOption = { id: string; name: string; neighborhood: string | null };

const CANVAS_W = 400;
const CANVAS_H = 500;

function extractHexes(s: string): string[] {
    return s.match(/#[0-9a-fA-F]{3,8}/g) || [];
}

export default function CreateEventClient({ venues }: { venues: VenueOption[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);

    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [vibe, setVibe] = useState('');
    const [description, setDescription] = useState('');
    const [prompt, setPrompt] = useState('');

    // Venue selection: either an existing venue id, or a new free-text venue.
    const [venueQuery, setVenueQuery] = useState('');
    const [venueId, setVenueId] = useState<string | null>(null);
    const [newVenueName, setNewVenueName] = useState('');
    const [newVenueNeighborhood, setNewVenueNeighborhood] = useState('');
    const [venueOpen, setVenueOpen] = useState(false);

    const [hasFlyer, setHasFlyer] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // Initialize the flyer canvas once.
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: CANVAS_W,
            height: CANVAS_H,
            backgroundColor: '#1a1a1a',
            enableRetinaScaling: false,
        });
        const placeholder = new fabric.IText('YOUR FLYER', {
            left: CANVAS_W / 2,
            top: CANVAS_H / 2,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Courier New',
            fontSize: 28,
            fill: '#666',
            selectable: false,
        });
        canvas.add(placeholder);
        canvas.renderAll();
        setFabricCanvas(canvas);
        return () => {
            canvas.dispose();
            setFabricCanvas(null);
        };
    }, []);

    const drawFlyer = (opts: {
        bgImage?: fabric.FabricImage;
        gradientColors?: string[];
        bgColor?: string;
        fontColor?: string;
    }) => {
        if (!fabricCanvas) return;
        fabricCanvas.remove(...fabricCanvas.getObjects());

        if (opts.bgImage) {
            const img = opts.bgImage;
            const scale = Math.max(CANVAS_W / (img.width || 1), CANVAS_H / (img.height || 1));
            img.scale(scale);
            img.set({ originX: 'center', originY: 'center', left: CANVAS_W / 2, top: CANVAS_H / 2 });
            fabricCanvas.backgroundImage = img;
            fabricCanvas.backgroundColor = '#000';
        } else if (opts.gradientColors && opts.gradientColors.length >= 2) {
            fabricCanvas.backgroundImage = undefined;
            // Apply the gradient to the canvas background (covers the full
            // canvas without the center-origin offset a Rect object would add).
            fabricCanvas.backgroundColor = new fabric.Gradient({
                type: 'linear',
                coords: { x1: 0, y1: 0, x2: CANVAS_W, y2: CANVAS_H },
                colorStops: opts.gradientColors.map((c, i) => ({
                    offset: i / (opts.gradientColors!.length - 1), color: c,
                })),
            }) as unknown as string;
        } else {
            fabricCanvas.backgroundImage = undefined;
            fabricCanvas.backgroundColor = opts.bgColor || '#1a1a1a';
        }

        const fill = opts.fontColor || '#ffffff';
        const titleText = new fabric.Textbox((title || 'EVENT NAME').toUpperCase(), {
            left: 32, top: 40, originX: 'left', originY: 'top',
            fontFamily: 'Helvetica', fontWeight: 'bold',
            fontSize: 36, fill, width: CANVAS_W - 64,
        });
        const flyerDate = date
            ? formatEventDateTime(date, startTime || null, endTime || null)
            : 'DATE';
        const dateText = new fabric.IText(flyerDate, {
            left: 32, top: CANVAS_H - 80, originX: 'left', originY: 'top',
            fontFamily: 'Courier New', fontSize: 18, fill,
        });
        const watermark = new fabric.IText('frequentflyerla.com', {
            left: 32, top: CANVAS_H - 44, originX: 'left', originY: 'top',
            fontFamily: 'Courier New', fontSize: 13,
            fill, opacity: 0.7, selectable: false,
        });
        fabricCanvas.add(titleText, dateText, watermark);
        fabricCanvas.requestRenderAll();
        setHasFlyer(true);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Describe the vibe first to generate a design.');
            return;
        }
        setError(null);
        setGenerating(true);
        try {
            const style = await generateVibeStylePublic(prompt);
            const hexes = style.backgroundImage ? extractHexes(style.backgroundImage) : [];
            if (style.backgroundImage?.startsWith?.('data:image')) {
                const img = await fabric.FabricImage.fromURL(style.backgroundImage);
                drawFlyer({ bgImage: img, fontColor: style.fontColor });
            } else {
                drawFlyer({
                    gradientColors: hexes.length >= 2 ? hexes : undefined,
                    bgColor: style.backgroundColor,
                    fontColor: style.fontColor,
                });
            }
        } catch {
            setError('Could not generate a design. Try again.');
        }
        setGenerating(false);
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const dataUrl = ev.target?.result as string;
            const img = await fabric.FabricImage.fromURL(dataUrl);
            drawFlyer({ bgImage: img, fontColor: '#ffffff' });
        };
        reader.readAsDataURL(file);
    };

    const filteredVenues = venueQuery.trim()
        ? venues.filter(v => v.name.toLowerCase().includes(venueQuery.trim().toLowerCase())).slice(0, 8)
        : venues.slice(0, 8);
    const exactMatch = venues.some(v => v.name.toLowerCase() === venueQuery.trim().toLowerCase());

    const selectExisting = (v: VenueOption) => {
        setVenueId(v.id);
        setVenueQuery(v.name);
        setNewVenueName('');
        setNewVenueNeighborhood('');
        setVenueOpen(false);
    };

    const selectNew = () => {
        setVenueId(null);
        setNewVenueName(venueQuery.trim());
        setVenueOpen(false);
    };

    const handleSubmit = async () => {
        setError(null);
        if (!title.trim()) return setError('Event name is required.');
        if (!date) return setError('Pick a date.');
        if (!startTime) return setError('Set a start time.');
        if (!vibe) return setError('Choose a vibe.');
        if (!venueId && !newVenueName.trim()) return setError('Pick or add a venue.');

        setSubmitting(true);
        try {
            let flyerBase64: string | undefined;
            if (hasFlyer && fabricCanvas) {
                flyerBase64 = fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 2 });
            }
            await submitEvent(
                {
                    title,
                    date,
                    startTime,
                    endTime,
                    vibe,
                    description,
                    venueId: venueId ?? undefined,
                    venueName: venueId ? undefined : newVenueName,
                    venueNeighborhood: venueId ? undefined : newVenueNeighborhood,
                },
                flyerBase64,
            );
            setDone(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
        }
        setSubmitting(false);
    };

    const inputClass = 'w-full bg-white/60 border border-black/20 rounded-lg px-4 py-3 text-black placeholder:text-black/40 focus:outline-none focus:border-black/60 font-space-grotesk';
    const labelClass = 'block font-space-mono uppercase text-[13px] tracking-[-0.5px] text-black/70 mb-2';

    if (done) {
        return (
            <div className="page-container pt-[140px] pb-20 max-w-[640px] text-center">
                <h1 className="font-space-grotesk text-[40px] font-bold text-black mb-4">You&apos;re on the list.</h1>
                <p className="font-space-mono text-black/70 mb-8">
                    Your event was submitted and is now in review. Once approved it&apos;ll show up across the site.
                </p>
                <button
                    onClick={() => {
                        setDone(false);
                        setTitle(''); setDate(''); setStartTime(''); setEndTime(''); setVibe(''); setDescription(''); setPrompt('');
                        setVenueQuery(''); setVenueId(null); setNewVenueName(''); setNewVenueNeighborhood('');
                        setHasFlyer(false);
                    }}
                    className="font-space-mono uppercase text-[14px] tracking-[-0.5px] border border-black/40 rounded-full px-6 py-3 hover:bg-black hover:text-cream transition-colors"
                >
                    + Create another
                </button>
            </div>
        );
    }

    return (
        <div className="page-container pt-[140px] pb-20">
            <h1 className="font-space-grotesk text-[44px] leading-none font-bold text-black mb-2">Create an event</h1>
            <p className="font-space-mono text-black/60 text-[14px] mb-10">
                Submit your event to Frequent Flyer. It&apos;ll go live after a quick review.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-12 items-start">
                {/* Form */}
                <div className="flex flex-col gap-6 max-w-[560px]">
                    <div>
                        <label className={labelClass}>Event name</label>
                        <input className={inputClass} value={title} maxLength={200}
                            onChange={e => setTitle(e.target.value)} placeholder="Untitled event" />
                    </div>

                    <div>
                        <label className={labelClass}>Date</label>
                        <input type="date" className={inputClass} value={date}
                            onChange={e => setDate(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Start time</label>
                            <input type="time" className={inputClass} value={startTime}
                                onChange={e => setStartTime(e.target.value)} />
                        </div>
                        <div>
                            <label className={labelClass}>End time <span className="text-black/40">(optional)</span></label>
                            <input type="time" className={inputClass} value={endTime}
                                onChange={e => setEndTime(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Vibe</label>
                        <select className={inputClass} value={vibe} onChange={e => setVibe(e.target.value)}>
                            <option value="">Select a vibe…</option>
                            {VIBE_KEYS.map(k => <option key={k} value={k}>{VIBES[k]}</option>)}
                        </select>
                    </div>

                    {/* Venue: pick existing or add new */}
                    <div className="relative">
                        <label className={labelClass}>Venue / location</label>
                        <input
                            className={inputClass}
                            value={venueQuery}
                            placeholder="Search venues or type a new one…"
                            onChange={e => { setVenueQuery(e.target.value); setVenueId(null); setNewVenueName(''); setVenueOpen(true); }}
                            onFocus={() => setVenueOpen(true)}
                            onBlur={() => setTimeout(() => setVenueOpen(false), 150)}
                        />
                        {venueOpen && (filteredVenues.length > 0 || (venueQuery.trim() && !exactMatch)) && (
                            <div className="absolute z-20 mt-1 w-full bg-white border border-black/20 rounded-lg shadow-lg overflow-hidden">
                                {filteredVenues.map(v => (
                                    <button key={v.id} type="button" onMouseDown={() => selectExisting(v)}
                                        className="block w-full text-left px-4 py-2.5 font-space-grotesk text-black hover:bg-black/5">
                                        {v.name}{v.neighborhood ? <span className="text-black/40"> · {v.neighborhood}</span> : null}
                                    </button>
                                ))}
                                {venueQuery.trim() && !exactMatch && (
                                    <button type="button" onMouseDown={selectNew}
                                        className="block w-full text-left px-4 py-2.5 font-space-mono text-[13px] uppercase tracking-[-0.5px] text-black bg-black/5 hover:bg-black/10">
                                        + Add &ldquo;{venueQuery.trim()}&rdquo; as a new venue
                                    </button>
                                )}
                            </div>
                        )}
                        {newVenueName && (
                            <div className="mt-3">
                                <label className={labelClass}>Neighborhood (for the new venue)</label>
                                <input className={inputClass} value={newVenueNeighborhood}
                                    onChange={e => setNewVenueNeighborhood(e.target.value)} placeholder="e.g. Echo Park" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea className={`${inputClass} h-28 resize-none`} value={description} maxLength={1000}
                            onChange={e => setDescription(e.target.value)} placeholder="What's the event about?" />
                    </div>

                    {error && <p className="font-space-mono text-[13px] text-red-600">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="font-space-mono uppercase text-[15px] tracking-[-0.5px] bg-black text-cream rounded-full px-8 py-4 hover:opacity-80 transition-opacity disabled:opacity-50 self-start"
                    >
                        {submitting ? 'Submitting…' : 'Submit event'}
                    </button>
                </div>

                {/* Flyer studio */}
                <div className="flex flex-col gap-4">
                    <label className={labelClass}>Flyer (optional)</label>
                    <div className="flyer-canvas-wrap bg-black/5 border border-black/10 rounded-xl p-4 flex justify-center">
                        <canvas ref={canvasRef} className="rounded-lg shadow-lg" />
                    </div>
                    <textarea
                        className={`${inputClass} h-20 resize-none`}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe the aesthetic… e.g. 'moody neon synthwave'"
                    />
                    <div className="flex gap-3">
                        <button onClick={handleGenerate} disabled={generating}
                            className="flex-1 font-space-mono uppercase text-[13px] tracking-[-0.5px] border border-black/40 rounded-full px-4 py-3 hover:bg-black hover:text-cream transition-colors disabled:opacity-50">
                            {generating ? 'Generating…' : '✨ Generate design'}
                        </button>
                        <label className="flex-1 cursor-pointer text-center font-space-mono uppercase text-[13px] tracking-[-0.5px] border border-black/40 rounded-full px-4 py-3 hover:bg-black hover:text-cream transition-colors">
                            Upload image
                            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
