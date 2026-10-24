import { POS } from './commands';

export type Direction = 'left' | 'right' | 'up' | 'down';
export type Phase = 1 | 2;

const IDX: number[] = [];
POS.forEach(([r, c], i) => { IDX[r * 3 + c] = i; });

/** Directions the circuit of each phase can detect. */
export function allowedDirections(phase: Phase): readonly Direction[] {
  return phase === 1 ? ['up', 'down'] : ['left', 'right', 'up', 'down'];
}

/**
 * Next ring index after a glance.
 * Phase 1 (current single-channel circuit, classes up/down/straight/double blink):
 *   ring of eight, down = clockwise (next), up = counterclockwise (previous).
 * Phase 2: neighbouring cell in the 3x3 grid, wrapping at the edges and skipping the center panel.
 * Returns the current index for a direction the phase cannot detect.
 */
export function move(cur: number | null, dir: Direction, phase: Phase): number {
  if (!allowedDirections(phase).includes(dir)) return cur ?? 0;
  if (cur === null) return 0;
  if (phase === 1) return dir === 'up' ? (cur + 7) % 8 : (cur + 1) % 8;

  let [r, c] = POS[cur]!;
  const dr = dir === 'up' ? 2 : dir === 'down' ? 1 : 0;
  const dc = dir === 'left' ? 2 : dir === 'right' ? 1 : 0;
  do { r = (r + dr) % 3; c = (c + dc) % 3; } while (r === 1 && c === 1);
  return IDX[r * 3 + c]!;
}
