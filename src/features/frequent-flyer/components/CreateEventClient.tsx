'use client';

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { VIBES, VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';
import { formatEventDateTime } from '@/features/frequent-flyer/data/events';
import { submitEvent, generateVibeStylePublic } from '@/app/actions';

type VenueOption = { id: string; name: string; neighborhood: string | null };

const CANVAS_W = 400;
const CANVAS_H = 500;

/** Box that uploaded artwork is fitted into, preserving its own aspect ratio. */
const ART_MAX_W = 400;
const ART_MAX_H = 620;

/**
 * Export budget. Server actions carry the flyer as base64 in the request body,
 * and `next.config.mjs` sets no `bodySizeLimit`, so Next's 1MB default applies
 * — base64 inflates by a third, so the encoded image has to stay well under
 * that. Re-rendering through the canvas used to bound this by accident; now
 * that uploads keep their own dimensions it has to be deliberate.
 */
const EXPORT_MAX_EDGE = 1200;
/** Measured on the base64 string, because that is what actually travels in the
 *  request body — not the decoded image, which is a third smaller. Leaves ~300KB
 *  of headroom under the 1MB cap for the rest of the form. */
const EXPORT_MAX_PAYLOAD_BYTES = 700 * 1024;
const EXPORT_QUALITIES = [0.85, 0.7, 0.55, 0.4];

/**
 * Formats every current browser can decode. Deliberately not `image/*`:
 * that matched `image/heic`, which is what an iPhone camera produces and
 * what only Safari can read. Naming the list also makes iOS convert a HEIC
 * to JPEG on its way out of the photo picker, which is the fix rather than
 * the error message.
 */
const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

const MAX_FLYER_BYTES = 12 * 1024 * 1024;

/**
 * Render the canvas to a JPEG data URL that will fit in a server action.
 *
 * The multiplier is derived rather than fixed at 2, because the canvas is no
 * longer always 400×500 — uploaded artwork keeps its own shape, so a wide
 * flyer and a tall one need different scaling to land on the same long edge.
 * Quality steps down if a busy image still comes out too big; a submission
 * that silently exceeds the body limit is the exact failure mode we just spent
 * a fix removing.
 */
function exportFlyer(canvas: fabric.Canvas): string {
    const longest = Math.max(canvas.width || CANVAS_W, canvas.height || CANVAS_H);
    const multiplier = Math.max(1, Math.min(3, EXPORT_MAX_EDGE / longest));

    let out = '';
    for (const quality of EXPORT_QUALITIES) {
        out = canvas.toDataURL({ format: 'jpeg', quality, multiplier });
        if (out.length <= EXPORT_MAX_PAYLOAD_BYTES) return out;
    }
    return out;
}

/** Say which format failed. "Try another image" is not something anyone can act on,
 *  and HEIC is far and away the likeliest reason to land here. */
function unreadableImageMessage(file: File): string {
    const heic = /\.hei[cf]$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
    return heic
        ? "That's an iPhone HEIC photo, which this browser can't open. Set Settings → Camera → Formats → Most Compatible, or text the photo to yourself to get a JPEG."
        : "Couldn't read that image. A JPEG or PNG should work.";
}

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
    const [newVenueAddress, setNewVenueAddress] = useState('');
    const [venueOpen, setVenueOpen] = useState(false);

    const [hasFlyer, setHasFlyer] = useState(false);
    /** True when the canvas holds an uploaded flyer, which we leave untouched —
     *  no title, no date, no watermark, no crop. */
    const [isArtwork, setIsArtwork] = useState(false);
    const [uploadingFlyer, setUploadingFlyer] = useState(false);
    /** Kept apart from `error` so a flyer problem can sit next to the canvas
     *  rather than in the form column, where it was easy to miss. */
    const [flyerError, setFlyerError] = useState<string | null>(null);
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

    /**
     * Put finished artwork on the canvas and add nothing to it.
     *
     * The studio's whole job is composing a title, date and watermark over a
     * background — which is right when it generated that background, and wrong
     * when someone uploaded a flyer a designer already made. Those objects were
     * also undeletable: nothing listened for a delete key, and a phone has no
     * delete key to listen for, so on mobile they were stuck wherever they
     * landed. Two thirds of that text never survived the feed anyway — cards
     * are 1:1 `object-fit: cover` against a 4:5 canvas, so the watermark at
     * y≈456 of 500 was always cropped off.
     *
     * The canvas is resized to the artwork's own aspect ratio rather than
     * cover-cropping it into 4:5, because there is no longer any text that
     * needs a predictable box to sit in — and cropping a finished flyer to
     * make room for text we aren't drawing would be destroying it for nothing.
     */
    const drawArtwork = (img: fabric.FabricImage) => {
        if (!fabricCanvas) return;
        fabricCanvas.remove(...fabricCanvas.getObjects());

        const scale = Math.min(
            ART_MAX_W / (img.width || 1),
            ART_MAX_H / (img.height || 1),
        );
        const w = Math.max(1, Math.round((img.width || 1) * scale));
        const h = Math.max(1, Math.round((img.height || 1) * scale));

        fabricCanvas.setDimensions({ width: w, height: h });
        img.scaleToWidth(w);
        img.set({ originX: 'center', originY: 'center', left: w / 2, top: h / 2 });
        fabricCanvas.backgroundImage = img;
        fabricCanvas.backgroundColor = '#000';
        fabricCanvas.requestRenderAll();

        setIsArtwork(true);
        setHasFlyer(true);
    };

    const drawFlyer = (opts: {
        bgImage?: fabric.FabricImage;
        gradientColors?: string[];
        bgColor?: string;
        fontColor?: string;
    }) => {
        if (!fabricCanvas) return;
        fabricCanvas.remove(...fabricCanvas.getObjects());
        // A generated design composes against a known 4:5 box; an upload may
        // have left the canvas at its own shape.
        if (fabricCanvas.width !== CANVAS_W || fabricCanvas.height !== CANVAS_H) {
            fabricCanvas.setDimensions({ width: CANVAS_W, height: CANVAS_H });
        }
        setIsArtwork(false);

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

    /**
     * The iPhone camera writes HEIC by default and Chrome and Firefox cannot
     * decode it — Safari is the only browser that can. `accept="image/*"`
     * matched those files happily, so a .HEIC was picked, failed to decode,
     * and then nothing happened at all: `reader.onload` was an async function,
     * so the rejected `fromURL` became an unhandled promise rejection with no
     * error state attached to it. No preview, no message, `hasFlyer` left
     * false — and the form still submitted, quietly dropping the flyer.
     *
     * Prevention first: the accept list on the input names only formats a
     * browser can actually decode, which makes iOS transcode HEIC to JPEG as
     * it hands the file over, and greys the rest out in a desktop picker.
     * A file that gets through anyway now says why it failed.
     */
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Clearing it here means re-picking the same file fires `change` again,
        // so a second attempt after a failure isn't a dead click.
        e.target.value = '';
        if (!file) return;

        setFlyerError(null);

        if (file.size > MAX_FLYER_BYTES) {
            setFlyerError(
                `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — keep it under ${MAX_FLYER_BYTES / 1024 / 1024}MB.`,
            );
            return;
        }

        setUploadingFlyer(true);
        const reader = new FileReader();

        reader.onerror = () => {
            setUploadingFlyer(false);
            setFlyerError('Could not read that file. Try another image.');
        };

        reader.onload = async (ev) => {
            try {
                const dataUrl = ev.target?.result as string;
                const img = await fabric.FabricImage.fromURL(dataUrl);
                // fabric can resolve with a zero-sized image rather than throw.
                if (!img?.width || !img?.height) throw new Error('undecodable');
                drawArtwork(img);
            } catch {
                setFlyerError(unreadableImageMessage(file));
            } finally {
                setUploadingFlyer(false);
            }
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
                flyerBase64 = exportFlyer(fabricCanvas);
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
                    venueAddress: venueId ? undefined : newVenueAddress,
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
                        setVenueQuery(''); setVenueId(null); setNewVenueName(''); setNewVenueNeighborhood(''); setNewVenueAddress('');
                        setHasFlyer(false); setIsArtwork(false); setFlyerError(null);
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
                            <>
                                <div className="mt-3">
                                    <label className={labelClass}>Neighborhood (for the new venue)</label>
                                    <input className={inputClass} value={newVenueNeighborhood}
                                        onChange={e => setNewVenueNeighborhood(e.target.value)} placeholder="e.g. Echo Park" />
                                </div>
                                <div className="mt-3">
                                    <label className={labelClass}>Street address (optional)</label>
                                    <input className={inputClass} value={newVenueAddress}
                                        onChange={e => setNewVenueAddress(e.target.value)}
                                        placeholder="1710 N Hudson Ave, Los Angeles, CA 90028" />
                                    <p className="mt-1.5 font-space-mono text-[12px] leading-[1.5] text-black/50">
                                        Helps us put it on the map. We check every new venue before it goes live.
                                    </p>
                                </div>
                            </>
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
                    {isArtwork && (
                        <p className="font-space-mono text-[12px] leading-[1.5] text-black/60">
                            Your flyer goes up as-is — we won&apos;t add a title or date to it.
                            Generating a design replaces it.
                        </p>
                    )}
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
                        <label className={`flex-1 text-center font-space-mono uppercase text-[13px] tracking-[-0.5px] border border-black/40 rounded-full px-4 py-3 transition-colors ${
                            uploadingFlyer
                                ? 'opacity-50 cursor-wait'
                                : 'cursor-pointer hover:bg-black hover:text-cream'
                        }`}>
                            {uploadingFlyer ? 'Reading…' : 'Upload image'}
                            <input
                                type="file"
                                accept={ACCEPTED_IMAGE_TYPES}
                                className="hidden"
                                disabled={uploadingFlyer}
                                onChange={handleUpload}
                            />
                        </label>
                    </div>
                    {flyerError && (
                        <p className="font-space-mono text-[13px] leading-[1.5] text-red-600">{flyerError}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
