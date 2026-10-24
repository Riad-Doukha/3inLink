import { describe, expect, it } from 'vitest';
import { ORDER, decisionToInput, decisionsDue, initialHci, reduceHci, type Decision, type DecisionLabel, type HciState } from './index';

const d = (t: number, label: DecisionLabel): Decision =>
  ({ t, window: [t - 3, t], label, confidence: 1, true: null });

describe('decisionToInput', () => {
  it('maps glances to gaze, double blink to confirm, straight to nothing', () => {
    expect(decisionToInput('up', 0)).toEqual({ type: 'gaze', dir: 'up' });
    expect(decisionToInput('double_blink', 0)).toEqual({ type: 'confirm' });
    expect(decisionToInput('blink', 42)).toEqual({ type: 'blink', t: 42 });
    expect(decisionToInput('straight', 0)).toBeNull();
  });
});

describe('decisionsDue', () => {
  const ds = [d(3, 'st' as DecisionLabel), d(6, 'down'), d(9, 'down')];
  it('returns decisions in (from, to]', () => {
    expect(decisionsDue(ds, 0, 3).map((x) => x.t)).toEqual([3]);
    expect(decisionsDue(ds, 3, 8.9).map((x) => x.t)).toEqual([6]);
    expect(decisionsDue(ds, 0, 100)).toHaveLength(3);
  });
  it('never repeats a decision across consecutive frames', () => {
    const seen = [...decisionsDue(ds, 0, 4), ...decisionsDue(ds, 4, 6), ...decisionsDue(ds, 6, 9)];
    expect(seen.map((x) => x.t)).toEqual([3, 6, 9]);
  });
});

describe('replaying the real S024 decision sequence (Phase 1)', () => {
  // classifier output exported from eog/single-channel/S024_r001.txt
  const labels: DecisionLabel[] = ['straight', 'down', 'down', 'down', 'straight', 'up', 'up', 'down', 'straight',
    'double_blink', 'double_blink', 'up', 'double_blink', 'up', 'double_blink', 'straight', 'double_blink', 'straight'];

  it('sends pain, then bathroom, then call nurse', () => {
    let s: HciState = initialHci;
    const sent: string[] = [];
    labels.forEach((l, i) => {
      const input = decisionToInput(l, i * 3000);
      if (!input) return;
      const next = reduceHci(s, input, 1);
      if (next.status === 'sent' && s.status !== 'sent') sent.push(ORDER[next.cur!]!);
      s = next;
    });
    expect(sent).toEqual(['pain', 'toilet', 'nurse']);
  });
});
