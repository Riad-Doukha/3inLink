import { useEffect, useRef } from 'react';
import { ORDER, PATIENT_MESSAGES, type HciStatus, type Lang } from '@3inlink/core';
import { Icon } from '@3inlink/design-tokens';

/**
 * Phase 1 layout (up/down only): the eight messages stacked vertically like a wheel.
 * The selected message sits in the middle, expanded with its three languages; the others stack above and
 * below, smaller and fainter with distance. Down brings the next message to the middle, up the previous one,
 * and the wheel wraps like the ring it replaces.
 */

/** Visible offsets from the selection, top to bottom, and each slot's relative height. */
const SLOTS: { offset: number; size: number }[] = [
  { offset: -3, size: 0.8 }, { offset: -2, size: 0.95 }, { offset: -1, size: 1.15 },
  { offset: 0, size: 2.7 },
  { offset: 1, size: 1.15 }, { offset: 2, size: 0.95 }, { offset: 3, size: 0.8 }, { offset: 4, size: 0.6 },
];
const TOTAL = SLOTS.reduce((a, s) => a + s.size, 0);
const GEOMETRY = new Map<number, { top: number; height: number }>();
SLOTS.reduce((top, s) => {
  GEOMETRY.set(s.offset, { top: (top / TOTAL) * 100, height: (s.size / TOTAL) * 100 });
  return top + s.size;
}, 0);

/** Offset of ring index i from the selection, in -3..4. */
const offsetOf = (i: number, cur: number) => ((i - cur + 8 + 3) % 8) - 3;

interface Props {
  cur: number | null;
  status: HciStatus;
  caption: string;
  panelLines: Record<Lang, string>;
  onSelect(index: number): void;
}

export function Wheel({ cur, status, caption, panelLines, onSelect }: Props) {
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
        const state = isCenter && cur !== null ? (status === 'sent' ? 'sent' : 'focus') : 'idle';
        return (
          <button
            key={c}
            className={`wheel-item${isCenter ? ' center' : ''}${jump ? ' jump' : ''}`}
            data-d={Math.abs(offset)}
            data-state={state}
            aria-current={state !== 'idle' ? 'true' : undefined}
            style={{ top: `calc(${g.top}% + 3px)`, height: `calc(${g.height}% - 6px)` }}
            onClick={() => onSelect(i)}
          >
            <span className="wheel-num">{String(i + 1).padStart(2, '0')}</span>
            <Icon name={c} />
            {isCenter ? (
              <span className="wheel-text" aria-live="polite">
                <span className="wheel-cap">{caption}</span>
                <span className="wheel-en">{cur === null ? PATIENT_MESSAGES[c].en : panelLines.en}</span>
                <span className="wheel-ar" lang="ar" dir="rtl">{cur === null ? PATIENT_MESSAGES[c].ar : panelLines.ar}</span>
                <span className="wheel-fr" lang="fr">{cur === null ? PATIENT_MESSAGES[c].fr : panelLines.fr}</span>
              </span>
            ) : null}
            {isCenter ? (
              <span className="wheel-nav" aria-hidden="true">
                <span><Icon name="up" />previous</span>
                <span><Icon name="down" />next</span>
              </span>
            ) : (
              <span className="wheel-label">{PATIENT_MESSAGES[c].en}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
