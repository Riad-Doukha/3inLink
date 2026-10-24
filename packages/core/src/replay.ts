import type { HciInput } from './hci';
import type { Phase } from './nav';

/** Classifier output labels, as written by eog/export_session.py. */
export type DecisionLabel = 'up' | 'down' | 'left' | 'right' | 'straight' | 'blink' | 'double_blink';

export interface Decision {
  /** Time the decision is made (end of its window), in seconds from the start of the recording. */
  t: number;
  /** Signal window the decision was computed on, [start, end] in seconds. */
  window: [number, number];
  label: DecisionLabel;
  confidence: number;
  /** Ground-truth label when the recording has one. */
  true: DecisionLabel | null;
}

export interface SessionMeta {
  id: string;
  title: string;
  phase: Phase;
  source: 'real' | 'simulated';
  note?: string | null;
  fs: number;
  duration_s: number;
  channels: ('h' | 'v')[];
  classifier: string;
  window_s: number;
  hop_s: number;
}

/** A replay session: the display signal plus the classifier's decisions (see docs/session-format.md). */
export interface Session {
  meta: SessionMeta;
  signal: { fs: number; units: string; h: number[]; v?: number[] };
  decisions: Decision[];
}

export interface SessionIndexEntry {
  id: string;
  title: string;
  phase: Phase;
  source: 'real' | 'simulated';
  duration_s: number;
  file: string;
}

/**
 * What a decision does on the patient screen. Glances move, a double blink confirms,
 * a single blink counts toward a double blink, and a straight gaze does nothing.
 */
export function decisionToInput(label: DecisionLabel, now: number): HciInput | null {
  switch (label) {
    case 'up':
    case 'down':
    case 'left':
    case 'right':
      return { type: 'gaze', dir: label };
    case 'double_blink':
      return { type: 'confirm' };
    case 'blink':
      return { type: 'blink', t: now };
    case 'straight':
      return null;
  }
}

/** Decisions that fall due when the replay clock moves from `from` (exclusive) to `to` (inclusive). */
export function decisionsDue(decisions: readonly Decision[], from: number, to: number): Decision[] {
  return decisions.filter((d) => d.t > from && d.t <= to);
}

export const DECISION_TEXT: Record<DecisionLabel, string> = {
  up: 'Up',
  down: 'Down',
  left: 'Left',
  right: 'Right',
  straight: 'Straight',
  blink: 'Blink',
  double_blink: 'Double blink',
};
