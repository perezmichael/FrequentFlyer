'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';

/**
 * Studio Playground — an interaction-craft sandbox for the flyer editor.
 *
 * This is intentionally NOT wired to the event-submission flow. It's the place
 * to push the *feel* of direct manipulation: branded transform controls,
 * Figma-style snapping with alignment guides, and an opinionated template
 * gallery that *morphs* the layout instead of hard-swapping it. Once the
 * interactions feel right here they get folded back into the real /create studio.
 */

// Brand tokens (kept in sync with design/tokens.ts + globals.css).
const CREAM = '#FFFAEB';
const INK = '#1a1a1a';
const BRAND = '#C2371B';
const FLYER = '#efede1';

const CANVAS_W = 460;
const CANVAS_H = 575; // 4:5-ish flyer proportion
const SNAP = 6; // px threshold for snapping
const MONO = "'Space Mono', ui-monospace, monospace";

type Guide = { orient: 'v' | 'h'; pos: number };

// ---- Templates -------------------------------------------------------------
// A flyer is a small set of named "roles". A template positions/styles each
// role; switching templates morphs the *same* objects to the new spec, so the
// user's text is preserved while the composition animates.

type Role = 'headline' | 'accent' | 'date' | 'venue';

interface RoleTarget {
    top: number;
    left?: number; // explicit top-left x; omit to use `align`
    align?: 'left' | 'center';
    width?: number; // textbox / rect width
    height?: number; // rect height
    fontSize?: number;
    fill: string;
    textAlign?: 'left' | 'center';
    fontWeight?: 'bold' | 'normal';
    opacity?: number;
}

interface Template {
    id: string;
    name: string;
    bg: string;
    roles: Record<Role, RoleTarget>;
}

const INSET = 36;

const TEMPLATES: Template[] = [
    {
        id: 'stack',
        name: 'Stack',
        bg: CREAM,
        roles: {
            headline: { left: INSET, top: 56, width: CANVAS_W - 72, fontSize: 46, fill: INK, textAlign: 'left', fontWeight: 'bold' },
            accent: { left: INSET, top: 196, width: 96, height: 8, fill: BRAND },
            date: { left: INSET, top: CANVAS_H - 96, fontSize: 17, fill: INK },
            venue: { left: INSET, top: CANVAS_H - 64, fontSize: 14, fill: INK, opacity: 0.65 },
        },
    },
    {
        id: 'center',
        name: 'Center',
        bg: CREAM,
        roles: {
            headline: { left: INSET, top: 188, width: CANVAS_W - 72, fontSize: 42, fill: INK, textAlign: 'center', fontWeight: 'bold' },
            accent: { align: 'center', top: 300, width: 120, height: 6, fill: BRAND },
            date: { align: 'center', top: 344, fontSize: 18, fill: INK },
            venue: { align: 'center', top: 376, fontSize: 14, fill: INK, opacity: 0.65 },
        },
    },
    {
        id: 'midnight',
        name: 'Midnight',
        bg: INK,
        roles: {
            accent: { left: INSET, top: 300, width: 140, height: 8, fill: BRAND },
            headline: { left: INSET, top: 326, width: CANVAS_W - 72, fontSize: 50, fill: FLYER, textAlign: 'left', fontWeight: 'bold' },
            date: { left: INSET, top: CANVAS_H - 104, fontSize: 17, fill: FLYER },
            venue: { left: INSET, top: CANVAS_H - 72, fontSize: 14, fill: FLYER, opacity: 0.6 },
        },
    },
];

const ROLES: Role[] = ['headline', 'accent', 'date', 'venue'];

type RoledObject = fabric.FabricObject & { role?: Role };

function findRole(canvas: fabric.Canvas, role: Role): RoledObject | undefined {
    return canvas.getObjects().find((o) => (o as RoledObject).role === role) as RoledObject | undefined;
}

// ---- Small math helpers ----------------------------------------------------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hexToRgb(hex: string): [number, number, number] {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Interpolate two hex colors, returning an `rgb()` string fabric accepts. */
function hexLerp(a: string, b: string, t: number): string {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}

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
    const animatingRef = useRef(false);
    const [ready, setReady] = useState(false);
    const [activeTpl, setActiveTpl] = useState<string>('stack');

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

        const add = (obj: RoledObject, role: Role) => {
            brandObject(obj);
            obj.role = role;
            canvas.add(obj);
        };

        // --- Seed a flyer composition matching the default "stack" template --
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

        add(headline, 'headline');
        add(accent, 'accent');
        add(date, 'date');
        add(venue, 'venue');
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

    // ---- Template morph -----------------------------------------------------
    const applyTemplate = useCallback((tpl: Template) => {
        const canvas = fcRef.current;
        if (!canvas || animatingRef.current) return;

        canvas.discardActiveObject();
        guidesRef.current = [];

        const startBg = (canvas.backgroundColor as string) || CREAM;
        const endBg = tpl.bg;

        type Plan = {
            obj: RoledObject;
            target: RoleTarget;
            start: { top: number; left: number; width: number; height: number; fontSize: number; opacity: number; fill: string };
        };
        const plans: Plan[] = [];

        for (const role of ROLES) {
            const target = tpl.roles[role];
            const obj = findRole(canvas, role);
            if (!target || !obj) continue;

            // Non-interpolated props snap at the start of the morph.
            if (target.textAlign) obj.set('textAlign', target.textAlign);
            if (target.fontWeight) obj.set('fontWeight', target.fontWeight);

            plans.push({
                obj,
                target,
                start: {
                    top: obj.top ?? 0,
                    left: obj.left ?? 0,
                    width: obj.width ?? 0,
                    height: obj.height ?? 0,
                    fontSize: (obj as fabric.IText).fontSize ?? 0,
                    opacity: obj.opacity ?? 1,
                    fill: (obj.fill as string) || INK,
                },
            });
        }

        animatingRef.current = true;
        setActiveTpl(tpl.id);

        fabric.util.animate({
            startValue: 0,
            endValue: 1,
            duration: 480,
            easing: fabric.util.ease.easeOutCubic,
            onChange: (t: number) => {
                canvas.backgroundColor = hexLerp(startBg, endBg, t);
                for (const { obj, target, start } of plans) {
                    obj.set('top', lerp(start.top, target.top, t));
                    if (target.fontSize != null) obj.set('fontSize', lerp(start.fontSize, target.fontSize, t));
                    if (target.width != null) obj.set('width', lerp(start.width, target.width, t));
                    if (target.height != null) obj.set('height', lerp(start.height, target.height, t));
                    obj.set('fill', hexLerp(start.fill, target.fill, t));
                    obj.set('opacity', lerp(start.opacity, target.opacity ?? 1, t));

                    // Horizontal placement: explicit left, live-centered, or inset.
                    if (target.left != null) {
                        obj.set('left', lerp(start.left, target.left, t));
                    } else if (target.align === 'center') {
                        obj.set('left', (CANVAS_W - obj.getScaledWidth()) / 2);
                    } else {
                        obj.set('left', lerp(start.left, INSET, t));
                    }
                }
                canvas.requestRenderAll();
            },
            onComplete: () => {
                // Land on exact final values.
                canvas.backgroundColor = endBg;
                for (const { obj, target } of plans) {
                    obj.set('top', target.top);
                    if (target.fontSize != null) obj.set('fontSize', target.fontSize);
                    if (target.width != null) obj.set('width', target.width);
                    if (target.height != null) obj.set('height', target.height);
                    obj.set('fill', target.fill);
                    obj.set('opacity', target.opacity ?? 1);
                    if (target.left != null) obj.set('left', target.left);
                    else if (target.align === 'center') obj.set('left', (CANVAS_W - obj.getScaledWidth()) / 2);
                    else obj.set('left', INSET);
                    obj.setCoords();
                }
                canvas.requestRenderAll();
                animatingRef.current = false;
            },
        });
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
                    Pick a template to morph the layout · drag elements to snap · arrows nudge
                    (⇧ = 10px) · ⌫ deletes · grab the brick grip to rotate
                </p>

                {/* Template gallery */}
                <div className="mb-8">
                    <p className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/50 mb-3">
                        Templates
                    </p>
                    <div className="flex gap-4">
                        {TEMPLATES.map((tpl) => (
                            <button
                                key={tpl.id}
                                type="button"
                                disabled={!ready}
                                onClick={() => applyTemplate(tpl)}
                                className="group flex flex-col items-center gap-1.5 disabled:opacity-40"
                            >
                                <TemplateThumb tpl={tpl} active={activeTpl === tpl.id} />
                                <span
                                    className={`font-space-mono uppercase text-[10px] tracking-[-0.44px] ${
                                        activeTpl === tpl.id ? 'text-brand' : 'text-black/50 group-hover:text-black'
                                    }`}
                                >
                                    {tpl.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

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

// ---- Template thumbnail ----------------------------------------------------
// A scaled-down, schematic preview generated from the same template data the
// canvas uses, so the chip always reflects the real layout.

const THUMB_W = 52;
const THUMB_H = 65;
const SX = THUMB_W / CANVAS_W;
const SY = THUMB_H / CANVAS_H;

function roleBar(role: Role, t: RoleTarget) {
    // Approximate each role's footprint in flyer coords, then scale to thumb px.
    let w: number;
    let h: number;
    if (role === 'headline') {
        w = t.width ?? 260;
        h = (t.fontSize ?? 40) * 1.9; // ~two lines
    } else if (role === 'accent') {
        w = t.width ?? 96;
        h = t.height ?? 8;
    } else {
        w = role === 'venue' ? 150 : 120;
        h = (t.fontSize ?? 16) * 1.1;
    }
    const x = t.left != null ? t.left : t.align === 'center' ? (CANVAS_W - w) / 2 : INSET;
    return {
        left: x * SX,
        top: t.top * SY,
        width: w * SX,
        height: Math.max(1.5, h * SY),
        fill: t.fill,
        opacity: t.opacity ?? 1,
    };
}

function TemplateThumb({ tpl, active }: { tpl: Template; active: boolean }) {
    return (
        <span
            className="relative block overflow-hidden rounded-[3px] transition-shadow"
            style={{
                width: THUMB_W,
                height: THUMB_H,
                background: tpl.bg,
                boxShadow: active
                    ? `0 0 0 2px ${BRAND}, 0 0 0 3.5px ${CREAM}`
                    : 'inset 0 0 0 1px rgba(26,26,26,0.18)',
            }}
        >
            {ROLES.map((role) => {
                const bar = roleBar(role, tpl.roles[role]);
                return (
                    <span
                        key={role}
                        className="absolute"
                        style={{
                            left: bar.left,
                            top: bar.top,
                            width: bar.width,
                            height: bar.height,
                            background: bar.fill,
                            opacity: bar.opacity,
                            borderRadius: 0.5,
                        }}
                    />
                );
            })}
        </span>
    );
}
