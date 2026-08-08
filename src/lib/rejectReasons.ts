/**
 * Why an event was turned down.
 *
 * Coarse buckets on purpose: the point is a groupable signal, not an essay.
 * Review is a bulk pass over hundreds of events, and anything that requires
 * thought won't get filled in — it'll just slow the pass down until it gets
 * skipped entirely.
 *
 * Lives here rather than in actions.ts because a 'use server' module can only
 * export async functions.
 *
 * Not wired to any UI yet. `rejectEvent(id, reason)` accepts a reason today;
 * the control is deliberately deferred until we know whether the pick note
 * gets used, since adding friction to rejection is the more expensive mistake.
 */
export const REJECT_REASONS = [
    'not interesting',
    'duplicate',
    'wrong/bad data',
    'not really an event',
    'too far / out of area',
] as const;

export type RejectReason = typeof REJECT_REASONS[number];
