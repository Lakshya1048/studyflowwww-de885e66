import { getLocalDateStr } from './utils';

/** Returns the Monday (local) of the ISO week containing `date`, as YYYY-MM-DD. */
export function getWeekMondayStr(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - offset);
  return getLocalDateStr(d);
}

/** Returns yesterday's local date string (YYYY-MM-DD). */
export function getYesterdayStr(today: Date = new Date()): string {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return getLocalDateStr(d);
}

export interface FreezeState {
  /** Monday of the week the current freeze card was granted for. */
  weekStart: string;
  /** Whether the current week's freeze card is still available. */
  available: boolean;
  /** Map of missed-date -> weekStart it was used from. Protected days. */
  usedOn: Record<string, string>;
}

export const DEFAULT_FREEZE_STATE: FreezeState = {
  weekStart: '',
  available: false,
  usedOn: {},
};

/**
 * Refresh the freeze card if a new week has started.
 * Grants exactly 1 freeze per new ISO week. No reroll within the same week.
 * Pure — returns new state.
 */
export function refreshWeeklyFreeze(state: FreezeState, today: Date = new Date()): FreezeState {
  const currentWeek = getWeekMondayStr(today);
  if (state.weekStart !== currentWeek) {
    // New week → grant a fresh card (always available, regardless of previous week).
    return { ...state, weekStart: currentWeek, available: true };
  }
  // Same week → no reroll, keep current availability as-is.
  return state;
}
