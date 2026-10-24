import { useEffect, useRef, useState } from 'react';
import type { Decision, DecisionLabel, Session } from '@3inlink/core';
import type { ReplayClock } from './ReplayClock';

/** Deviation (mV) from the window baseline that moves the pupil fully up or down. */
const FULL_SCALE_MV = 25;
/** A spike above this (mV) is a blink: the eyelids close while it lasts. */
const BLINK_MV = 35;
/** Pupil travel in SVG units at full scale. */
const TRAVEL = 15;

type Gaze = 'straight' | 'up' | 'down' | 'blink';

const GAZE_TEXT: Record<Gaze, string> = {
  straight: 'Looking straight',
  up: 'Looking up',
  down: 'Looking down',
  blink: 'Blink',
};

function windowAt(decisions: readonly Decision[], t: number) {
  return decisions.find((d) => t >= d.window[0] && t < d.window[1]) ?? null;
}

/**
 * The eye that produced the signal. During each 3 s window the pupil follows the EOG deviation from the
 * window's baseline in the direction of that window's movement, and the lids close while a blink spike
 * is above threshold. It shows what the electrodes saw; the classifier decides at the end of the window.
 */
export function EyeSim({ session, clock }: { session: Session; clock: ReplayClock }) {
  const pupil = useRef<SVGGElement>(null);
  const upperLid = useRef<SVGPathElement>(null);
  const lowerLid = useRef<SVGPathElement>(null);
  const [gaze, setGaze] = useState<Gaze>('straight');
  const [windowLabel, setWindowLabel] = useState<DecisionLabel | null>(null);

  useEffect(() => {
    const { h, fs } = session.signal;
    const at = (s: number) => h[Math.max(0, Math.min(h.length - 1, Math.floor(s * fs)))] ?? 0;
    const baseCache = new Map<number, number>();
    const baseline = (d: Decision) => {
      let b = baseCache.get(d.t);
      if (b === undefined) {
        // median of the first 0.3 s of the window, as in the team's preprocessing
        const i0 = Math.floor(d.window[0] * fs), n = Math.max(1, Math.round(0.3 * fs));
        const xs = h.slice(i0, i0 + n).slice().sort((a, c) => a - c);
        b = xs[Math.floor(xs.length / 2)] ?? 0;
        baseCache.set(d.t, b);
      }
      return b;
    };

    let y = 0, lid = 0, lastGaze: Gaze = 'straight', lastLabel: DecisionLabel | null = null;
    const draw = (t: number) => {
      const d = windowAt(session.decisions, t);
      const dev = d ? at(t) - baseline(d) : 0;
      let targetY = 0, closed = false;
      if (d && t > 0) {
        if (d.label === 'up') targetY = -Math.min(1, Math.max(0, dev) / FULL_SCALE_MV);
        else if (d.label === 'down') targetY = Math.min(1, Math.max(0, -dev) / FULL_SCALE_MV);
        if (dev > BLINK_MV) closed = true;
      }
      // light smoothing so the pupil glides like an eye instead of jittering with the noise
      y += (targetY - y) * 0.35;
      lid += ((closed ? 1 : 0) - lid) * 0.6;
      pupil.current?.setAttribute('transform', `translate(0 ${(y * TRAVEL).toFixed(2)})`);
      upperLid.current?.setAttribute('transform', `scale(1 ${lid.toFixed(3)})`);
      lowerLid.current?.setAttribute('transform', `scale(1 ${lid.toFixed(3)})`);

      const g: Gaze = closed ? 'blink' : y < -0.35 ? 'up' : y > 0.35 ? 'down' : 'straight';
      if (g !== lastGaze) { lastGaze = g; setGaze(g); }
      const label = t > 0 && d ? d.label : null;
      if (label !== lastLabel) { lastLabel = label; setWindowLabel(label); }
    };
    draw(clock.t);
    return clock.subscribe(draw);
  }, [session, clock]);

  return (
    <div className="eye-sim" data-gaze={gaze}>
      <span className="eye-dir up" aria-hidden="true">▲ Up</span>
      <svg className="eye-svg" viewBox="0 0 160 100" role="img" aria-label={`Simulated eye: ${GAZE_TEXT[gaze]}`}>
        <defs>
          <clipPath id="eye-sim-clip"><path d="M8 50C30 18 54 8 80 8s50 10 72 42c-22 32-46 42-72 42S30 82 8 50z" /></clipPath>
        </defs>
        <path className="eye-white" d="M8 50C30 18 54 8 80 8s50 10 72 42c-22 32-46 42-72 42S30 82 8 50z" />
        <g clipPath="url(#eye-sim-clip)">
          <g ref={pupil}>
            <circle cx="80" cy="50" r="23" className="eye-iris" />
            <circle cx="80" cy="50" r="11" className="eye-pupil" />
            <circle cx="87" cy="43" r="4" className="eye-glint" />
          </g>
          <path ref={upperLid} className="eye-lid" d="M0 0H160V50H0z" style={{ transformOrigin: '80px 0px' }} />
          <path ref={lowerLid} className="eye-lid" d="M0 50H160V100H0z" style={{ transformOrigin: '80px 100px' }} />
        </g>
        <path className="eye-outline" d="M8 50C30 18 54 8 80 8s50 10 72 42c-22 32-46 42-72 42S30 82 8 50z" />
      </svg>
      <span className="eye-dir down" aria-hidden="true">▼ Down</span>
      <p className="eye-state" aria-live="polite">
        <b>{GAZE_TEXT[gaze]}</b>
        <span>{windowLabel ? `This window: ${windowLabel === 'double_blink' ? 'double blink' : windowLabel}` : 'Press Play'}</span>
      </p>
    </div>
  );
}
