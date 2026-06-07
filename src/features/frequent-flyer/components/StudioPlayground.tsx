'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

/**
 * Studio Playground — an interaction-craft sandbox for the flyer editor.
 *
 * This is intentionally NOT wired to the event-submission flow. It's the place
 * to push the *feel* of direct manipulation: branded transform controls and
 * Figma-style snapping with alignment guides. Once the interactions feel right
 * here they get folded back into the real /create studio.
 */

// Brand tokens (kept in sync with design/tokens.ts + globals.css).
const CREAM = '#FFFAEB';
const INK = '#1a1a1a';
const BRAND = '#C2371B';

const CANVAS_W = 460;
const CANVAS_H = 575; // 4:5-ish flyer proportion
const SNAP = 6; // px threshold for snapping
const MONO = "'Space Mono', ui-monospace, monospace";

type Guide = { orient: 'v' | 'h'; pos: number };

/**
 * Draw the rotation grip as a small brand-brick disc with a cream rim — the
 * signature "designed control" detail that replaces fabric's default square.
 */
function renderRotateGrip(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    _styleOverride: unknown,
    _fabricObject: fabric.FabricObject,
) {
    const r = 7;
    ctx.save();
    ctx.translate(left, top);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2, false);
    ctx.fillStyle = BRAND;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = CREAM;
    ctx.stroke();
    ctx.restore();
}

/** Apply the branded control styling to a single fabric object. */
function brandObject(obj: fabric.FabricObject) {
    obj.set({
        transparentCorners: false,
        cornerColor: CREAM,
        cornerStrokeColor: INK,
        cornerStyle: 'circle',
        cornerSize: 11,
        borderColor: 'rgba(26,26,26,0.55)',
        borderScaleFactor: 1.25,
        padding: 4,
        borderOpacityWhenMoving: 1,
    });
    // Branded rotate grip (guard in case controls aren't present yet).
    const mtr = obj.controls?.mtr;
    if (mtr) {
        mtr.render = renderRotateGrip;
        mtr.offsetY = -34;
    }
}

export default function StudioPlayground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fcRef = useRef<fabric.Canvas | null>(null);
    const guidesRef = useRef<Guide[]>([]);
    const [ready, setReady] = useState(false);

    // ---- Canvas setup -------------------------------------------------------
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            width: CANVAS_W,
            height: CANVAS_H,
            backgroundColor: CREAM,
            selectionColor: 'rgba(194,55,27,0.10)',
            selectionBorderColor: BRAND,
            selectionLineWidth: 1,
            preserveObjectStacking: true,
        });
        fcRef.current = canvas;

        const add = (obj: fabric.FabricObject) => {
            brandObject(obj);
            canvas.add(obj);
        };

        // --- Seed a flyer-ish composition so snapping is demonstrable -------
        // fabric v7 defaults originX/originY to 'center' — anchor these to
        // top-left so the left/top values mean what they look like.
        const headline = new fabric.Textbox('WAREHOUSE\nPARTY', {
            left: 36,
            top: 56,
            originX: 'left',
            originY: 'top',
            width: CANVAS_W - 72,
            fontFamily: MONO,
            fontWeight: 'bold',
            fontSize: 46,
            lineHeight: 1.0,
            fill: INK,
            charSpacing: -40,
        });
        const accent = new fabric.Rect({
            left: 36,
            top: 196,
            originX: 'left',
            originY: 'top',
            width: 96,
            height: 8,
            fill: BRAND,
        });
        const date = new fabric.IText('FRI · JUN 6 · 10PM', {
            left: 36,
            top: CANVAS_H - 96,
            originX: 'left',
            originY: 'top',
            fontFamily: MONO,
            fontSize: 17,
            fill: INK,
            charSpacing: -20,
        });
        const venue = new fabric.IText('THE ECHO · ECHO PARK', {
            left: 36,
            top: CANVAS_H - 64,
            originX: 'left',
            originY: 'top',
            fontFamily: MONO,
            fontSize: 14,
            fill: INK,
            opacity: 0.65,
            charSpacing: -20,
        });

        add(headline);
        add(accent);
        add(date);
        add(venue);
        canvas.requestRenderAll();

        // Re-render once the brand font actually loads so metrics are correct.
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            document.fonts.ready.then(() => canvas.requestRenderAll());
        }

        // ---- Snapping -------------------------------------------------------
        const onMoving = (e: { target?: fabric.FabricObject }) => {
            const obj = e.target;
            if (!obj) return;
            obj.setCoords();
            const r = obj.getBoundingRect();
            const oL = r.left;
            const oR = r.left + r.width;
            const oCX = r.left + r.width / 2;
            const oT = r.top;
            const oB = r.top + r.height;
            const oCY = r.top + r.height / 2;

            // Snap targets: canvas edges + center, then every other object.
            const vTargets = [0, CANVAS_W / 2, CANVAS_W];
            const hTargets = [0, CANVAS_H / 2, CANVAS_H];
            for (const o of canvas.getObjects()) {
                if (o === obj) continue;
                const b = o.getBoundingRect();
                vTargets.push(b.left, b.left + b.width / 2, b.left + b.width);
                hTargets.push(b.top, b.top + b.height / 2, b.top + b.height);
            }

            const guides: Guide[] = [];

            // Vertical (x) snapping — try left/center/right edges.
            let dx = 0;
            outerX: for (const t of vTargets) {
                for (const val of [oL, oCX, oR]) {
                    if (Math.abs(val - t) <= SNAP) {
                        dx = t - val;
                        guides.push({ orient: 'v', pos: t });
                        break outerX;
                    }
                }
            }
            // Horizontal (y) snapping — try top/center/bottom edges.
            let dy = 0;
            outerY: for (const t of hTargets) {
                for (const val of [oT, oCY, oB]) {
                    if (Math.abs(val - t) <= SNAP) {
                        dy = t - val;
                        guides.push({ orient: 'h', pos: t });
                        break outerY;
                    }
                }
            }

            if (dx) obj.set('left', (obj.left ?? 0) + dx);
            if (dy) obj.set('top', (obj.top ?? 0) + dy);
            if (dx || dy) obj.setCoords();
            guidesRef.current = guides;
        };

        const clearGuides = () => {
            if (guidesRef.current.length) {
                guidesRef.current = [];
                canvas.requestRenderAll();
            }
        };

        // Draw guides on the main context after each render; they persist for a
        // frame and get redrawn continuously while dragging.
        const onAfterRender = () => {
            const guides = guidesRef.current;
            if (!guides.length) return;
            const ctx = canvas.contextContainer;
            if (!ctx) return;
            // The lower-canvas backing store is scaled by devicePixelRatio when
            // retina scaling is on, so map our logical guide coords into it.
            const retina = canvas.getRetinaScaling();
            ctx.save();
            ctx.setTransform(retina, 0, 0, retina, 0, 0);
            ctx.strokeStyle = BRAND;
            ctx.lineWidth = 1;
            guides.forEach((g) => {
                ctx.beginPath();
                if (g.orient === 'v') {
                    ctx.moveTo(g.pos, 0);
                    ctx.lineTo(g.pos, CANVAS_H);
                } else {
                    ctx.moveTo(0, g.pos);
                    ctx.lineTo(CANVAS_W, g.pos);
                }
                ctx.stroke();
            });
            ctx.restore();
        };

        canvas.on('object:moving', onMoving);
        canvas.on('after:render', onAfterRender);
        canvas.on('mouse:up', clearGuides);
        canvas.on('object:modified', clearGuides);
        canvas.on('selection:cleared', clearGuides);

        setReady(true);

        return () => {
            canvas.dispose();
            fcRef.current = null;
        };
    }, []);

    // ---- Toolbar actions ----------------------------------------------------
    const popIn = useCallback((canvas: fabric.Canvas, obj: fabric.FabricObject) => {
        obj.set({ scaleX: 0.85, scaleY: 0.85, opacity: 0 });
        obj.animate(
            { scaleX: 1, scaleY: 1, opacity: 1 },
            {
                duration: 220,
                easing: fabric.util.ease.easeOutCubic,
                onChange: () => canvas.requestRenderAll(),
            },
        );
    }, []);

    const place = useCallback(
        (obj: fabric.FabricObject) => {
            const canvas = fcRef.current;
            if (!canvas) return;
            brandObject(obj);
            obj.set({
                left: CANVAS_W / 2,
                top: CANVAS_H / 2,
                originX: 'center',
                originY: 'center',
            });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            popIn(canvas, obj);
        },
        [popIn],
    );

    const addHeadline = () =>
        place(
            new fabric.Textbox('HEADLINE', {
                width: 280,
                fontFamily: MONO,
                fontWeight: 'bold',
                fontSize: 40,
                fill: INK,
                charSpacing: -40,
                textAlign: 'center',
            }),
        );

    const addLabel = () =>
        place(
            new fabric.IText('LABEL TEXT', {
                fontFamily: MONO,
                fontSize: 16,
                fill: INK,
                charSpacing: -20,
            }),
        );

    const addBox = () =>
        place(new fabric.Rect({ width: 120, height: 120, fill: BRAND }));

    const deleteActive = useCallback(() => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const actives = canvas.getActiveObjects();
        if (!actives.length) return;
        actives.forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }, []);

    // ---- Keyboard: nudge + delete ------------------------------------------
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const canvas = fcRef.current;
            if (!canvas) return;
            const active = canvas.getActiveObject();
            if (!active) return;
            // Don't hijack keys while editing text.
            if ((active as fabric.IText).isEditing) return;

            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                deleteActive();
                return;
            }

            const step = e.shiftKey ? 10 : 1;
            let moved = true;
            switch (e.key) {
                case 'ArrowLeft':
                    active.set('left', (active.left ?? 0) - step);
                    break;
                case 'ArrowRight':
                    active.set('left', (active.left ?? 0) + step);
                    break;
                case 'ArrowUp':
                    active.set('top', (active.top ?? 0) - step);
                    break;
                case 'ArrowDown':
                    active.set('top', (active.top ?? 0) + step);
                    break;
                default:
                    moved = false;
            }
            if (moved) {
                e.preventDefault();
                active.setCoords();
                canvas.requestRenderAll();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [deleteActive]);

    // ---- Chrome -------------------------------------------------------------
    const toolBtn =
        'font-space-mono uppercase text-[12px] tracking-[-0.44px] border border-black/40 rounded-full px-4 py-2 hover:bg-black hover:text-[#FFFAEB] transition-colors cursor-pointer disabled:opacity-40';

    return (
        <div className="min-h-screen bg-cream pt-[100px]">
            <div className="page-container py-10">
                <div className="mb-1 flex items-baseline gap-3">
                    <h1 className="font-space-grotesk text-[40px] leading-none font-bold text-black">
                        Studio
                    </h1>
                    <span className="font-space-mono uppercase text-[12px] tracking-[-0.44px] text-brand">
                        playground
                    </span>
                </div>
                <p className="font-space-mono text-black/55 text-[13px] mb-8">
                    Drag elements to snap · arrows nudge (⇧ = 10px) · ⌫ deletes · grab the brick
                    grip to rotate
                </p>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Toolbar */}
                    <div className="flex flex-row lg:flex-col gap-3 flex-wrap">
                        <button className={toolBtn} onClick={addHeadline} disabled={!ready}>
                            + Headline
                        </button>
                        <button className={toolBtn} onClick={addLabel} disabled={!ready}>
                            + Label
                        </button>
                        <button className={toolBtn} onClick={addBox} disabled={!ready}>
                            + Box
                        </button>
                        <button className={toolBtn} onClick={deleteActive} disabled={!ready}>
                            Delete
                        </button>
                    </div>

                    {/* Canvas stage */}
                    <div className="flex-1 flex justify-center">
                        <div
                            className="bg-cream"
                            style={{
                                boxShadow:
                                    '0 1px 0 rgba(26,26,26,0.08), 0 18px 50px -12px rgba(26,26,26,0.35)',
                            }}
                        >
                            <canvas ref={canvasRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
