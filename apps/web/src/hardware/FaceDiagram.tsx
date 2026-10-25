import { useId } from 'react';
import { ELECTRODES, type ElectrodeId } from './device';
import './diagrams.css';

/** Electrode positions in the 300 × 280 drawing. Front: the electrodes sit around the viewer's left eye. */
const FRONT: Record<ElectrodeId, [number, number]> = {
  vp: [100, 106], vm: [100, 167], hp: [58, 136], hm: [141, 136], ref: [37, 182],
};
const SIDE: Record<ElectrodeId, [number, number]> = {
  vp: [118, 104], vm: [118, 152], hp: [134, 128], hm: [104, 128], ref: [204, 192],
};

/** Where each label sits relative to its dot, so labels never cover an eye. */
const LABEL_AT: Record<'front' | 'side', Record<ElectrodeId, [number, number]>> = {
  front: { vp: [0, -18], vm: [0, 19], hp: [-24, 0], hm: [0, 19], ref: [0, -17] },
  side: { vp: [0, -18], vm: [0, 19], hp: [22, -10], hm: [-22, -10], ref: [0, 19] },
};

export interface Gaze { x: number; y: number; lid: number }

interface Props {
  view?: 'front' | 'side';
  active?: ElectrodeId | null;
  onSelect?(id: ElectrodeId): void;
  /** Per-electrode activity 0–1 and polarity, driven by the simulation. */
  glow?: Partial<Record<ElectrodeId, { level: number; sign: 1 | -1 }>>;
  /** Pupil offset (-1..1) and lid closure (0 open .. 1 closed). */
  gaze?: Gaze;
  showLabels?: boolean;
  className?: string;
}

const MASK =
  'M46 120C46 97 70 91 100 95c25 3 40 9 50 9s25-6 50-9c30-4 54 2 54 25v30c0 23-21 33-49 29-25-3-40-14-55-14s-30 11-55 14c-28 4-49-6-49-29z' +
  'M70 136a30 19 0 1 0 60 0a30 19 0 1 0-60 0zM170 136a30 19 0 1 0 60 0a30 19 0 1 0-60 0z';

/**
 * Stylised wearer: the soft mask with its five electrodes (yellow V, blue H, green REF), drawn from the
 * design sheet. Electrodes are buttons; the simulation moves the pupils and lights the electrodes.
 */
export function FaceDiagram({ view = 'front', active = null, onSelect, glow = {}, gaze = { x: 0, y: 0, lid: 0 }, showLabels = true, className }: Props) {
  const uid = useId().replace(/:/g, '');
  const pos = view === 'front' ? FRONT : SIDE;
  const px = gaze.x * 9, py = gaze.y * 6;

  return (
    <svg className={`fd ${className ?? ''}`} viewBox="0 0 300 280" role="group" aria-label={view === 'front' ? 'Front view of the mask with electrode placement' : 'Side view: module behind the ear and the mastoid reference'}>
      <defs>
        <clipPath id={`l-${uid}`}><ellipse cx="100" cy="136" rx="27" ry="16" /></clipPath>
        <clipPath id={`r-${uid}`}><ellipse cx="200" cy="136" rx="27" ry="16" /></clipPath>
      </defs>

      {view === 'front' ? (
        <>
          <ellipse className="fd-head" cx="150" cy="150" rx="106" ry="126" />
          <path className="fd-line" d="M150 158c-4 20-8 32 0 38M128 228c12 8 32 8 44 0" />
          <rect className="fd-strap" x="36" y="122" width="12" height="28" rx="3" />
          <rect className="fd-strap" x="252" y="122" width="12" height="28" rx="3" />
          {([['l', 100], ['r', 200]] as const).map(([side, cx]) => (
            <g key={side} clipPath={`url(#${side}-${uid})`}>
              <ellipse className="fd-sclera" cx={cx} cy="136" rx="27" ry="16" />
              <g transform={`translate(${px.toFixed(2)} ${py.toFixed(2)})`}>
                <circle className="fd-iris" cx={cx} cy="136" r="9.5" />
                <circle className="fd-pupil" cx={cx} cy="136" r="4.5" />
                <circle className="fd-glint" cx={cx + 3} cy="133" r="1.8" />
              </g>
              <rect className="fd-lid" x={cx - 30} y="118" width="60" height="38" style={{ transform: `scaleY(${gaze.lid.toFixed(3)})`, transformOrigin: `${cx}px 118px` }} />
            </g>
          ))}
          <path className="fd-mask" d={MASK} fillRule="evenodd" />
          {showLabels && <text className="fd-note" x="22" y="210">behind ear</text>}
        </>
      ) : (
        <>
          <path className="fd-head" d="M150 26c55 0 96 44 98 104 2 44-12 74-26 94v50h-74v-28c-20 0-36-6-44-20l-8-12c-6-4-4-10 0-14l-6-8c-4-4 0-10 4-12l-8-20c-4-6-2-10 6-14 4-26 0-50 6-72 10-28 30-48 52-48z" />
          <path className="fd-mask" d="M96 104c30-6 70-2 104 22l8 14c-30 0-62 6-94 14-10 2-16-6-18-14z" />
          <path className="fd-strap-band" d="M206 126c18-4 36-4 50 2M206 156c18 4 36 4 50-2" />
          <ellipse className="fd-ear" cx="196" cy="160" rx="12" ry="22" />
          <g className="fd-module">
            <rect x="214" y="116" width="50" height="52" rx="14" />
            <path d="M226 142c5-7 9-9 13-9s8 2 13 9c-5 7-9 9-13 9s-8-2-13-9z" />
            <circle cx="239" cy="142" r="2.6" />
          </g>
          <path className="fd-cable" d="M214 130c-30-8-60-10-80-2M214 150c-20 20-6 38-10 42" />
          {showLabels && <text className="fd-note" x="214" y="186">module</text>}
        </>
      )}

      {ELECTRODES.map((e) => {
        const [x, y] = pos[e.id];
        const g = glow[e.id];
        const level = g?.level ?? 0;
        return (
          <g
            key={e.id}
            className={`fd-el k-${e.kind}${active === e.id ? ' on' : ''}`}
            role={onSelect ? 'button' : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? `${e.label}: ${e.name}, ${e.placement}` : undefined}
            aria-pressed={onSelect ? active === e.id : undefined}
            onClick={onSelect ? () => onSelect(e.id) : undefined}
            onKeyDown={onSelect ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect(e.id); } } : undefined}
          >
            {level > 0.02 && <circle className="fd-halo" cx={x} cy={y} r={8 + level * 12} style={{ opacity: 0.25 + level * 0.45 }} />}
            <circle className="fd-hit" cx={x} cy={y} r="14" />
            <circle className="fd-dot" cx={x} cy={y} r="6.5" />
            {showLabels && (() => {
              const [dx, dy] = LABEL_AT[view][e.id];
              const w = e.label.length * 7.5 + 10;
              return (
                <g className="fd-tag" aria-hidden="true">
                  <rect x={x + dx - w / 2} y={y + dy - 8} width={w} height="16" rx="5" />
                  <text className="fd-label" x={x + dx} y={y + dy + 4} textAnchor="middle">{e.label}</text>
                </g>
              );
            })()}
            {level > 0.15 && g && <text className="fd-sign" x={x + 11} y={y + 4}>{g.sign > 0 ? '+' : '−'}</text>}
          </g>
        );
      })}
    </svg>
  );
}
