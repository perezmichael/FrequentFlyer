import styles from './FilterBar.module.css';

interface FilterBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    neighborhood: string;
    onNeighborhoodChange: (value: string) => void;
    date: string;
    onDateChange: (value: string) => void;
    vibe: string;
    onVibeChange: (value: string) => void;
    neighborhoods: string[];
    vibes: string[];
}

export default function FilterBar({
    search,
    onSearchChange,
    neighborhood,
    onNeighborhoodChange,
    date,
    onDateChange,
    vibe,
    onVibeChange,
    neighborhoods,
    vibes,
}: FilterBarProps) {
    return (
        <div className={styles.filterBar}>
            <div className={styles.inputGroup}>
                <label htmlFor="search" className={styles.label}>Search</label>
                <input
                    id="search"
                    type="text"
                    placeholder="Event name..."
                    className={styles.input}
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="neighborhood" className={styles.label}>Neighborhood</label>
                <select
                    id="neighborhood"
                    className={styles.select}
                    value={neighborhood}
                    onChange={(e) => onNeighborhoodChange(e.target.value)}
                >
                    <option value="">All Neighborhoods</option>
                    {neighborhoods.map((n) => (
                        <option key={n} value={n}>{n}</option>
                    ))}
                </select>
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="date" className={styles.label}>Date</label>
                <input
                    id="date"
                    type="date"
                    className={styles.input}
                    value={date}
                    onChange={(e) => onDateChange(e.target.value)}
                />
            </div>

            <div className={styles.inputGroup}>
                <label htmlFor="vibe" className={styles.label}>Vibe</label>
                <select
                    id="vibe"
                    className={styles.select}
                    value={vibe}
                    onChange={(e) => onVibeChange(e.target.value)}
                >
                    <option value="">All Vibes</option>
                    {vibes.map((v) => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
