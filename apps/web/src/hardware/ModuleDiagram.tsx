import { useId, type ReactNode } from 'react';
import { MODULE_PARTS, type ModuleView, type PartId } from './device';
import type { Ble } from './sim';
import './diagrams.css';

const CABLES = ['H+', 'H−', 'REF', 'V+', 'V−'];

interface Props {
  view: ModuleView;
  selected?: PartId | null;
  onSelect?(id: PartId): void;
  /** Live state for the simulation. Defaults show a connected, charged module. */
  power?: boolean;
  ble?: Ble;
  battery?: number;
  charging?: boolean;
  onPower?(): void;
}

/** The module behind the ear, in the three views of the design sheet. Parts are selectable hotspots. */
export function ModuleDiagram({ view, selected = null, onSelect, power = true, ble = 'connected', battery = 80, charging = false, onPower }: Props) {
  const uid = useId().replace(/:/g, '');
  const lit = power || charging ? Math.max(1, Math.ceil(battery / 25)) : 0;
  const hot = (id: PartId, children: ReactNode, onClick?: () => void) => (
    <g
      className={`md-hot${selected === id ? ' on' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={MODULE_PARTS[id].title}
      aria-pressed={selected === id}
      onClick={() => { onSelect?.(id); onClick?.(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(id); onClick?.(); } }}
    >
      {children}
    </g>
  );

  return (
    <svg className="md" viewBox="0 0 360 210" role="group" aria-label={`Module, ${view} side`}>
      <defs>
        <linearGradient id={`b-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a323d" />
          <stop offset="1" stopColor="#07090d" />
        </linearGradient>
      </defs>

      {hot('cables', (
        <>
          {CABLES.map((c, i) => {
            const y = 66 + i * 19;
            return (
              <g key={c}>
                <path className="md-cable" d={`M112 ${80 + i * 13}C80 ${80 + i * 13} 76 ${y} 52 ${y}`} />
                <circle className="md-gold" cx="46" cy={y} r="6" />
                <text className="md-cable-label" x="34" y={y + 4} textAnchor="end">{c}</text>
              </g>
            );
          })}
          <rect className="md-hit" x="0" y="54" width="114" height="104" />
        </>
      ))}

      <rect className="md-body" x="110" y="55" width="222" height="110" rx="34" fill={`url(#b-${uid})`} />

      {view === 'down' ? (
        hot('clip', (
          <g className="md-clip">
            <rect x="176" y="72" width="96" height="76" rx="12" />
            <rect x="196" y="88" width="56" height="44" rx="8" />
          </g>
        ))
      ) : (
        hot('ble', (
          <g className={`md-logo ble-${ble}`} transform={view === 'left' ? 'translate(0 -14)' : undefined}>
            <path d="M196 110c8-12 16-16 25-16s17 4 25 16c-8 12-16 16-25 16s-17-4-25-16z" />
            <circle cx="221" cy="110" r="5" />
            <circle cx="221" cy="86" r="2.6" />
            <circle cx="221" cy="134" r="2.6" />
          </g>
        ))
      )}

      {view === 'left' && (
        <>
          {hot('power', (
            <g className={`md-power${power ? ' is-on' : ''}`}>
              <circle cx="168" cy="140" r="11" />
              <path d="M168 133v6M163.5 135.5a6.5 6.5 0 1 0 9 0" />
            </g>
          ), onPower)}
          {hot('leds', (
            <g className="md-leds">
              {[0, 1, 2, 3].map((i) => (
                <circle key={i} cx={200 + i * 12} cy="140" r="3.6" className={i < lit ? (battery < 15 ? 'low' : charging ? 'chg' : 'on') : ''} />
              ))}
              <rect className="md-hit" x="192" y="130" width="52" height="20" />
            </g>
          ))}
          {hot('usb', (
            <g className={`md-usb${charging ? ' is-on' : ''}`}>
              <rect x="262" y="134" width="30" height="12" rx="6" />
              <path d="M270 140h14" />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
