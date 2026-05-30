/**
 * Frequent Flyer — reusable className patterns (source of truth).
 *
 * These are the canonical class strings for the handful of UI primitives that
 * repeat across the app. Import them instead of re-typing the strings so the
 * brand stays consistent and a single edit propagates everywhere.
 *
 * The /design page renders each of these live, so it can never drift from the
 * code that ships.
 *
 * Conventions baked in here:
 *   - Space Mono, UPPERCASE, tight negative tracking for all labels/controls.
 *   - Ink-on-cream by default; solid black fills invert to cream text.
 *   - Pills are fully rounded with hairline ink borders.
 */

/** Top-nav text link (home, events, map, …). */
export const navLink =
    'font-space-mono leading-[1.25] not-italic text-[16px] text-black tracking-[-0.64px] uppercase hover:underline underline-offset-4 decoration-2';

/** Primary call-to-action pill ("+ create"): outline that inverts on hover. */
export const createPill =
    'font-space-mono leading-none not-italic text-[15px] text-black tracking-[-0.64px] uppercase border border-black/40 rounded-full px-5 py-2.5 hover:bg-black hover:text-[#FFFAEB] transition-colors no-underline whitespace-nowrap';

/** Small filter pill base (day-of-week / neighborhood filters). */
export const filterPillBase =
    'font-space-mono text-[11px] uppercase tracking-[-0.44px] px-[12px] py-[6px] rounded-full border transition-colors whitespace-nowrap cursor-pointer';

/** Filter pill — selected state. */
export const filterPillActive = 'bg-black text-[#FFFAEB] border-black';

/** Filter pill — unselected state. */
export const filterPillInactive = 'bg-transparent text-black border-black/30 hover:border-black';

/** Convenience: full filter-pill className for a given active state. */
export function filterPill(active: boolean): string {
    return `${filterPillBase} ${active ? filterPillActive : filterPillInactive}`;
}
