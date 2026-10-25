import { useCallback, useEffect, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@3inlink/design-tokens';
import { FaceDiagram, type Gaze } from './FaceDiagram';
import { ModuleDiagram } from './ModuleDiagram';
import { PIPELINE, type ElectrodeId } from './device';
import {
  ACTION_S, ACTION_TEXT, LOW_BATTERY, actionSignal, baselineNoise, initialDevice, reduceDevice,
  type EyeAction,
} from './sim';

const ACTIONS: EyeAction[] = ['up', 'down', 'left', 'right', 'blink', 'double_blink'];
const KEYS: Record<string, EyeAction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ' ': 'blink', Enter: 'double_blink' };
const RATE = 100;          // samples a second on the scope
const WINDOW_S = 3;        // seconds shown
const H_FULL = 480, V_FULL = 350, SCALE_UV = 700;

type Glow = Partial<Record<ElectrodeId, { level: number; sign: 1 | -1 }>>;

/**
 * Interactive model of the wearable: power and Bluetooth pairing, battery and USB-C charging, and what
 * each eye action does to the electrodes and the two EOG channels. Self-contained: it sends no alerts.
 */
export function HardwareSim() {
  const [dev, dispatch] = useReducer(reduceDevice, initialDevice);
  const devRef = useRef(dev);
  devRef.current = dev;
  const live = dev.power && dev.ble === 'connected';

  const action = useRef<{ a: EyeAction; t0: number } | null>(null);
  const [face, setFace] = useState<{ gaze: Gaze; glow: Glow }>({ gaze: { x: 0, y: 0, lid: 0 }, glow: {} });
  const [result, setResult] = useState<string>('Press the power button on the module to start.');
  const [pulse, setPulse] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);

  // device clock: pairing, battery drain and charge
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', t: performance.now(), dt: 0.1 }), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!dev.power) setResult(dev.battery <= 0 ? 'Battery empty. Plug in USB-C to charge, then power on.' : 'Device off: the electrodes still see the eye, but nothing is sent.');
    else if (dev.ble === 'pairing') setResult('Pairing over Bluetooth…');
    else setResult('Connected. Move the eye with the buttons or the arrow keys.');
  }, [dev.power, dev.ble, dev.battery <= 0]);

  const run = useCallback((a: EyeAction) => {
    action.current = { a, t0: performance.now() };
    const d = devRef.current;
    if (d.power && d.ble === 'connected') {
      setResult(ACTION_TEXT[a].result);
      setPulse((p) => p + 1);
    } else {
      setResult(d.power ? 'Still pairing: the signal is not reaching the processing unit yet.' : 'Device off: no signal is sent, so nothing reaches the screen.');
    }
  }, []);

  // scope + face, one animation loop
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const n = RATE * WINDOW_S;
    const H = new Float32Array(n), V = new Float32Array(n);
    let head = 0, lastSample = performance.now(), raf = 0, last = { x: 0, y: 0, lid: 0 };
    const css = getComputedStyle(cv);
    const col = (v: string) => css.getPropertyValue(v).trim();

    const frame = (now: number) => {
      // sample at a fixed rate
      while (lastSample + 1000 / RATE <= now) {
        lastSample += 1000 / RATE;
        const a = action.current;
        const t = a ? (lastSample - a.t0) / 1000 : -1;
        const s = a ? actionSignal(a.a, t) : { h: 0, v: 0 };
        const d = devRef.current, on = d.power && d.ble === 'connected';
        H[head] = on ? s.h + baselineNoise(lastSample / 1000) : 0;
        V[head] = on ? s.v + baselineNoise(lastSample / 1000 + 3.1) : 0;
        head = (head + 1) % n;
        if (a && t > ACTION_S) action.current = null;
      }

      // face: the eye always moves; electrodes only light when the device is live
      const a = action.current;
      const t = a ? (now - a.t0) / 1000 : -1;
      const s = a ? actionSignal(a.a, t) : { h: 0, v: 0 };
      const isBlink = a && (a.a === 'blink' || a.a === 'double_blink');
      const gaze = {
        x: Math.max(-1, Math.min(1, s.h / H_FULL)),
        y: isBlink ? 0 : Math.max(-1, Math.min(1, -s.v / V_FULL)),
        lid: isBlink ? Math.min(1, s.v / 300) : 0,
      };
      if (Math.abs(gaze.x - last.x) + Math.abs(gaze.y - last.y) + Math.abs(gaze.lid - last.lid) > 0.01 || (a === null && (last.x || last.y || last.lid))) {
        last = a ? gaze : { x: 0, y: 0, lid: 0 };
        const d = devRef.current, on = d.power && d.ble === 'connected';
        const hl = Math.min(1, Math.abs(s.h) / H_FULL), vl = Math.min(1, Math.abs(s.v) / (isBlink ? 650 : V_FULL));
        const glow: Glow = on && a ? {
          hp: { level: hl, sign: s.h >= 0 ? 1 : -1 }, hm: { level: hl, sign: s.h >= 0 ? -1 : 1 },
          vp: { level: vl, sign: s.v >= 0 ? 1 : -1 }, vm: { level: vl, sign: s.v >= 0 ? -1 : 1 },
        } : {};
        setFace({ gaze: last, glow });
      }

      // scope
      const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(r.width * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = r.width, h = r.height, lane = h / 2;
      ctx.clearRect(0, 0, w, h);
      ctx.font = '600 11px "IBM Plex Mono", ui-monospace, monospace';
      [['H', H, col('--action')], ['V', V, col('--focus')]].forEach(([label, buf, color], li) => {
        const mid = lane * li + lane / 2;
        ctx.strokeStyle = col('--line'); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
        ctx.fillStyle = col('--muted'); ctx.fillText(`${label as string} channel`, 6, lane * li + 14);
        ctx.strokeStyle = color as string; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const v = (buf as Float32Array)[(head + i) % n]!;
          const x = (i / (n - 1)) * w, y = mid - (v / SCALE_UV) * (lane / 2 - 6);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      const d = devRef.current;
      if (!(d.power && d.ble === 'connected')) {
        ctx.fillStyle = col('--muted'); ctx.textAlign = 'center';
        ctx.fillText(d.power ? 'PAIRING…' : 'NO SIGNAL · DEVICE OFF', w / 2, h / 2 + 4);
        ctx.textAlign = 'start';
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onKey = (e: KeyboardEvent) => {
    const a = KEYS[e.key];
    if (a) { e.preventDefault(); run(a); }
  };

  const low = dev.battery < LOW_BATTERY;

  return (
    <div className="sim" data-mode="night" tabIndex={0} onKeyDown={onKey} aria-label="Hardware simulation. Arrow keys move the eye, Space blinks, Enter double blinks.">
      <div className="sim-grid">
        <section className="sim-card sim-face" aria-label="The wearer">
          <h3>The wearer</h3>
          <FaceDiagram gaze={face.gaze} glow={face.glow} />
          <div className="sim-actions" role="group" aria-label="Eye actions">
            {ACTIONS.map((a) => (
              <button key={a} onClick={() => run(a)}>{ACTION_TEXT[a].label}</button>
            ))}
          </div>
        </section>

        <section className="sim-card sim-module" aria-label="The module">
          <h3>The module</h3>
          <ModuleDiagram view="left" power={dev.power} ble={dev.ble} battery={dev.battery} charging={dev.charging} onPower={() => dispatch({ type: 'power', t: performance.now() })} />
          <div className="sim-status">
            <span className={`sim-chip ble-${dev.ble}`}><Icon name="bluetooth" />{dev.ble === 'connected' ? 'Connected' : dev.ble === 'pairing' ? 'Pairing…' : 'Off'}</span>
            <span className={`sim-chip${low ? ' low' : ''}`}><Icon name="battery" />{Math.round(dev.battery)} %{dev.charging ? ' · charging' : low ? ' · low' : ''}</span>
          </div>
          <div className="sim-controls">
            <button className={`sim-power${dev.power ? ' is-on' : ''}`} onClick={() => dispatch({ type: 'power', t: performance.now() })}>
              <Icon name="power" />{dev.power ? 'Power off' : 'Power on'}
            </button>
            <button className={`sim-usb${dev.charging ? ' is-on' : ''}`} aria-pressed={dev.charging} onClick={() => dispatch({ type: 'charge', on: !dev.charging })}>
              <Icon name="usb" />{dev.charging ? 'Unplug USB-C' : 'Plug USB-C'}
            </button>
          </div>
        </section>

        <section className="sim-card sim-scope" aria-label="EOG channels">
          <h3>Two EOG channels <span className="sim-tag">simulated signal</span></h3>
          <canvas ref={canvas} className="sim-canvas" role="img" aria-label="Horizontal and vertical EOG channels, last 3 seconds" />
          <p className={`sim-result${live ? ' live' : ''}`} aria-live="polite">{result}</p>
        </section>
      </div>

      <ol className="sim-path" aria-label="Data path">
        {PIPELINE.map((p, i) => (
          <li key={`${p.id}-${pulse}`} className={live ? 'live' : ''} style={{ animationDelay: `${i * 0.12}s` }} data-pulse={pulse > 0 && live ? 'on' : undefined}>
            <b>{p.title}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}
