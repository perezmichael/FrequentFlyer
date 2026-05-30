'use client';

import { filterPill } from '@/features/frequent-flyer/design/patterns';

/**
 * One pill in a {@link FilterPillRow}. The caller owns all selection logic —
 * `active` and `onClick` are computed by the page so each filter surface keeps
 * its own semantics (toggle-off, single-select, URL params, local state, …).
 */
export interface PillSpec {
    /** Stable React key (and a convenient stable id for the option). */
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
    /** Bold the label — used for the "today" pill on the home day row. */
    emphasize?: boolean;
}

interface FilterPillRowProps {
    pills: PillSpec[];
    /** Extra classes on the row wrapper (e.g. top margin between stacked rows). */
    className?: string;
    /** Accessible label for the row's scroll region. */
    'aria-label'?: string;
}

/**
 * A horizontal, scrollable row of filter pills. Purely presentational: it maps
 * each {@link PillSpec} through the canonical `filterPill(active)` pattern so
 * every filter pill across the app shares one source of truth for styling.
 */
export default function FilterPillRow({ pills, className = '', 'aria-label': ariaLabel }: FilterPillRowProps) {
    return (
        <div
            className={`no-scrollbar flex gap-[8px] overflow-x-auto pb-[2px] ${className}`.trim()}
            role="group"
            aria-label={ariaLabel}
        >
            {pills.map((pill) => (
                <button
                    key={pill.key}
                    type="button"
                    onClick={pill.onClick}
                    aria-pressed={pill.active}
                    className={`${filterPill(pill.active)} ${pill.emphasize ? 'font-bold' : ''}`.trim()}
                >
                    {pill.label}
                </button>
            ))}
        </div>
    );
}
