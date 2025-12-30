'use client';

import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { VIBES, VIBE_KEYS } from '@/features/frequent-flyer/data/vibes';
import { publishEvent, generateVibeStyle } from '@/app/actions';

export default function CreatorStudio() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [loading, setLoading] = useState(false);

    // Form State
    const [eventData, setEventData] = useState({
        title: 'New Event',
        date: '',
        venue: '',
        vibe: '',
        prompt: 'A brutalist monochrome terminal design'
    });

    // Initialize Canvas
    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Fabric Canvas
        // We use a local variable 'canvas' to ensure the cleanup function
        // closes over the correct instance, avoiding stale state issues in Strict Mode.
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: 400, // Scaled down view
            height: 500,
            backgroundColor: '#ffffff'
        });

        setFabricCanvas(canvas);

        // Initial Text
        const text = new fabric.IText('EVENT NAME', {
            left: 50,
            top: 50,
            fontFamily: 'Helvetica',
            fill: '#000',
            fontSize: 40
        });

        const dateText = new fabric.IText('DATE & TIME', {
            left: 50,
            top: 100,
            fontSize: 24,
            fontFamily: 'Helvetica'
        });

        canvas.add(text, dateText);
        canvas.renderAll();

        // Cleanup
        return () => {
            canvas.dispose();
            setFabricCanvas(null);
        };
    }, []); // Run once on mount

    // Handle Text Updates
    const updateCanvasText = (key: string, value: string) => {
        setEventData(prev => ({ ...prev, [key]: value }));

        if (!fabricCanvas) return;

        // Simple logic: Find text object and update (In reality you'd track IDs)
    };

    const handleGenerateVibe = async () => {
        setLoading(true);
        try {
            // Call Server Action
            const style = await generateVibeStyle(eventData.prompt);

            if (fabricCanvas) {
                // Apply background
                if (style.backgroundImage) {
                    // Check if it's a data URI (image) or gradient
                    if (style.backgroundImage.startsWith('url(') || style.backgroundImage.startsWith('linear-') || style.backgroundImage.startsWith('radial-')) {
                        // It's a CSS gradient or URL string, basic apply
                        // Fabric doesn't support CSS gradients natively easily without pattern, 
                        // so we might need to parse.
                        // But if Gemini returns a base64 Data URI in the JSON as requested:
                        // "backgroundImage": "data:image/jpeg;base64,..."

                        if (style.backgroundImage.startsWith('data:image')) {
                            fabric.FabricImage.fromURL(style.backgroundImage).then((img) => {
                                // Scale image to cover canvas
                                // Simple logic: cover
                                const scale = Math.max(
                                    (fabricCanvas.width || 400) / (img.width || 1),
                                    (fabricCanvas.height || 500) / (img.height || 1)
                                );

                                img.scale(scale);
                                img.set({
                                    originX: 'center',
                                    originY: 'center',
                                    left: (fabricCanvas.width || 400) / 2,
                                    top: (fabricCanvas.height || 500) / 2
                                });

                                fabricCanvas.backgroundImage = img;
                                fabricCanvas.requestRenderAll();
                            });
                        } else {
                            // Fallback for CSS string, just set backgroundColor if simple
                            fabricCanvas.backgroundColor = style.backgroundColor || '#000';
                        }
                    } else if (style.backgroundImage.startsWith('data:image')) {
                        // Direct data URI
                        fabric.FabricImage.fromURL(style.backgroundImage).then((img) => {
                            const scale = Math.max(
                                (fabricCanvas.width || 400) / (img.width || 1),
                                (fabricCanvas.height || 500) / (img.height || 1)
                            );

                            img.scale(scale);
                            img.set({
                                originX: 'center',
                                originY: 'center',
                                left: (fabricCanvas.width || 400) / 2,
                                top: (fabricCanvas.height || 500) / 2
                            });

                            fabricCanvas.backgroundImage = img;
                            fabricCanvas.requestRenderAll();
                        });
                    }
                } else if (style.backgroundColor) {
                    fabricCanvas.backgroundColor = style.backgroundColor;
                }

                // Add a "Produced by Frequent Flyer" watermark
                const watermark = new fabric.IText('frequentflyer.la', {
                    fontSize: 14,
                    fontFamily: 'Courier New',
                    fill: style.fontColor || '#333',
                    left: (fabricCanvas.width || 400) - 150,
                    top: (fabricCanvas.height || 500) - 30,
                    originX: 'left',
                    editable: false
                });

                fabricCanvas.add(watermark);
                fabricCanvas.requestRenderAll();
            }
        } catch (error) {
            console.error('Vibe Check Failed:', error);
            alert('Could not generate vibe style.');
        }
        setLoading(false);
    };

    const handlePublish = async () => {
        if (!fabricCanvas) return;
        setLoading(true);

        try {
            // 1. Get Data URL (Fabric v6+ requires multiplier)
            const dataUrl = fabricCanvas.toDataURL({ format: 'jpeg', quality: 0.8, multiplier: 1 });

            // 2. Publish via Server Action
            await publishEvent(eventData, dataUrl);
            alert('Event Published to Map! 🚀');
        } catch (error) {
            console.error(error);
            alert('Error publishing: ' + error);
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Controls */}
            <div className="w-1/3 p-6 border-r border-gray-200 bg-white overflow-y-auto">
                <h1 className="text-2xl font-bold mb-6">🎨 Creator Studio</h1>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">One-Link (Quick Fill)</label>
                        <div className="flex gap-2">
                            <input className="border p-2 w-full rounded" placeholder="Paste IG or LAist link..." />
                            <button className="bg-purple-100 text-purple-700 px-3 rounded text-sm font-bold">✨ Magic</button>
                        </div>
                    </div>

                    <hr className="my-4" />

                    <div>
                        <label className="block text-sm font-bold mb-1">Event Name</label>
                        <input
                            value={eventData.title}
                            onChange={e => updateCanvasText('title', e.target.value)}
                            className="border p-2 w-full rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Date</label>
                        <input
                            type="datetime-local"
                            value={eventData.date}
                            onChange={e => updateCanvasText('date', e.target.value)}
                            className="border p-2 w-full rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Venue</label>
                        <input
                            value={eventData.venue}
                            onChange={e => updateCanvasText('venue', e.target.value)}
                            className="border p-2 w-full rounded"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-1">Vibe Category</label>
                        <select
                            value={eventData.vibe}
                            onChange={e => setEventData({ ...eventData, vibe: e.target.value })}
                            className="border p-2 w-full rounded"
                        >
                            <option value="">Select Vibe...</option>
                            {VIBE_KEYS.map(k => <option key={k} value={k}>{VIBES[k]}</option>)}
                        </select>
                    </div>

                    <hr className="my-4" />

                    <div>
                        <label className="block text-sm font-bold mb-1">Vibe Engine (AI Design)</label>
                        <textarea
                            value={eventData.prompt}
                            onChange={e => setEventData({ ...eventData, prompt: e.target.value })}
                            className="border p-2 w-full rounded h-24 text-sm"
                            placeholder="Describe the aesthetic..."
                        />
                        <button
                            onClick={handleGenerateVibe}
                            disabled={loading}
                            className="mt-2 w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 transition"
                        >
                            {loading ? 'Generating...' : '✨ Generate Flyer Design'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Canvas Preview */}
            <div className="flex-1 bg-gray-100 flex items-center justify-center p-8">
                <div className="shadow-2xl border-8 border-white bg-white">
                    <canvas ref={canvasRef} />
                </div>
            </div>

            {/* Action Bar */}
            <div className="absolute top-4 right-4 flex gap-2">
                <button className="bg-white text-gray-800 px-4 py-2 rounded shadow font-bold hover:bg-gray-50">Save Draft</button>
                <button onClick={handlePublish} className="bg-black text-white px-6 py-2 rounded shadow font-bold hover:bg-gray-800">Publish to Map 🚀</button>
            </div>
        </div>
    );
}
