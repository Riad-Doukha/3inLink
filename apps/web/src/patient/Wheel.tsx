import { useEffect, useRef } from 'react';
import { DIR, ORDER, PATIENT_MESSAGES, type HciStatus, type Lang } from '@3inlink/core';
import { Icon } from '@3inlink/design-tokens';

/**
 * Phase 1 layout (up/down only): the eight messages stacked vertically like a wheel.
 * The selected message sits in the middle, expanded with its three languages; the others stack above and
 * below, smaller and fainter with distance. Down brings the next message to the middle, up the previous one,
 * and the wheel wraps like the ring it replaces.
 */

/** Visible offsets from the selection, top to bottom, and each slot's relative height.
    Only two messages show above and below the selection; more moving rows made the wheel tiring to watch. */
const SLOTS: { offset: number; size: number }[] = [
  { offset: -2, size: 1 }, { offset: -1, size: 1.2 },
  { offset: 0, size: 2.6 },
  { offset: 1, size: 1.2 }, { offset: 2, size: 1 },
];
const TOTAL = SLOTS.reduce((a, s) => a + s.size, 0);
const GEOMETRY = new Map<number, { top: number; height: number }>();
SLOTS.reduce((top, s) => {
  GEOMETRY.set(s.offset, { top: (top / TOTAL) * 100, height: (s.size / TOTAL) * 100 });
  return top + s.size;
}, 0);
// hidden rows wait just past the edges, so they fade in from the right side when they become visible
const EDGE = (1 / TOTAL) * 100;
GEOMETRY.set(-3, { top: -EDGE, height: EDGE });
GEOMETRY.set(3, { top: 100, height: EDGE });
GEOMETRY.set(4, { top: 100, height: EDGE });

/** Offset of ring index i from the selection, in -3..4. */
const offsetOf = (i: number, cur: number) => ((i - cur + 8 + 3) % 8) - 3;

interface Props {
  cur: number | null;
  status: HciStatus;
  lang: Lang;
  caption: string;
  /** The selected message (or the sent / idle text) in the interface language. */
  panelText: string;
  previous: string;
  next: string;
  onSelect(index: number): void;
}

export function Wheel({ cur, status, lang, caption, panelText, previous, next, onSelect }: Props) {
  const center = cur ?? 0;
  // centre of the last committed render (updated after commit, so a double render cannot hide a wrap)
  const shown = useRef(center);
  useEffect(() => { shown.current = center; }, [center]);

  const items = ORDER.map((c, i) => {
    const offset = offsetOf(i, center);
    // an item wrapping from one end of the wheel to the other jumps instead of sliding across the middle
    const jump = Math.abs(offsetOf(i, shown.current) - offset) > 1;
    return { c, i, offset, jump };
  });

  return (
    <div className="wheel" data-status={cur === null ? 'idle' : status}>
      {items.map(({ c, i, offset, jump }) => {
        const g = GEOMETRY.get(offset)!;
        const isCenter = offset === 0;
        const hidden = Math.abs(offset) > 2;
        const state = isCenter && cur !== null ? (status === 'sent' ? 'sent' : 'focus') : 'idle';
        return (
          <button
            key={c}
            className={`wheel-item${isCenter ? ' center' : ''}${jump ? ' jump' : ''}`}
            data-d={Math.abs(offset)}
            data-state={state}
            aria-current={state !== 'idle' ? 'true' : undefined}
            aria-hidden={hidden || undefined}
            tabIndex={hidden ? -1 : undefined}
            style={{ top: `calc(${g.top}% + 3px)`, height: `calc(${g.height}% - 6px)` }}
            onClick={() => onSelect(i)}
          >
            <span className="wheel-num">{String(i + 1).padStart(2, '0')}</span>
            <Icon name={c} />
            {isCenter ? (
              <span className="wheel-text" aria-live="polite" dir={DIR[lang]}>
                <span className="wheel-cap">{caption}</span>
                <span className="wheel-line">{cur === null ? PATIENT_MESSAGES[c][lang] : panelText}</span>
              </span>
            ) : null}
            {isCenter ? (
              <span className="wheel-nav" aria-hidden="true">
                <span><Icon name="up" />{previous}</span>
                <span><Icon name="down" />{next}</span>
              </span>
            ) : (
              <span className="wheel-label" dir={DIR[lang]}>{PATIENT_MESSAGES[c][lang]}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
