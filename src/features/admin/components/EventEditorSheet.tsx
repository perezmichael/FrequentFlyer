'use client';

import { useEffect, useState } from 'react';
import { updateEvent, setEventCuration, setEventStatus } from '@/app/actions';

/**
 * The shape both callers normalise into. `/admin` and `/admin/kit` hold events
 * in different shapes for their own reasons; rather than teach the sheet about
 * both, each maps into this.
 */
export interface EditorEvent {
    id: string;
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    vibe: string | null;
    flyerUrl: string | null;
    isPick: boolean;
    status: string;
    /** Read-only context — changing the venue is a later phase. */
    venue: string;
    neighborhood: string;
    sourceUrl: string | null;
    vibeScore: number | null;
    /** Scout-owned fields an editor has taken over. */
    lockedFields: string[];
    /** What the venue's page said, before the override. */
    scrapedValues: Record<string, string | null>;
}

const VIBE_PLACEHOLDER = 'e.g. Live Music, DJ Night, Comedy';

/** Postgres time → the "HH:MM" an <input type="time"> wants. */
const toInput = (t: string | null) => (t || '').slice(0, 5);
/** …and back. Empty clears the column rather than writing "". */
const toDb = (v: string) => (v ? `${v}:00` : null);

export default function EventEditorSheet({
    event,
    onClose,
    onSaved,
}: {
    event: EditorEvent;
    onClose: () => void;
    onSaved: (patch: Partial<EditorEvent>) => void;
}) {
    const [title, setTitle] = useState(event.title);
    const [date, setDate] = useState(event.date);
    const [start, setStart] = useState(toInput(event.startTime));
    const [end, setEnd] = useState(toInput(event.endTime));
    const [vibe, setVibe] = useState(event.vibe || '');
    const [flyerUrl, setFlyerUrl] = useState(event.flyerUrl || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Re-seed when a different event is opened without unmounting the sheet.
    useEffect(() => {
        setTitle(event.title);
        setDate(event.date);
        setStart(toInput(event.startTime));
        setEnd(toInput(event.endTime));
        setVibe(event.vibe || '');
        setFlyerUrl(event.flyerUrl || '');
        setError(null);
    }, [event]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const run = async (fn: () => Promise<void>) => {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    const save = () => run(async () => {
        if (!title.trim()) throw new Error('An event needs a title.');
        if (!date) throw new Error('An event needs a date.');
        await updateEvent(event.id, {
            event_name: title.trim(),
            event_date: date,
            start_time: toDb(start),
            end_time: toDb(end),
            event_vibe: vibe.trim() || null,
            flyer_url: flyerUrl.trim() || null,
        });
        onSaved({
            title: title.trim(),
            date,
            startTime: toDb(start),
            endTime: toDb(end),
            vibe: vibe.trim() || null,
            flyerUrl: flyerUrl.trim() || null,
        });
    });

    const togglePick = () => run(async () => {
        const next = event.isPick ? 'scraped' : 'ff_curated';
        await setEventCuration(event.id, next);
        onSaved({ isPick: !event.isPick });
    });

    const changeStatus = (status: string) => run(async () => {
        await setEventStatus(event.id, status);
        onSaved({ status });
    });

    /** What the venue published, when an editor has overridden it. */
    const originalFor = (field: string) =>
        event.lockedFields.includes(field) ? event.scrapedValues?.[field] ?? null : null;

    const field = 'w-full rounded-md border border-black/25 bg-cream px-2.5 py-1.5 font-space-mono text-[13px] text-ink';
    const label = 'block font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/55 mb-1';

    return (
        <>
            <div
                className="fixed inset-0 bg-ink/30"
                style={{ zIndex: 1200 }}
                onClick={onClose}
                aria-hidden
            />
            <aside
                role="dialog"
                aria-label={`Edit ${event.title}`}
                className="fixed top-0 right-0 h-full w-full max-w-[420px] overflow-y-auto border-l border-black/15 bg-cream p-5"
                style={{ zIndex: 1201 }}
            >
                <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                        <div className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/50">
                            Edit event
                        </div>
                        <div className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/45 mt-1">
                            {event.venue}{event.neighborhood ? `, ${event.neighborhood}` : ''}
                            {event.vibeScore !== null && <> · {event.vibeScore}/10</>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="font-space-mono text-[16px] text-ink/50 hover:text-ink"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Status is the first thing worth knowing: from the kit an event
                    is necessarily live, and unapproving pulls it off the site. */}
                <div className="mb-5 rounded-md border border-black/15 p-3">
                    <div className={label}>Status</div>
                    <div className="font-space-mono text-[13px] text-ink mb-2">
                        {event.status === 'approved' && '● Approved — live on the site'}
                        {event.status === 'pending' && '○ Pending review'}
                        {event.status === 'rejected' && '✕ Rejected'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {event.status !== 'approved' && (
                            <button onClick={() => changeStatus('approved')} disabled={busy}
                                className="rounded-full border border-black/40 px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] hover:bg-ink hover:text-cream disabled:opacity-40">
                                Approve
                            </button>
                        )}
                        {event.status === 'approved' && (
                            <button onClick={() => changeStatus('pending')} disabled={busy}
                                className="rounded-full border border-black/40 px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] hover:bg-ink hover:text-cream disabled:opacity-40">
                                Unapprove
                            </button>
                        )}
                        {event.status !== 'rejected' && (
                            <button onClick={() => changeStatus('rejected')} disabled={busy}
                                className="rounded-full border border-brand px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] text-brand hover:bg-brand hover:text-cream disabled:opacity-40">
                                Reject
                            </button>
                        )}
                        <button onClick={togglePick} disabled={busy}
                            className={`rounded-full border px-3 py-1 font-space-mono text-[11px] uppercase tracking-[-0.44px] disabled:opacity-40 ${
                                event.isPick ? 'border-brand bg-brand text-cream' : 'border-black/40 text-ink hover:border-brand hover:text-brand'
                            }`}>
                            {event.isPick ? '★ FF Pick' : '☆ Make FF Pick'}
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <Editable
                        id="title" labelText="Title" original={originalFor('event_name')}
                        onRevert={v => setTitle(v)}
                    >
                        <input id="title" className={field} value={title} onChange={e => setTitle(e.target.value)} />
                    </Editable>

                    <Editable
                        id="date" labelText="Date" original={originalFor('event_date')}
                        onRevert={v => setDate(v)}
                    >
                        <input id="date" type="date" className={field} value={date} onChange={e => setDate(e.target.value)} />
                    </Editable>

                    <div className="grid grid-cols-2 gap-3">
                        <Editable
                            id="start" labelText="Starts" original={toInput(originalFor('start_time'))|| null}
                            onRevert={v => setStart(toInput(v))}
                        >
                            <input id="start" type="time" className={field} value={start} onChange={e => setStart(e.target.value)} />
                        </Editable>
                        <Editable
                            id="end" labelText="Ends" original={toInput(originalFor('end_time')) || null}
                            onRevert={v => setEnd(toInput(v))}
                        >
                            <input id="end" type="time" className={field} value={end} onChange={e => setEnd(e.target.value)} />
                        </Editable>
                    </div>

                    <Editable
                        id="vibe" labelText="Type" original={originalFor('event_vibe')}
                        onRevert={v => setVibe(v)}
                    >
                        <input id="vibe" className={field} value={vibe} placeholder={VIBE_PLACEHOLDER}
                            onChange={e => setVibe(e.target.value)} />
                    </Editable>

                    <div>
                        <label className={label} htmlFor="flyer">Flyer URL</label>
                        <input id="flyer" className={field} value={flyerUrl} placeholder="https://…"
                            onChange={e => setFlyerUrl(e.target.value)} />
                        {flyerUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={flyerUrl} alt="" className="mt-2 h-24 w-auto rounded border border-black/10 object-cover" />
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-md border border-brand px-3 py-2 font-space-mono text-[12px] text-brand">
                        {error}
                    </div>
                )}

                <div className="mt-6 flex items-center gap-3">
                    <button
                        onClick={save} disabled={busy}
                        className="rounded-full border border-black/40 px-5 py-2 font-space-mono text-[13px] uppercase tracking-[-0.44px] text-ink hover:bg-ink hover:text-cream disabled:opacity-40"
                    >
                        {busy ? 'Saving…' : 'Save'}
                    </button>
                    {event.sourceUrl && (
                        <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer"
                            className="font-space-mono text-[11px] uppercase tracking-[-0.44px] text-brand underline underline-offset-2">
                            source ↗
                        </a>
                    )}
                </div>

                <p className="mt-4 font-space-mono text-[10px] uppercase tracking-[-0.44px] leading-relaxed text-ink/40">
                    Saved fields are kept from the nightly scrape. What the venue
                    published stays recorded and can be restored above.
                </p>
            </aside>
        </>
    );
}

/**
 * A labelled field that, when an editor has overridden the scraper, shows what
 * the venue actually published and offers it back.
 */
function Editable({
    id, labelText, original, onRevert, children,
}: {
    id: string;
    labelText: string;
    original: string | null;
    onRevert: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="block font-space-mono text-[11px] uppercase tracking-[-0.44px] text-ink/55 mb-1" htmlFor={id}>
                {labelText}
            </label>
            {children}
            {original && (
                <button
                    onClick={() => onRevert(original)}
                    className="mt-1 font-space-mono text-[10px] uppercase tracking-[-0.44px] text-ink/45 hover:text-brand"
                    title="Restore what the venue's page said"
                >
                    venue said “{original}” · restore
                </button>
            )}
        </div>
    );
}
