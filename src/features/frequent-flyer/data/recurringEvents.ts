export interface RecurringEvent {
    id: string;
    event_name: string;
    category: string;
    day_of_week: number; // 0=Sun ... 6=Sat
    start_time: string | null;
    end_time: string | null;
    recurrence: string;
    description: string | null;
    venue_name: string;
    neighborhood: string;
    /** Null when the venue hasn't been geocoded — never faked to a default. */
    lat: number | null;
    lng: number | null;
    venue_url?: string;
    venue_image?: string;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatRecurringTime(startTime: string | null, endTime: string | null): string {
    if (!startTime) return '';
    const fmt = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour = h % 12 || 12;
        return m === 0 ? `${hour} ${ampm}` : `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
    };
    if (endTime) return `${fmt(startTime)} - ${fmt(endTime)}`;
    return fmt(startTime);
}

export function formatRecurringSchedule(dayOfWeek: number, startTime: string | null, endTime: string | null): string {
    const day = DAY_NAMES[dayOfWeek];
    const time = formatRecurringTime(startTime, endTime);
    return time ? `Every ${day}, ${time}` : `Every ${day}`;
}
