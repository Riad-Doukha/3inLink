import { useEffect, useRef } from 'react';
import { DECISION_TEXT, type DecisionLabel, type Session } from '@3inlink/core';
import type { ReplayClock } from './ReplayClock';

const VIEW_S = 10;

/** Colour role of each decision window, from the design tokens. */
const ROLE: Record<DecisionLabel, 'move' | 'send' | 'rest'> = {
  up: 'move', down: 'move', left: 'move', right: 'move', straight: 'rest', blink: 'send', double_blink: 'send',
};

/**
 * Scrolling EOG plot, like the team's Python interface: the last ~10 s of signal, each 3 s classifier window
 * shaded once its decision is made, and the window being analysed outlined. Draws on every clock tick.
 */
export function SignalPlot({ session, clock }: { session: Session; clock: ReplayClock }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const { h, fs } = session.signal;
    let lo = Infinity, hi = -Infinity;
    for (const v of h) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const pad = (hi - lo) * 0.12 || 1;
    lo -= pad; hi += pad;

    const css = getComputedStyle(cv);
    const tok = (n: string) => css.getPropertyValue(n).trim();
    const C = {
      line: tok('--action'), grid: tok('--line'), muted: tok('--muted'), ink: tok('--ink'),
      move: tok('--focus'), moveFill: tok('--focus-fill'), send: tok('--sent'), sendFill: tok('--sent-fill'),
      rest: tok('--muted'), restFill: tok('--surface-2'), head: tok('--panel-focus'),
    };

    let w = 0, ht = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = r.width; ht = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(ht * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(clock.t);
    };

    const draw = (t: number) => {
      if (!w || !ht) return;
      const top = 22, bottom = ht - 18;
      const t1 = Math.max(VIEW_S, t), t0 = t1 - VIEW_S;
      const X = (s: number) => ((s - t0) / VIEW_S) * w;
      const Y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
      ctx.clearRect(0, 0, w, ht);
      ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
      ctx.textBaseline = 'middle';

      // decision windows: made ones shaded and labelled, the one in progress outlined
      for (const d of session.decisions) {
        const [a, b] = d.window;
        if (b < t0 || a > t1) continue;
        const x0 = X(a) + 1, x1 = X(Math.min(b, t)) - 1;
        if (d.t <= t) {
          const role = ROLE[d.label];
          ctx.fillStyle = role === 'move' ? C.moveFill : role === 'send' ? C.sendFill : C.restFill;
          ctx.globalAlpha = role === 'rest' ? 0.35 : 0.55;
          ctx.fillRect(x0, top - 16, X(b) - X(a) - 2, bottom - top + 16);
          ctx.globalAlpha = 1;
          ctx.fillStyle = role === 'move' ? C.move : role === 'send' ? C.send : C.rest;
          ctx.fillText(`${DECISION_TEXT[d.label].toUpperCase()} · ${d.confidence.toFixed(2)}`, x0 + 8, top - 6);
        } else if (a <= t && x1 > x0) {
          ctx.strokeStyle = C.muted;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x0, top - 16, x1 - x0, bottom - top + 16);
          ctx.setLineDash([]);
          ctx.fillStyle = C.muted;
          ctx.fillText('ANALYSING…', x0 + 8, top - 6);
        }
      }

      // baseline and time ticks
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0));
      ctx.stroke();
      ctx.fillStyle = C.muted;
      for (let s = Math.ceil(t0); s <= t1; s++) {
        if (s % 3 !== 0) continue;
        ctx.fillText(`${s} s`, X(s) + 3, ht - 8);
      }

      // signal up to now
      const i0 = Math.max(0, Math.floor(t0 * fs)), i1 = Math.min(h.length - 1, Math.floor(t * fs));
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = i0; i <= i1; i++) {
        const x = X(i / fs), y = Y(h[i]!);
        if (i === i0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // playhead
      if (t > 0) {
        const x = X(t);
        ctx.fillStyle = C.head;
        ctx.beginPath();
        ctx.arc(x, Y(h[Math.min(h.length - 1, Math.floor(t * fs))]!), 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const off = clock.subscribe(draw);
    return () => { ro.disconnect(); off(); };
  }, [session, clock]);

  return (
    <canvas
      ref={canvas}
      className="plot"
      role="img"
      aria-label={`EOG signal of ${session.meta.title}, with the classifier decision for each ${session.meta.window_s}-second window`}
    />
  );
}
