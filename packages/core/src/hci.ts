import { move, type Direction, type Phase } from './nav';

export type HciStatus = 'idle' | 'focus' | 'pending' | 'sent';

export interface HciState {
  /** Ring index of the focused tile, or null when the patient looks away. */
  cur: number | null;
  status: HciStatus;
  /** Time of the first blink of a double blink, while status is 'pending'. */
  pendingSince: number | null;
}

export type HciInput =
  | { type: 'gaze'; dir: Direction }
  | { type: 'select'; index: number }
  | { type: 'blink'; t: number }
  /** A double blink already recognized upstream (e.g. by the signal classifier). */
  | { type: 'confirm' }
  | { type: 'tick'; t: number }
  | { type: 'clear' };

export const DOUBLE_BLINK_WINDOW_MS = 1000;

export const initialHci: HciState = { cur: null, status: 'idle', pendingSince: null };

const focus = (cur: number): HciState => ({ cur, status: 'focus', pendingSince: null });

/**
 * Patient screen state machine. Gaze only previews; a double blink sends.
 * A single blink is forgotten after the window; moving gaze cancels a half-finished double blink.
 * Blinks after a send are ignored until the patient looks at another tile, so an old message is never repeated.
 */
export function reduceHci(
  s: HciState,
  input: HciInput,
  phase: Phase,
  windowMs = DOUBLE_BLINK_WINDOW_MS,
): HciState {
  switch (input.type) {
    case 'gaze': {
      const next = move(s.cur, input.dir, phase);
      if (next === s.cur && s.cur !== null) return s;
      return focus(next);
    }
    case 'select':
      return focus(input.index);
    case 'clear':
      return initialHci;
    case 'blink':
      if (s.cur === null || s.status === 'sent') return s;
      if (s.status === 'pending' && s.pendingSince !== null && input.t - s.pendingSince <= windowMs) {
        return { ...s, status: 'sent', pendingSince: null };
      }
      return { ...s, status: 'pending', pendingSince: input.t };
    case 'confirm':
      if (s.cur === null || s.status === 'sent') return s;
      return { ...s, status: 'sent', pendingSince: null };
    case 'tick':
      if (s.status === 'pending' && s.pendingSince !== null && input.t - s.pendingSince > windowMs) {
        return { ...s, status: 'focus', pendingSince: null };
      }
      return s;
  }
}
