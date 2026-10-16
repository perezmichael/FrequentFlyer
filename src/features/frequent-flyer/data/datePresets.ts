/**
 * Day-level date filters shared by /events and /map, so "this weekend" means
 * the same thing on both. (The admin list keeps its own copy.)
 */

export const DATE_PRESETS = [
    { label: 'Today', value: 'today' },
    { label: 'This Weekend', value: 'weekend' },
    { label: 'This Week', value: 'week' },
    { label: 'All', value: 'all' },
] as const;

export function getDatePresetRange(preset: string): { from: Date; to: Date } | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'today') {
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        return { from: today, to: end };
    }

    if (preset === 'weekend') {
        const day = today.getDay(); // 0=Sun, 1=Mon … 5=Fri, 6=Sat
        // If we're already in the weekend (Fri/Sat/Sun) anchor on this Friday,
        // otherwise jump to the next Friday.
        let fri: Date;
        if (day === 6) {
            fri = new Date(today);
            fri.setDate(today.getDate() - 1); // yesterday was Friday
        } else if (day === 0) {
            fri = new Date(today);
            fri.setDate(today.getDate() - 2); // two days ago was Friday
        } else {
            // Mon(1)–Fri(5): 0 days ahead when day===5, otherwise 5-day ahead
            fri = new Date(today);
            fri.setDate(today.getDate() + (5 - day));
        }
        const sun = new Date(fri);
        sun.setDate(fri.getDate() + 2);
        sun.setHours(23, 59, 59, 999);
        // If part of the weekend is already past, start from today
        const from = fri < today ? today : fri;
        return { from, to: sun };
    }

    if (preset === 'week') {
        const end = new Date(today);
        end.setDate(today.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        return { from: today, to: end };
    }

    return null; // 'all' — no additional constraint beyond upcoming
}

// Normalise any ISO date string to local midnight for safe day-level comparisons
export function toLocalMidnight(dateStr: string): Date {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
