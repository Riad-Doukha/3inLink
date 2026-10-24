import { describe, expect, it } from 'vitest';
import { ORDER, POS, initialHci, move, reduceHci, type HciState } from './index';

const at = (cmd: (typeof ORDER)[number]) => ORDER.indexOf(cmd);

describe('move, phase 1 (up/down ring)', () => {
  it('goes clockwise on down and wraps', () => {
    expect(move(at('nurse'), 'down', 1)).toBe(at('toilet'));
    expect(move(at('pain'), 'down', 1)).toBe(at('cold'));
  });
  it('goes counterclockwise on up and wraps', () => {
    expect(move(at('toilet'), 'up', 1)).toBe(at('nurse'));
  });
  it('ignores left/right', () => {
    expect(move(at('water'), 'left', 1)).toBe(at('water'));
    expect(move(at('water'), 'right', 1)).toBe(at('water'));
  });
  it('reaches any tile in at most 4 moves', () => {
    for (let from = 0; from < 8; from++) {
      for (let to = 0; to < 8; to++) {
        const d = Math.abs(from - to);
        expect(Math.min(d, 8 - d)).toBeLessThanOrEqual(4);
      }
    }
  });
});

describe('move, phase 2 (four directions)', () => {
  it('moves to the grid neighbour', () => {
    expect(move(at('toilet'), 'right', 2)).toBe(at('pain'));
    expect(move(at('pain'), 'down', 2)).toBe(at('bed')); // skips the center panel
    expect(move(at('nurse'), 'right', 2)).toBe(at('water')); // skips the center panel
  });
  it('wraps at the edges', () => {
    expect(move(at('pain'), 'up', 2)).toBe(at('bed'));
    expect(move(at('toilet'), 'left', 2)).toBe(at('cold'));
  });
  it('never lands on the center', () => {
    for (let i = 0; i < 8; i++) {
      for (const d of ['left', 'right', 'up', 'down'] as const) {
        const [r, c] = POS[move(i, d, 2)]!;
        expect(r === 1 && c === 1).toBe(false);
      }
    }
  });
});

describe('reduceHci', () => {
  const focused: HciState = { cur: at('water'), status: 'focus', pendingSince: null };

  it('first gaze from idle focuses the first tile', () => {
    expect(reduceHci(initialHci, { type: 'gaze', dir: 'down' }, 1).cur).toBe(0);
  });
  it('a single blink only arms the send', () => {
    const s = reduceHci(focused, { type: 'blink', t: 1000 }, 1);
    expect(s.status).toBe('pending');
  });
  it('two blinks inside the window send', () => {
    let s = reduceHci(focused, { type: 'blink', t: 1000 }, 1);
    s = reduceHci(s, { type: 'blink', t: 1600 }, 1);
    expect(s.status).toBe('sent');
  });
  it('two blinks too far apart do not send', () => {
    let s = reduceHci(focused, { type: 'blink', t: 1000 }, 1);
    s = reduceHci(s, { type: 'blink', t: 2500 }, 1);
    expect(s.status).toBe('pending');
    expect(s.pendingSince).toBe(2500);
  });
  it('tick forgets an expired first blink', () => {
    let s = reduceHci(focused, { type: 'blink', t: 1000 }, 1);
    s = reduceHci(s, { type: 'tick', t: 2100 }, 1);
    expect(s.status).toBe('focus');
  });
  it('moving gaze cancels a pending blink', () => {
    let s = reduceHci(focused, { type: 'blink', t: 1000 }, 1);
    s = reduceHci(s, { type: 'gaze', dir: 'down' }, 1);
    s = reduceHci(s, { type: 'blink', t: 1300 }, 1);
    expect(s.status).toBe('pending');
  });
  it('blinks after a send are ignored', () => {
    const sent: HciState = { ...focused, status: 'sent' };
    expect(reduceHci(sent, { type: 'blink', t: 1 }, 1)).toBe(sent);
    expect(reduceHci(sent, { type: 'confirm' }, 1)).toBe(sent);
  });
  it('blinks with nothing focused are ignored', () => {
    expect(reduceHci(initialHci, { type: 'blink', t: 1 }, 1)).toBe(initialHci);
  });
});
