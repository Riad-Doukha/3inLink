import type { Direction, Phase } from '@3inlink/core';

/**
 * How an EOG source (the replay today, a live bridge later) drives the patient screen on the same page.
 * Kept in-page on purpose: if several windows followed one source, each would send its own copy of every alert.
 */
export type GazeEvent =
  | { type: 'gaze'; dir: Direction }
  | { type: 'blink' }
  | { type: 'confirm' }
  | { type: 'clear' }
  | { type: 'phase'; phase: Phase };

const listeners = new Set<(e: GazeEvent) => void>();

export function publishGaze(e: GazeEvent) {
  listeners.forEach((l) => l(e));
}

/** Returns an unsubscribe function. */
export function subscribeGaze(listener: (e: GazeEvent) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
