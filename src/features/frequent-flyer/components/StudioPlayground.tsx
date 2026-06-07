'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import * as fabric from 'fabric';

/**
 * Studio Playground — an interaction-craft sandbox for the flyer editor.
 *
 * Kept separate from the real /create flow so we can push the *feel* of direct
 * manipulation: branded transform controls, Figma-style snapping with alignment
 * guides, an opinionated template gallery that *morphs* the layout, and a layers
 * panel with spring drag-reorder + hover-to-highlight.
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

// An object can play a template "role" (slot) and carries a stable id + name
// for the layers panel.
type Role = 'headline' | 'accent' | 'date' | 'venue';
type StudioObject = fabric.FabricObject & { role?: Role; sid?: string; sname?: string };

type LayerInfo = { id: string; name: string; type: string; visible: boolean; role?: Role };

// ---- Templates -------------------------------------------------------------
interface RoleTarget {
    top: number;
    left?: number;
    align?: 'left' | 'center';
    width?: number;
    height?: number;
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

/** A template's foreground (text) color, used to keep free text readable. */
const foreground = (bg: string) => (bg.toLowerCase() === CREAM.toLowerCase() ? INK : FLYER);

function findRole(canvas: fabric.Canvas, role: Role): StudioObject | undefined {
    return canvas.getObjects().find((o) => (o as StudioObject).role === role) as StudioObject | undefined;
}

function findById(canvas: fabric.Canvas, id: string): StudioObject | undefined {
    return canvas.getObjects().find((o) => (o as StudioObject).sid === id) as StudioObject | undefined;
}

function describeCanvas(canvas: fabric.Canvas): LayerInfo[] {
    // Front-most first (top of the list = top of the z-stack).
    return canvas
        .getObjects()
        .slice()
        .reverse()
        .map((o) => {
            const so = o as StudioObject;
            return { id: so.sid ?? '', name: so.sname ?? o.type ?? 'layer', type: o.type ?? '', visible: o.visible !== false, role: so.role };
        });
}

// ---- Small math helpers ----------------------------------------------------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hexToRgb(hex: string): [number, number, number] {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

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
    const mtr = obj.controls?.mtr;
    if (mtr) {
        mtr.render = renderRotateGrip;
        mtr.offsetY = -34;
    }
}

export default function StudioPlayground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const fcRef = useRef<fabric.Canvas | null>(null);
    const guidesRef = useRef<Guide[]>([]);
    const hoverRef = useRef<fabric.FabricObject | null>(null);
    const animatingRef = useRef(false);
    const idRef = useRef(0);
    const nameCountRef = useRef<Record<string, number>>({});

    const [ready, setReady] = useState(false);
    const [activeTpl, setActiveTpl] = useState<string>('stack');
    const [layers, setLayers] = useState<LayerInfo[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const nextId = () => `o${++idRef.current}`;
    const freeName = (base: string) => {
        const n = (nameCountRef.current[base] ?? 0) + 1;
        nameCountRef.current[base] = n;
        return n === 1 ? base : `${base} ${n}`;
    };

    const refreshLayers = useCallback(() => {
        const canvas = fcRef.current;
        if (canvas) setLayers(describeCanvas(canvas));
    }, []);

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

        const add = (obj: StudioObject, role: Role) => {
            brandObject(obj);
            obj.role = role;
            obj.sid = nextId();
            obj.sname = role[0].toUpperCase() + role.slice(1);
            canvas.add(obj);
        };

        // --- Seed a flyer composition matching the default "stack" template --
        // fabric v7 defaults origin to 'center'; anchor these to top-left.
        const headline = new fabric.Textbox('WAREHOUSE\nPARTY', {
            left: 36, top: 56, originX: 'left', originY: 'top',
            width: CANVAS_W - 72, fontFamily: MONO, fontWeight: 'bold',
            fontSize: 46, lineHeight: 1.0, fill: INK, charSpacing: -40,
        });
        const accent = new fabric.Rect({
            left: 36, top: 196, originX: 'left', originY: 'top',
            width: 96, height: 8, fill: BRAND,
        });
        const date = new fabric.IText('FRI · JUN 6 · 10PM', {
            left: 36, top: CANVAS_H - 96, originX: 'left', originY: 'top',
            fontFamily: MONO, fontSize: 17, fill: INK, charSpacing: -20,
        });
        const venue = new fabric.IText('THE ECHO · ECHO PARK', {
            left: 36, top: CANVAS_H - 64, originX: 'left', originY: 'top',
            fontFamily: MONO, fontSize: 14, fill: INK, opacity: 0.65, charSpacing: -20,
        });

        add(headline, 'headline');
        add(accent, 'accent');
        add(date, 'date');
        add(venue, 'venue');
        canvas.requestRenderAll();
        setLayers(describeCanvas(canvas));

        if (typeof document !== 'undefined' && document.fonts?.ready) {
            document.fonts.ready.then(() => canvas.requestRenderAll());
        }

        // ---- Snapping -------------------------------------------------------
        const onMoving = (e: { target?: fabric.FabricObject }) => {
            const obj = e.target;
            if (!obj) return;
            obj.setCoords();
            const r = obj.getBoundingRect();
            const oL = r.left, oR = r.left + r.width, oCX = r.left + r.width / 2;
            const oT = r.top, oB = r.top + r.height, oCY = r.top + r.height / 2;

            const vTargets = [0, CANVAS_W / 2, CANVAS_W];
            const hTargets = [0, CANVAS_H / 2, CANVAS_H];
            for (const o of canvas.getObjects()) {
                if (o === obj) continue;
                const b = o.getBoundingRect();
                vTargets.push(b.left, b.left + b.width / 2, b.left + b.width);
                hTargets.push(b.top, b.top + b.height / 2, b.top + b.height);
            }

            const guides: Guide[] = [];
            let dx = 0;
            outerX: for (const t of vTargets) {
                for (const val of [oL, oCX, oR]) {
                    if (Math.abs(val - t) <= SNAP) { dx = t - val; guides.push({ orient: 'v', pos: t }); break outerX; }
                }
            }
            let dy = 0;
            outerY: for (const t of hTargets) {
                for (const val of [oT, oCY, oB]) {
                    if (Math.abs(val - t) <= SNAP) { dy = t - val; guides.push({ orient: 'h', pos: t }); break outerY; }
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

        // Overlay pass: alignment guides + the layers-panel hover highlight.
        const onAfterRender = () => {
            const guides = guidesRef.current;
            const hover = hoverRef.current;
            if (!guides.length && !hover) return;
            const ctx = canvas.contextContainer;
            if (!ctx) return;
            const retina = canvas.getRetinaScaling();
            ctx.save();
            ctx.setTransform(retina, 0, 0, retina, 0, 0);

            ctx.strokeStyle = BRAND;
            ctx.lineWidth = 1;
            guides.forEach((g) => {
                ctx.beginPath();
                if (g.orient === 'v') { ctx.moveTo(g.pos, 0); ctx.lineTo(g.pos, CANVAS_H); }
                else { ctx.moveTo(0, g.pos); ctx.lineTo(CANVAS_W, g.pos); }
                ctx.stroke();
            });

            if (hover) {
                const b = hover.getBoundingRect();
                ctx.strokeStyle = BRAND;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.strokeRect(b.left - 2, b.top - 2, b.width + 4, b.height + 4);
                ctx.setLineDash([]);
            }
            ctx.restore();
        };

        const onSelect = () => {
            const a = canvas.getActiveObject() as StudioObject | undefined;
            setSelectedId(a?.sid ?? null);
        };

        canvas.on('object:moving', onMoving);
        canvas.on('after:render', onAfterRender);
        canvas.on('mouse:up', clearGuides);
        canvas.on('object:modified', clearGuides);
        canvas.on('selection:created', onSelect);
        canvas.on('selection:updated', onSelect);
        canvas.on('selection:cleared', () => { clearGuides(); setSelectedId(null); });

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
            obj: StudioObject;
            target: RoleTarget;
            start: { top: number; left: number; width: number; height: number; fontSize: number; opacity: number; fill: string };
        };
        const plans: Plan[] = [];

        for (const role of ROLES) {
            const target = tpl.roles[role];
            const obj = findRole(canvas, role);
            if (!target || !obj) continue;
            if (target.textAlign) obj.set('textAlign', target.textAlign);
            if (target.fontWeight) obj.set('fontWeight', target.fontWeight);
            plans.push({
                obj, target,
                start: {
                    top: obj.top ?? 0, left: obj.left ?? 0, width: obj.width ?? 0, height: obj.height ?? 0,
                    fontSize: (obj as fabric.IText).fontSize ?? 0, opacity: obj.opacity ?? 1, fill: (obj.fill as string) || INK,
                },
            });
        }

        // Free (user-added) text keeps its position but adapts color when the
        // theme flips light<->dark so it doesn't vanish.
        const prevFg = foreground(startBg);
        const newFg = foreground(endBg);
        const freeRecolor: { obj: StudioObject; from: string; to: string }[] = [];
        if (prevFg !== newFg) {
            for (const o of canvas.getObjects()) {
                const so = o as StudioObject;
                const isText = o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';
                if (!so.role && isText && typeof o.fill === 'string' && o.fill.toLowerCase() === prevFg.toLowerCase()) {
                    freeRecolor.push({ obj: so, from: prevFg, to: newFg });
                }
            }
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
                    if (target.left != null) obj.set('left', lerp(start.left, target.left, t));
                    else if (target.align === 'center') obj.set('left', (CANVAS_W - obj.getScaledWidth()) / 2);
                    else obj.set('left', lerp(start.left, INSET, t));
                }
                for (const { obj, from, to } of freeRecolor) obj.set('fill', hexLerp(from, to, t));
                canvas.requestRenderAll();
            },
            onComplete: () => {
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
                for (const { obj, to } of freeRecolor) obj.set('fill', to);
                canvas.requestRenderAll();
                animatingRef.current = false;
            },
        });
    }, []);

    // ---- Toolbar / element creation -----------------------------------------
    const popIn = useCallback((canvas: fabric.Canvas, obj: fabric.FabricObject) => {
        obj.set({ scaleX: 0.85, scaleY: 0.85, opacity: 0 });
        obj.animate(
            { scaleX: 1, scaleY: 1, opacity: 1 },
            { duration: 220, easing: fabric.util.ease.easeOutCubic, onChange: () => canvas.requestRenderAll() },
        );
    }, []);

    const place = useCallback(
        (obj: StudioObject, name: string) => {
            const canvas = fcRef.current;
            if (!canvas) return;
            brandObject(obj);
            obj.sid = nextId();
            obj.sname = freeName(name);
            obj.set({ left: CANVAS_W / 2, top: CANVAS_H / 2, originX: 'center', originY: 'center' });
            canvas.add(obj);
            canvas.setActiveObject(obj);
            popIn(canvas, obj);
            refreshLayers();
            setSelectedId(obj.sid ?? null);
        },
        [popIn, refreshLayers],
    );

    const addHeadline = () =>
        place(new fabric.Textbox('HEADLINE', { width: 280, fontFamily: MONO, fontWeight: 'bold', fontSize: 40, fill: INK, charSpacing: -40, textAlign: 'center' }), 'Text');
    const addLabel = () =>
        place(new fabric.IText('LABEL TEXT', { fontFamily: MONO, fontSize: 16, fill: INK, charSpacing: -20 }), 'Text');
    const addBox = () => place(new fabric.Rect({ width: 120, height: 120, fill: BRAND }), 'Box');

    // Image layer: upload PNG/JPG/SVG, fit, center, and pop it in. A free
    // element (no role) so templates leave it where the user puts it.
    const addImage = useCallback((dataUrl: string) => {
        const canvas = fcRef.current;
        if (!canvas) return;
        fabric.FabricImage.fromURL(dataUrl).then((img) => {
            const fit = Math.min((CANVAS_W * 0.6) / (img.width || 1), (CANVAS_H * 0.55) / (img.height || 1), 1);
            brandObject(img);
            const so = img as StudioObject;
            so.sid = nextId();
            so.sname = freeName('Image');
            img.set({ originX: 'center', originY: 'center', left: CANVAS_W / 2, top: CANVAS_H / 2, scaleX: fit * 0.9, scaleY: fit * 0.9, opacity: 0 });
            canvas.add(img);
            canvas.setActiveObject(img);
            img.animate(
                { scaleX: fit, scaleY: fit, opacity: 1 },
                { duration: 240, easing: fabric.util.ease.easeOutCubic, onChange: () => canvas.requestRenderAll() },
            );
            refreshLayers();
            setSelectedId(so.sid ?? null);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshLayers]);

    const onPickImage = () => fileRef.current?.click();
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => addImage(reader.result as string);
        reader.readAsDataURL(f);
        e.target.value = '';
    };

    const deleteActive = useCallback(() => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const actives = canvas.getActiveObjects();
        if (!actives.length) return;
        actives.forEach((o) => canvas.remove(o));
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        refreshLayers();
        setSelectedId(null);
    }, [refreshLayers]);

    // ---- Layers panel actions ----------------------------------------------
    const selectLayer = useCallback((id: string) => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const obj = findById(canvas, id);
        if (!obj) return;
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        setSelectedId(id);
    }, []);

    const toggleVisible = useCallback((id: string) => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const obj = findById(canvas, id);
        if (!obj) return;
        obj.visible = obj.visible === false;
        canvas.requestRenderAll();
        refreshLayers();
    }, [refreshLayers]);

    const hoverLayer = useCallback((id: string | null) => {
        const canvas = fcRef.current;
        if (!canvas) return;
        hoverRef.current = id ? findById(canvas, id) ?? null : null;
        canvas.requestRenderAll();
    }, []);

    const reorderLayers = useCallback((next: LayerInfo[]) => {
        setLayers(next);
        const canvas = fcRef.current;
        if (!canvas) return;
        const byId = new Map(canvas.getObjects().map((o) => [(o as StudioObject).sid, o]));
        // List is front-first; canvas stack is back-first.
        const stack = [...next].reverse().map((l) => byId.get(l.id)).filter(Boolean) as fabric.FabricObject[];
        (canvas as unknown as { _objects: fabric.FabricObject[] })._objects = stack;
        canvas.requestRenderAll();
    }, []);

    // ---- Keyboard: nudge + delete ------------------------------------------
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const canvas = fcRef.current;
            if (!canvas) return;
            const active = canvas.getActiveObject();
            if (!active) return;
            if ((active as fabric.IText).isEditing) return;

            if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); deleteActive(); return; }

            const step = e.shiftKey ? 10 : 1;
            let moved = true;
            switch (e.key) {
                case 'ArrowLeft': active.set('left', (active.left ?? 0) - step); break;
                case 'ArrowRight': active.set('left', (active.left ?? 0) + step); break;
                case 'ArrowUp': active.set('top', (active.top ?? 0) - step); break;
                case 'ArrowDown': active.set('top', (active.top ?? 0) + step); break;
                default: moved = false;
            }
            if (moved) { e.preventDefault(); active.setCoords(); canvas.requestRenderAll(); }
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
                    <h1 className="font-space-grotesk text-[40px] leading-none font-bold text-black">Studio</h1>
                    <span className="font-space-mono uppercase text-[12px] tracking-[-0.44px] text-brand">playground</span>
                </div>
                <p className="font-space-mono text-black/55 text-[13px] mb-8">
                    Pick a template to morph the layout · drag to snap · reorder layers · arrows nudge
                    (⇧ = 10px) · ⌫ deletes
                </p>

                {/* Template gallery */}
                <div className="mb-8">
                    <p className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/50 mb-3">Templates</p>
                    <div className="flex gap-4">
                        {TEMPLATES.map((tpl) => (
                            <button key={tpl.id} type="button" disabled={!ready} onClick={() => applyTemplate(tpl)}
                                className="group flex flex-col items-center gap-1.5 disabled:opacity-40">
                                <TemplateThumb tpl={tpl} active={activeTpl === tpl.id} />
                                <span className={`font-space-mono uppercase text-[10px] tracking-[-0.44px] ${activeTpl === tpl.id ? 'text-brand' : 'text-black/50 group-hover:text-black'}`}>
                                    {tpl.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Toolbar */}
                    <div className="flex flex-row lg:flex-col gap-3 flex-wrap">
                        <button className={toolBtn} onClick={addHeadline} disabled={!ready}>+ Headline</button>
                        <button className={toolBtn} onClick={addLabel} disabled={!ready}>+ Label</button>
                        <button className={toolBtn} onClick={addBox} disabled={!ready}>+ Box</button>
                        <button className={toolBtn} onClick={onPickImage} disabled={!ready}>+ Image</button>
                        <button className={toolBtn} onClick={deleteActive} disabled={!ready}>Delete</button>
                        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={onFile} />
                    </div>

                    {/* Canvas stage */}
                    <div className="flex-1 flex justify-center">
                        <div className="bg-cream" style={{ boxShadow: '0 1px 0 rgba(26,26,26,0.08), 0 18px 50px -12px rgba(26,26,26,0.35)' }}>
                            <canvas ref={canvasRef} />
                        </div>
                    </div>

                    {/* Layers panel — inline width: a few Tailwind v4 JIT width
                        utilities don't generate reliably in this setup. */}
                    <div className="shrink-0" style={{ width: 230, maxWidth: '100%' }}>
                        <p className="font-space-mono uppercase text-[11px] tracking-[-0.44px] text-black/50 mb-3">Layers</p>
                        <Reorder.Group axis="y" values={layers} onReorder={reorderLayers} className="flex flex-col gap-1.5 list-none m-0 p-0">
                            {layers.map((layer) => (
                                <LayerRow
                                    key={layer.id}
                                    layer={layer}
                                    active={selectedId === layer.id}
                                    onSelect={selectLayer}
                                    onToggle={toggleVisible}
                                    onHover={hoverLayer}
                                />
                            ))}
                        </Reorder.Group>
                        <p className="font-space-mono text-[10px] text-black/35 mt-3 leading-snug">
                            Roles morph with templates. Added elements stay put.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---- Layers row ------------------------------------------------------------
function LayerRow({
    layer, active, onSelect, onToggle, onHover,
}: {
    layer: LayerInfo;
    active: boolean;
    onSelect: (id: string) => void;
    onToggle: (id: string) => void;
    onHover: (id: string | null) => void;
}) {
    const controls = useDragControls();
    const isRole = !!layer.role;
    return (
        <Reorder.Item
            value={layer}
            dragListener={false}
            dragControls={controls}
            onMouseEnter={() => onHover(layer.id)}
            onMouseLeave={() => onHover(null)}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 select-none transition-colors ${
                active ? 'border-brand bg-brand/5' : 'border-black/15 hover:border-black/40 bg-cream'
            }`}
        >
            <span
                onPointerDown={(e) => controls.start(e)}
                className="cursor-grab active:cursor-grabbing text-black/30 hover:text-black/60 font-space-mono text-[13px] leading-none"
                title="Drag to reorder"
            >
                ⠿
            </span>
            <button
                type="button"
                onClick={() => onSelect(layer.id)}
                className="flex-1 text-left font-space-mono uppercase text-[11px] tracking-[-0.44px] text-ink truncate"
            >
                {layer.name}
                {!isRole && <span className="text-black/30 normal-case"> · free</span>}
            </button>
            <button
                type="button"
                onClick={() => onToggle(layer.id)}
                className="text-black/40 hover:text-ink shrink-0"
                title={layer.visible ? 'Hide' : 'Show'}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
            >
                <EyeIcon open={layer.visible} />
            </button>
        </Reorder.Item>
    );
}

function EyeIcon({ open }: { open: boolean }) {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
            {!open && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
    );
}

// ---- Template thumbnail ----------------------------------------------------
const THUMB_W = 52;
const THUMB_H = 65;
const SX = THUMB_W / CANVAS_W;
const SY = THUMB_H / CANVAS_H;

function roleBar(role: Role, t: RoleTarget) {
    let w: number;
    let h: number;
    if (role === 'headline') { w = t.width ?? 260; h = (t.fontSize ?? 40) * 1.9; }
    else if (role === 'accent') { w = t.width ?? 96; h = t.height ?? 8; }
    else { w = role === 'venue' ? 150 : 120; h = (t.fontSize ?? 16) * 1.1; }
    const x = t.left != null ? t.left : t.align === 'center' ? (CANVAS_W - w) / 2 : INSET;
    return { left: x * SX, top: t.top * SY, width: w * SX, height: Math.max(1.5, h * SY), fill: t.fill, opacity: t.opacity ?? 1 };
}

function TemplateThumb({ tpl, active }: { tpl: Template; active: boolean }) {
    return (
        <span
            className="relative block overflow-hidden rounded-[3px] transition-shadow"
            style={{
                width: THUMB_W, height: THUMB_H, background: tpl.bg,
                boxShadow: active ? `0 0 0 2px ${BRAND}, 0 0 0 3.5px ${CREAM}` : 'inset 0 0 0 1px rgba(26,26,26,0.18)',
            }}
        >
            {ROLES.map((role) => {
                const bar = roleBar(role, tpl.roles[role]);
                return (
                    <span key={role} className="absolute" style={{ left: bar.left, top: bar.top, width: bar.width, height: bar.height, background: bar.fill, opacity: bar.opacity, borderRadius: 0.5 }} />
                );
            })}
        </span>
    );
}
