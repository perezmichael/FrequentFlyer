'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import EventEditorSheet, { EditorEvent } from './EventEditorSheet';
import { useRouter } from 'next/navigation';
import { Event } from '@/features/frequent-flyer/data/events';
import AdminEventCard from './AdminEventCard';
import { Button } from '@/components/ui/button';
import {
    approveEvent,
    rejectEvent,
    setEventStatus,
    setEventsStatus,
} from '@/app/actions';
import { Check, X, Undo2, RefreshCw, Keyboard } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminEvent = Event & {
    status?: string;
    vibe_score?: number;
    source?: string;
    flyer_url?: string;
    startTime?: string | null;
    endTime?: string | null;
    venueName?: string;
    sourceUrl?: string | null;
    eventVibe?: string | null;
    lockedFields?: string[];
    scrapedValues?: Record<string, string | null>;
};

interface AdminEventListProps {
    events: AdminEvent[];
}

interface Toast {
    id: string;
    message: string;
    undo?: () => Promise<void> | void;
    expiresAt: number;
}

// ---------------------------------------------------------------------------
// Date presets + helpers
// ---------------------------------------------------------------------------

const DATE_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'This Weekend', value: 'weekend' },
    { label: 'This Week', value: 'week' },
    { label: 'All', value: 'all' },
] as const;

function getDatePresetRange(preset: string): { from: Date; to: Date } | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'today') {
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: today, to: end };
    }

    if (preset === 'weekend') {
        const day = today.getDay();
        let fri: Date;
        if (day === 6) {
            fri = new Date(today);
            fri.setDate(today.getDate() - 1);
        } else if (day === 0) {
            fri = new Date(today);
            fri.setDate(today.getDate() - 2);
        } else {
            fri = new Date(today);
            fri.setDate(today.getDate() + (5 - day));
        }
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + 2);
        sun.setHours(23, 59, 59, 999);
        const from = fri < today ? today : fri;
        return { from, to: sun };
    }

    if (preset === 'week') {
        const end = new Date(today);
        end.setDate(today.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        return { from: today, to: end };
    }

    return null;
}

function toLocalMidnight(dateStr: string): Date {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Group an event into a date bucket for section headers.
function getDateBucket(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = toLocalMidnight(dateStr);
    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';

    // Weekend bucket = the upcoming Fri/Sat/Sun
    const dow = eventDate.getDay();
    if (diffDays <= 7 && (dow === 5 || dow === 6 || dow === 0)) return 'This Weekend';

    if (diffDays <= 7) return 'This Week';
    if (diffDays <= 14) return 'Next Week';
    return 'Later';
}

const BUCKET_ORDER = ['Past', 'Today', 'Tomorrow', 'This Weekend', 'This Week', 'Next Week', 'Later'];

// Normalize a title for dupe detection.
function normalizeTitle(title: string): string {
    return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Placeholder / missing flyer detector.
function isMissingFlyer(e: AdminEvent): boolean {
    const url = e.flyer_url ?? e.image ?? '';
    if (!url) return true;
    if (url === '/placeholder.jpg') return true;
    if (url.includes('placeholder')) return true;
    return false;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminEventList({ events }: AdminEventListProps) {
    // The same editor the carousel kit uses, so the two can't drift.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [patches, setPatches] = useState<Record<string, Partial<AdminEvent>>>({});

    const editingSheet: EditorEvent | null = (() => {
        if (!editingId) return null;
        const raw = events.find(e => e.id === editingId);
        if (!raw) return null;
        const e = { ...raw, ...patches[editingId] };
        return {
            id: e.id,
            title: e.title,
            date: e.date,
            startTime: e.startTime ?? null,
            endTime: e.endTime ?? null,
            vibe: e.eventVibe ?? (e.vibe?.[0] ?? null),
            flyerUrl: e.flyer_url || null,
            isPick: (e.curationLevel || 'scraped') === 'ff_curated',
            status: e.status || 'pending',
            venue: e.venueName || e.location || '',
            neighborhood: e.neighborhood || '',
            sourceUrl: e.sourceUrl ?? null,
            vibeScore: typeof e.vibe_score === 'number' ? e.vibe_score : null,
            lockedFields: e.lockedFields || [],
            scrapedValues: e.scrapedValues || {},
        };
    })();
    const router = useRouter();

    // Filters
    const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [datePreset, setDatePreset] = useState('all');
    const [areaFilter, setAreaFilter] = useState<string | null>(null);
    const [vibeFilter, setVibeFilter] = useState<string | null>(null);
    const [sourceFilter, setSourceFilter] = useState<string | null>(null);
    const [needsFlyer, setNeedsFlyer] = useState(false);
    const [needsDedup, setNeedsDedup] = useState(false);
    const [showPast, setShowPast] = useState(false);

    // Bulk selection
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Keyboard focus
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    // Optimistic status overrides (for instant UI after approve/reject)
    const [overrides, setOverrides] = useState<Record<string, string>>({});

    // Toasts for undo
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Refresh spinner
    const [refreshing, setRefreshing] = useState(false);

    // -----------------------------------------------------------------------
    // Merge overrides with incoming events
    // -----------------------------------------------------------------------
    const mergedEvents = useMemo(() => {
        return events.map(e => ({
            ...e,
            status: overrides[e.id] ?? e.status,
        }));
    }, [events, overrides]);

    // Clear overrides that match the server truth
    useEffect(() => {
        setOverrides(prev => {
            const next: Record<string, string> = {};
            let changed = false;
            for (const [id, status] of Object.entries(prev)) {
                const server = events.find(e => e.id === id);
                if (server && (server.status ?? 'pending') === status) {
                    changed = true;
                    continue;
                }
                next[id] = status;
            }
            return changed ? next : prev;
        });
    }, [events]);

    // -----------------------------------------------------------------------
    // Derived filter option sets
    // -----------------------------------------------------------------------
    const areas = useMemo(() => {
        const set = new Set(
            events.map(e => e.neighborhood).filter((n): n is string => !!n && n !== 'Unknown')
        );
        return Array.from(set).sort();
    }, [events]);

    const vibes = useMemo(() => {
        const set = new Set(events.flatMap(e => e.vibe || []));
        return Array.from(set).sort();
    }, [events]);

    const sources = useMemo(() => {
        const set = new Set(events.map(e => e.source || 'manual').filter(Boolean));
        return Array.from(set).sort();
    }, [events]);

    // -----------------------------------------------------------------------
    // Duplicate detection — same normalized title + same date
    // -----------------------------------------------------------------------
    const duplicateIds = useMemo(() => {
        const buckets = new Map<string, string[]>();
        for (const e of mergedEvents) {
            const key = `${normalizeTitle(e.title)}|${e.date?.slice(0, 10)}`;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key)!.push(e.id);
        }
        const dupes = new Set<string>();
        for (const ids of buckets.values()) {
            if (ids.length > 1) ids.forEach(id => dupes.add(id));
        }
        return dupes;
    }, [mergedEvents]);

    // Past-events count for the current status bucket
    const pastCount = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return mergedEvents.filter(e => {
            const normalizedStatus = (!e.status || e.status === 'planned') ? 'pending' : e.status;
            if (normalizedStatus !== statusFilter) return false;
            return toLocalMidnight(e.date) < today;
        }).length;
    }, [mergedEvents, statusFilter]);

    // -----------------------------------------------------------------------
    // Filtered + sorted list
    // -----------------------------------------------------------------------
    const filteredEvents = useMemo(() => {
        const dateRange = datePreset !== 'all' ? getDatePresetRange(datePreset) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return mergedEvents
            .filter(event => {
                const normalizedStatus = (!event.status || event.status === 'planned') ? 'pending' : event.status;
                if (normalizedStatus !== statusFilter) return false;
                if (!showPast && toLocalMidnight(event.date) < today) return false;
                if (dateRange) {
                    const eventDate = toLocalMidnight(event.date);
                    if (eventDate < dateRange.from || eventDate > dateRange.to) return false;
                }
                if (areaFilter && event.neighborhood !== areaFilter) return false;
                if (vibeFilter && !event.vibe?.includes(vibeFilter)) return false;
                if (sourceFilter && (event.source || 'manual') !== sourceFilter) return false;
                if (needsFlyer && !isMissingFlyer(event)) return false;
                if (needsDedup && !duplicateIds.has(event.id)) return false;
                return true;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [
        mergedEvents, statusFilter, datePreset, areaFilter, vibeFilter,
        sourceFilter, needsFlyer, needsDedup, showPast, duplicateIds,
    ]);

    // -----------------------------------------------------------------------
    // Grouped by date bucket for section headers
    // -----------------------------------------------------------------------
    const groupedEvents = useMemo(() => {
        const groups = new Map<string, AdminEvent[]>();
        for (const e of filteredEvents) {
            const bucket = getDateBucket(e.date);
            if (!groups.has(bucket)) groups.set(bucket, []);
            groups.get(bucket)!.push(e);
        }
        return BUCKET_ORDER
            .filter(b => groups.has(b))
            .map(b => ({ bucket: b, events: groups.get(b)! }));
    }, [filteredEvents]);

    // -----------------------------------------------------------------------
    // Stats (for the strip at the top)
    // -----------------------------------------------------------------------
    const stats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let pending = 0, approved = 0, missingFlyer = 0, dupes = 0;
        for (const e of mergedEvents) {
            const status = (!e.status || e.status === 'planned') ? 'pending' : e.status;
            const isUpcoming = toLocalMidnight(e.date) >= today;
            if (status === 'pending' && isUpcoming) pending++;
            if (status === 'approved' && isUpcoming) approved++;
            if (status === 'pending' && isUpcoming && isMissingFlyer(e)) missingFlyer++;
            if (status === 'pending' && isUpcoming && duplicateIds.has(e.id)) dupes++;
        }
        return { pending, approved, missingFlyer, dupes };
    }, [mergedEvents, duplicateIds]);

    // -----------------------------------------------------------------------
    // Toast helpers
    // -----------------------------------------------------------------------
    const pushToast = useCallback((t: Omit<Toast, 'id' | 'expiresAt'>) => {
        const id = `${Date.now()}-${Math.random()}`;
        const expiresAt = Date.now() + 5000;
        setToasts(prev => [...prev, { ...t, id, expiresAt }]);
        toastTimers.current[id] = setTimeout(() => {
            setToasts(prev => prev.filter(x => x.id !== id));
            delete toastTimers.current[id];
        }, 5000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        const timer = toastTimers.current[id];
        if (timer) {
            clearTimeout(timer);
            delete toastTimers.current[id];
        }
        setToasts(prev => prev.filter(x => x.id !== id));
    }, []);

    useEffect(() => {
        return () => {
            Object.values(toastTimers.current).forEach(clearTimeout);
        };
    }, []);

    // -----------------------------------------------------------------------
    // Action handlers (with optimistic UI + undo)
    // -----------------------------------------------------------------------
    const applyStatus = useCallback(async (id: string, status: 'approved' | 'rejected' | 'pending', opts?: { silent?: boolean }) => {
        const prev = mergedEvents.find(e => e.id === id)?.status ?? 'pending';
        setOverrides(o => ({ ...o, [id]: status }));
        try {
            if (status === 'approved') await approveEvent(id);
            else if (status === 'rejected') await rejectEvent(id);
            else await setEventStatus(id, 'pending');
        } catch (e) {
            console.error(e);
            setOverrides(o => {
                const next = { ...o };
                delete next[id];
                return next;
            });
            pushToast({ message: 'Action failed — please retry' });
            return;
        }
        if (!opts?.silent) {
            const verb = status === 'approved' ? 'Approved' : status === 'rejected' ? 'Dismissed' : 'Restored';
            pushToast({
                message: `${verb} event`,
                undo: async () => {
                    setOverrides(o => ({ ...o, [id]: prev }));
                    try {
                        await setEventStatus(id, prev === 'planned' ? 'pending' : prev);
                    } catch (err) {
                        console.error(err);
                    }
                },
            });
        }
    }, [mergedEvents, pushToast]);

    const approve = useCallback((id: string) => applyStatus(id, 'approved'), [applyStatus]);
    const reject = useCallback((id: string) => applyStatus(id, 'rejected'), [applyStatus]);

    const bulkApply = useCallback(async (status: 'approved' | 'rejected') => {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        const prevMap: Record<string, string> = {};
        for (const id of ids) {
            const ev = mergedEvents.find(e => e.id === id);
            prevMap[id] = ev?.status ?? 'pending';
        }
        setOverrides(o => {
            const next = { ...o };
            for (const id of ids) next[id] = status;
            return next;
        });
        setSelected(new Set());
        try {
            await setEventsStatus(ids, status);
        } catch (e) {
            console.error(e);
            setOverrides(o => {
                const next = { ...o };
                for (const id of ids) delete next[id];
                return next;
            });
            pushToast({ message: 'Bulk action failed' });
            return;
        }
        const verb = status === 'approved' ? 'Approved' : 'Dismissed';
        pushToast({
            message: `${verb} ${ids.length} event${ids.length === 1 ? '' : 's'}`,
            undo: async () => {
                setOverrides(o => {
                    const next = { ...o };
                    for (const id of ids) next[id] = prevMap[id];
                    return next;
                });
                try {
                    // Revert each to its prior status
                    const byStatus = new Map<string, string[]>();
                    for (const id of ids) {
                        const s = prevMap[id] === 'planned' ? 'pending' : prevMap[id];
                        if (!byStatus.has(s)) byStatus.set(s, []);
                        byStatus.get(s)!.push(id);
                    }
                    for (const [s, groupIds] of byStatus) {
                        await setEventsStatus(groupIds, s);
                    }
                } catch (err) {
                    console.error(err);
                }
            },
        });
    }, [selected, mergedEvents, pushToast]);

    const toggleSelected = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectAllVisible = useCallback(() => {
        setSelected(new Set(filteredEvents.map(e => e.id)));
    }, [filteredEvents]);

    const clearSelection = useCallback(() => setSelected(new Set()), []);

    // -----------------------------------------------------------------------
    // Refresh
    // -----------------------------------------------------------------------
    const refresh = useCallback(async () => {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 800);
    }, [router]);

    // -----------------------------------------------------------------------
    // Keyboard shortcuts
    // -----------------------------------------------------------------------
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            // Don't hijack typing in inputs
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) {
                if (e.key === 'Escape') target?.blur();
                return;
            }

            if (e.key === '?') {
                setShortcutsOpen(v => !v);
                return;
            }
            if (e.key === 'Escape') {
                setSelected(new Set());
                setShortcutsOpen(false);
                return;
            }

            // Bulk shortcuts (shift modifier)
            if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
                e.preventDefault();
                if (selected.size > 0) bulkApply('approved');
                return;
            }
            if (e.shiftKey && (e.key === 'X' || e.key === 'x')) {
                e.preventDefault();
                if (selected.size > 0) bulkApply('rejected');
                return;
            }

            if (filteredEvents.length === 0) return;

            const idx = focusedId ? filteredEvents.findIndex(ev => ev.id === focusedId) : -1;

            if (e.key === 'j' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = idx < 0 ? 0 : Math.min(filteredEvents.length - 1, idx + 1);
                setFocusedId(filteredEvents[next].id);
                return;
            }
            if (e.key === 'k' || e.key === 'ArrowUp') {
                e.preventDefault();
                const next = idx < 0 ? 0 : Math.max(0, idx - 1);
                setFocusedId(filteredEvents[next].id);
                return;
            }
            if (e.key === ' ') {
                if (focusedId) {
                    e.preventDefault();
                    toggleSelected(focusedId);
                }
                return;
            }
            if (e.key === 'a' || e.key === 'A') {
                if (focusedId) {
                    e.preventDefault();
                    approve(focusedId);
                    // Auto-advance
                    const nextIdx = Math.min(filteredEvents.length - 1, idx + 1);
                    if (nextIdx !== idx && nextIdx >= 0) setFocusedId(filteredEvents[nextIdx].id);
                }
                return;
            }
            if (e.key === 'x' || e.key === 'X') {
                if (focusedId) {
                    e.preventDefault();
                    reject(focusedId);
                    const nextIdx = Math.min(filteredEvents.length - 1, idx + 1);
                    if (nextIdx !== idx && nextIdx >= 0) setFocusedId(filteredEvents[nextIdx].id);
                }
                return;
            }
        }

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [filteredEvents, focusedId, selected, approve, reject, bulkApply, toggleSelected]);

    // Scroll focused card into view
    useEffect(() => {
        if (!focusedId) return;
        const el = document.querySelector(`[data-admin-card-id="${focusedId}"]`);
        if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [focusedId]);

    // -----------------------------------------------------------------------
    // Styling
    // -----------------------------------------------------------------------
    const pillBase =
        'font-space-mono text-[12px] uppercase tracking-[-0.48px] px-[14px] py-[7px] rounded-full border transition-colors whitespace-nowrap cursor-pointer';
    const pillActive = 'bg-black text-[#FFFAEB] border-black';
    const pillInactive = 'bg-transparent text-black border-black/30 hover:border-black';
    const pillWarn = 'bg-amber-500 text-white border-amber-500';

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <div className="space-y-6 relative">
            {/* Stats strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard
                    label="Pending"
                    value={stats.pending}
                    onClick={() => {
                        setStatusFilter('pending');
                        setNeedsFlyer(false);
                        setNeedsDedup(false);
                    }}
                    active={statusFilter === 'pending' && !needsFlyer && !needsDedup}
                />
                <StatCard
                    label="Missing Flyer"
                    value={stats.missingFlyer}
                    onClick={() => {
                        setStatusFilter('pending');
                        setNeedsFlyer(true);
                        setNeedsDedup(false);
                    }}
                    active={needsFlyer}
                    tone={stats.missingFlyer > 0 ? 'warn' : 'default'}
                />
                <StatCard
                    label="Likely Dupes"
                    value={stats.dupes}
                    onClick={() => {
                        setStatusFilter('pending');
                        setNeedsFlyer(false);
                        setNeedsDedup(true);
                    }}
                    active={needsDedup}
                    tone={stats.dupes > 0 ? 'warn' : 'default'}
                />
                <StatCard
                    label="Approved"
                    value={stats.approved}
                    onClick={() => {
                        setStatusFilter('approved');
                        setNeedsFlyer(false);
                        setNeedsDedup(false);
                    }}
                    active={statusFilter === 'approved'}
                />
            </div>

            {/* Sticky filter bar */}
            <div className="sticky top-0 z-20 bg-[#FFFAEB] pt-2 pb-3 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-black/10">
                <div className="space-y-3">
                    {/* Top row: status tabs + refresh + shortcuts */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex gap-2 p-1 bg-muted w-fit rounded-lg">
                            {(['pending', 'approved', 'rejected'] as const).map(status => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const count = mergedEvents.filter(e => {
                                    const normalizedStatus = (!e.status || e.status === 'planned') ? 'pending' : e.status;
                                    if (normalizedStatus !== status) return false;
                                    if (!showPast && toLocalMidnight(e.date) < today) return false;
                                    return true;
                                }).length;
                                return (
                                    <Button
                                        key={status}
                                        variant={statusFilter === status ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setStatusFilter(status)}
                                        className="capitalize"
                                    >
                                        {status}
                                        <span className="ml-2 bg-primary-foreground/20 text-xs px-1.5 py-0.5 rounded-full">
                                            {count}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setShortcutsOpen(v => !v)}
                                className="text-xs text-black/50 hover:text-black transition-colors inline-flex items-center gap-1"
                                title="Keyboard shortcuts (?)"
                            >
                                <Keyboard className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Shortcuts</span>
                            </button>
                            <button
                                onClick={refresh}
                                disabled={refreshing}
                                className="text-xs text-black/50 hover:text-black transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                                title="Refresh event data"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>
                    </div>

                    {/* Filter pills */}
                    <div className="flex flex-col gap-[10px]">
                        {/* Date presets + past toggle + quick toggles */}
                        <div className="flex gap-[8px] overflow-x-auto pb-[2px] items-center" style={{ scrollbarWidth: 'none' }}>
                            {DATE_PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setDatePreset(p.value)}
                                    className={`${pillBase} ${datePreset === p.value ? pillActive : pillInactive}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                            {pastCount > 0 && (
                                <button
                                    onClick={() => setShowPast(v => !v)}
                                    className={`${pillBase} ${showPast ? pillActive : pillInactive}`}
                                >
                                    {showPast ? 'Hiding None' : `+ ${pastCount} Past`}
                                </button>
                            )}
                            <button
                                onClick={() => setNeedsFlyer(v => !v)}
                                className={`${pillBase} ${needsFlyer ? pillWarn : pillInactive}`}
                            >
                                Needs Flyer
                            </button>
                            <button
                                onClick={() => setNeedsDedup(v => !v)}
                                className={`${pillBase} ${needsDedup ? pillWarn : pillInactive}`}
                            >
                                Likely Dupes
                            </button>
                        </div>

                        {/* Area pills */}
                        {areas.length > 0 && (
                            <div className="flex gap-[8px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
                                <button
                                    onClick={() => setAreaFilter(null)}
                                    className={`${pillBase} ${!areaFilter ? pillActive : pillInactive}`}
                                >
                                    All Areas
                                </button>
                                {areas.map(a => (
                                    <button
                                        key={a}
                                        onClick={() => setAreaFilter(areaFilter === a ? null : a)}
                                        className={`${pillBase} ${areaFilter === a ? pillActive : pillInactive}`}
                                    >
                                        {a}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Vibe pills */}
                        {vibes.length > 0 && (
                            <div className="flex gap-[8px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
                                <button
                                    onClick={() => setVibeFilter(null)}
                                    className={`${pillBase} ${!vibeFilter ? pillActive : pillInactive}`}
                                >
                                    All Vibes
                                </button>
                                {vibes.map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setVibeFilter(vibeFilter === v ? null : v)}
                                        className={`${pillBase} ${vibeFilter === v ? pillActive : pillInactive}`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Source pills */}
                        {sources.length > 1 && (
                            <div className="flex gap-[8px] overflow-x-auto pb-[2px]" style={{ scrollbarWidth: 'none' }}>
                                <button
                                    onClick={() => setSourceFilter(null)}
                                    className={`${pillBase} ${!sourceFilter ? pillActive : pillInactive}`}
                                >
                                    All Sources
                                </button>
                                {sources.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSourceFilter(sourceFilter === s ? null : s)}
                                        className={`${pillBase} ${sourceFilter === s ? pillActive : pillInactive}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Selection bar — appears when something is selected */}
            {selected.size > 0 && (
                <div className="sticky top-[240px] z-10 flex items-center gap-3 bg-black text-[#FFFAEB] px-4 py-2.5 rounded-lg shadow-lg">
                    <span className="text-sm font-medium">{selected.size} selected</span>
                    <button
                        onClick={selectAllVisible}
                        className="text-xs underline hover:no-underline"
                    >
                        Select all visible ({filteredEvents.length})
                    </button>
                    <div className="ml-auto flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => bulkApply('approved')}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => bulkApply('rejected')}
                        >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Dismiss
                        </Button>
                        <button
                            onClick={clearSelection}
                            className="text-xs text-white/70 hover:text-white px-2"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Result count */}
            <p className="text-sm text-muted-foreground">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </p>

            {/* Grouped event grid */}
            {groupedEvents.length > 0 ? (
                <div className="space-y-8">
                    {groupedEvents.map(({ bucket, events: bucketEvents }) => (
                        <div key={bucket}>
                            <h2 className="text-xs font-space-mono uppercase tracking-wider text-black/60 mb-3 pb-2 border-b border-black/10">
                                {bucket} · {bucketEvents.length}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {bucketEvents.map(event => (
                                    <AdminEventCard
                                        key={event.id}
                                        event={event}
                                        source={event.source}
                                        selected={selected.has(event.id)}
                                        focused={focusedId === event.id}
                                        duplicate={duplicateIds.has(event.id)}
                                        missingFlyer={isMissingFlyer(event)}
                                        onToggleSelect={() => toggleSelected(event.id)}
                                        onApprove={() => approve(event.id)}
                                        onReject={() => reject(event.id)}
                                        onFocus={() => setFocusedId(event.id)}
                                        onEdit={() => setEditingId(event.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
                    <p>No {statusFilter} events found.</p>
                </div>
            )}

            {editingSheet && (
                <EventEditorSheet
                    event={editingSheet}
                    onClose={() => setEditingId(null)}
                    onSaved={patch => setPatches(prev => ({
                        ...prev,
                        [editingSheet.id]: {
                            ...prev[editingSheet.id],
                            ...(patch.title !== undefined ? { title: patch.title } : {}),
                            ...(patch.date !== undefined ? { date: patch.date } : {}),
                            ...(patch.startTime !== undefined ? { startTime: patch.startTime } : {}),
                            ...(patch.endTime !== undefined ? { endTime: patch.endTime } : {}),
                            ...(patch.vibe !== undefined ? { eventVibe: patch.vibe } : {}),
                            ...(patch.flyerUrl !== undefined ? { flyer_url: patch.flyerUrl ?? '' } : {}),
                            ...(patch.status !== undefined ? { status: patch.status } : {}),
                            ...(patch.isPick !== undefined
                                ? { curationLevel: patch.isPick ? 'ff_curated' : 'scraped' } : {}),
                        },
                    }))}
                />
            )}

            {/* Toast stack */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="pointer-events-auto flex items-center gap-3 bg-black text-[#FFFAEB] px-4 py-3 rounded-lg shadow-xl min-w-[280px] animate-in slide-in-from-right"
                    >
                        <span className="text-sm">{t.message}</span>
                        {t.undo && (
                            <button
                                onClick={async () => {
                                    await t.undo?.();
                                    dismissToast(t.id);
                                }}
                                className="ml-auto inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-amber-300 hover:text-amber-200"
                            >
                                <Undo2 className="w-3.5 h-3.5" />
                                Undo
                            </button>
                        )}
                        <button
                            onClick={() => dismissToast(t.id)}
                            className="text-white/50 hover:text-white"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Shortcuts modal */}
            {shortcutsOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setShortcutsOpen(false)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="bg-[#FFFAEB] rounded-xl p-6 max-w-md w-full shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                            <button onClick={() => setShortcutsOpen(false)}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <dl className="space-y-2 text-sm">
                            <ShortcutRow keys={['J', '↓']} label="Next card" />
                            <ShortcutRow keys={['K', '↑']} label="Previous card" />
                            <ShortcutRow keys={['A']} label="Approve focused card" />
                            <ShortcutRow keys={['X']} label="Dismiss focused card" />
                            <ShortcutRow keys={['Space']} label="Toggle selection" />
                            <ShortcutRow keys={['Shift', '+', 'A']} label="Bulk approve selected" />
                            <ShortcutRow keys={['Shift', '+', 'X']} label="Bulk dismiss selected" />
                            <ShortcutRow keys={['Esc']} label="Clear selection" />
                            <ShortcutRow keys={['?']} label="Toggle this help" />
                        </dl>
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function StatCard({
    label,
    value,
    onClick,
    active,
    tone = 'default',
}: {
    label: string;
    value: number;
    onClick: () => void;
    active: boolean;
    tone?: 'default' | 'warn';
}) {
    const base = 'rounded-lg border p-4 text-left transition-all';
    const activeClass = active
        ? 'bg-black text-[#FFFAEB] border-black'
        : tone === 'warn' && value > 0
            ? 'bg-amber-50 border-amber-300 hover:border-amber-500'
            : 'bg-white border-black/10 hover:border-black/40';
    return (
        <button onClick={onClick} className={`${base} ${activeClass}`}>
            <div className="text-3xl font-bold leading-none mb-1">{value}</div>
            <div className="text-xs font-space-mono uppercase tracking-wide opacity-70">{label}</div>
        </button>
    );
}

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
    return (
        <div className="flex items-center justify-between">
            <dt className="text-black/70">{label}</dt>
            <dd className="flex gap-1">
                {keys.map((k, i) => (
                    <kbd
                        key={i}
                        className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-xs font-mono bg-black/5 border border-black/20 rounded"
                    >
                        {k}
                    </kbd>
                ))}
            </dd>
        </div>
    );
}
