import { useId } from 'react';
import { ELECTRODES, type ElectrodeId } from './device';
import './diagrams.css';

/** Electrode positions in the 300 × 280 drawing. Front: the electrodes sit around the viewer's left eye. */
const FRONT: Record<ElectrodeId, [number, number]> = {
  vp: [100, 106], vm: [100, 167], hp: [58, 136], hm: [141, 136], ref: [37, 182],
};
const SIDE: Record<ElectrodeId, [number, number]> = {
  vp: [122, 113], vm: [122, 146], hp: [144, 129], hm: [103, 125], ref: [224, 188],
};

/** Where each label sits relative to its dot, so labels never cover an eye. */
const LABEL_AT: Record<'front' | 'side', Record<ElectrodeId, [number, number]>> = {
  front: { vp: [0, -18], vm: [0, 19], hp: [-24, 0], hm: [0, 19], ref: [0, -17] },
  side: { vp: [0, -19], vm: [0, 19], hp: [6, -18], hm: [-24, -2], ref: [-26, 6] },
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
          {/* profile facing left: head and neck, hair cap, ear, then the mask, strap, module and reference cable */}
          <path className="fd-head" d="M168 20C226 20 262 62 262 118C262 156 250 182 238 198C234 214 236 244 240 280H150C150 262 149 250 146 240C132 238 120 232 113 222C108 216 107 210 109 205C107 199 106 195 108 191C106 187 106 183 108 180C106 176 107 173 111 171C102 170 92 166 89 160C90 150 97 140 100 130C102 122 99 114 101 106C106 60 128 20 168 20Z" />
          <path className="fd-hair" d="M124 60c10-26 30-42 50-44 52-4 86 34 88 92 2 36-6 66-18 88l-14-6c4-14 6-30 2-44-2-16-8-26-16-34-6-18-20-28-40-32-20-4-36-10-52-20z" />
          <path className="fd-ear side" d="M206 132c14-4 20 14 16 28-2 14-10 22-18 16 6-12 4-30 2-44z" />
          <path className="fd-ear-in" d="M210 144c5 3 6 11 3 19" />
          <path className="fd-strap" d="M202 114c22 0 42-4 60-10l2 22c-18 6-40 10-62 12z" />
          <path className="fd-mask" fillRule="evenodd" d="M99 108c34-6 70-4 104 6v26c-34 4-70 8-103 10-6-14-7-28-1-42zM110 129a12 8 0 1 0 24 0a12 8 0 1 0-24 0z" />
          <path className="fd-sclera" d="M110 129c5-5 9-7 13-7s8 2 11 7c-3 5-7 7-11 7s-8-2-13-7z" />
          <circle className="fd-iris" cx="118" cy="129" r="4.6" />
          <circle className="fd-pupil" cx="117" cy="129" r="2.2" />
          <path className="fd-cable" d="M240 142c-2 16-8 30-16 42" />
          <g className="fd-module">
            <rect x="220" y="100" width="44" height="42" rx="12" />
            <path d="M231 121c4-6 8-8 11-8s7 2 11 8c-4 6-8 8-11 8s-7-2-11-8z" />
            <circle cx="242" cy="121" r="2.4" />
          </g>
          {showLabels && <text className="fd-note" x="216" y="92">module</text>}
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
