import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { ORDER, PATIENT_MESSAGES, POS } from '@3inlink/core';
import { BrandMark, Icon } from '@3inlink/design-tokens';
import { prefersReducedMotion, useCountUp, useScrollEffects } from './motion';
import { FaceDiagram } from '../hardware/FaceDiagram';
import { DEVICE_STATUS, ELECTRODES, FEATURES } from '../hardware/device';
import { DemoSwitch } from '../lib/DemoSwitch';
import './home.css';

/** Stagger index for [data-reveal] children. */
const st = (i: number) => ({ '--i': i }) as CSSProperties;

/** Gaze grid in the hero: focus walks the ring (Phase 1 order) and a double blink "sends" once per lap. */
function MiniGrid() {
  const [step, setStep] = useState(3);
  const [reduced] = useState(prefersReducedMotion);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setStep((s) => (s + 1) % 10), 1300);
    return () => clearInterval(id);
  }, [reduced]);

  // steps 0–7 focus tiles; steps 8–9 hold on the last tile in the "sent" state
  const focus = step < 8 ? step : 7;
  const sent = step >= 8;
  const cmd = ORDER[focus]!;

  return (
    <div className="h-mini" aria-hidden="true">
      {ORDER.map((c, i) => (
        <div
          key={c}
          className="h-mini-tile"
          data-state={i === focus ? (sent ? 'sent' : 'focus') : 'idle'}
          style={{ gridRow: POS[i]![0] + 1, gridColumn: POS[i]![1] + 1 }}
        >
          <Icon name={c} />
        </div>
      ))}
      <div className="h-mini-panel" data-state={sent ? 'sent' : 'focus'}>
        <span className="h-mini-cap">{sent ? 'Sent to nursing staff' : 'Double blink to send'}</span>
        <span className="h-mini-msg" key={`${cmd}-${sent}`}>{PATIENT_MESSAGES[cmd].en}</span>
      </div>
    </div>
  );
}

const TRACE_D =
  'M0 80 L50 80 C62 79 70 82 84 80 L130 80 C138 60 144 30 152 28 C162 26 168 60 180 78 C188 90 196 84 206 80 L300 80 C306 100 312 130 322 132 C334 134 340 104 352 84 C358 76 366 80 372 80 L470 80 C474 60 478 40 483 42 C488 44 490 70 494 80 C498 108 500 118 505 118 C510 118 512 92 516 80 L536 80 C540 60 544 40 549 42 C554 44 556 70 560 80 C564 108 566 118 571 118 C576 118 578 92 582 80 L720 80';

/** The EOG trace from the design system. It draws itself when revealed, then a gaze dot rides the signal. */
function Trace() {
  const [reduced] = useState(prefersReducedMotion);
  return (
    <svg className="h-trace" viewBox="0 0 720 170" role="img"
      aria-label="EOG trace: a positive pulse for an upward glance, a negative pulse for a downward glance, and two fast spikes for a double blink, the confirm gesture.">
      <line className="grid" x1="0" y1="30" x2="720" y2="30" />
      <line className="grid" x1="0" y1="130" x2="720" y2="130" />
      <line className="base" x1="0" y1="80" x2="720" y2="80" />
      <rect className="zone z-up" x="126" y="14" width="86" height="142" rx="8" />
      <rect className="zone z-down" x="296" y="14" width="82" height="142" rx="8" />
      <rect className="zone z-blink" x="464" y="14" width="124" height="142" rx="8" />
      <path className="line" pathLength={1} d={TRACE_D} />
      {!reduced && (
        <circle className="dot" r="6">
          <animateMotion dur="7s" begin="2.6s" repeatCount="indefinite" path={TRACE_D} />
        </circle>
      )}
      <text x="140" y="10">UP · move</text>
      <text x="306" y="168">DOWN · move</text>
      <text x="472" y="10">DOUBLE BLINK · send</text>
    </svg>
  );
}

/** Big eye for the night band: glances up, glances down, then a double blink, on a slow loop. */
function Eye() {
  return (
    <svg className="h-eye" viewBox="0 0 120 80" aria-hidden="true">
      <defs>
        <clipPath id="h-eye-clip"><path d="M6 40C22 16 40 8 60 8s38 8 54 32c-16 24-34 32-54 32S22 64 6 40z" /></clipPath>
      </defs>
      <path className="h-eye-outline" d="M6 40C22 16 40 8 60 8s38 8 54 32c-16 24-34 32-54 32S22 64 6 40z" />
      <g clipPath="url(#h-eye-clip)">
        <g className="h-eye-pupil">
          <circle cx="60" cy="40" r="17" className="h-eye-iris" />
          <circle cx="60" cy="40" r="8" className="h-eye-core" />
          <circle cx="65" cy="35" r="3" className="h-eye-glint" />
        </g>
        <rect className="h-eye-lid" x="0" y="0" width="120" height="80" />
      </g>
    </svg>
  );
}

function Fact({ to, decimals = 0, suffix = '', label, i }: { to: number; decimals?: number; suffix?: string; label: string; i: number }) {
  const ref = useRef<HTMLElement>(null);
  const v = useCountUp(to, decimals, ref);
  return (
    <div data-reveal style={st(i)}>
      <b ref={ref}>{v}{suffix}</b>
      <span>{label}</span>
    </div>
  );
}

const STEPS = [
  { t: 'Sense', d: 'Electrodes around the eyes read the corneo-retinal potential. No camera, so it works in the dark.' },
  { t: 'Amplify', d: 'An AD620 amplifier and a 0.1–35 Hz filter, battery powered to avoid 50 Hz mains noise. An ESP32 digitizes at 250 Hz.' },
  { t: 'Recognize', d: 'A classifier labels each 3-second window: up, down, straight or double blink.' },
  { t: 'Alert', d: 'The confirmed message reaches the nurses’ phones with the patient ID and room, in real time.' },
];

const FOR = [
  { t: 'Post-surgery', d: 'Patients who cannot speak or move for a while, for example while intubated.', icon: 'bed' as const },
  { t: 'Paralysis', d: 'People with severe mobility limits who still control their eyes.', icon: 'nurse' as const },
  { t: 'ALS in emergencies', d: 'A fast, reliable way to reach staff when speech and hands fail.', icon: 'pain' as const },
  { t: 'Locked-in syndrome (LiS)', d: 'Fully conscious people who cannot move or speak, but can still move their eyes up and down and blink.', icon: 'family' as const },
];

const scrollTo = (id: string) => (e: MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
};

export function Home() {
  const root = useRef<HTMLDivElement>(null);
  useScrollEffects(root);
  useEffect(() => { document.documentElement.dataset.mode = 'day'; }, []);

  return (
    <div className="home" data-mode="day" ref={root}>
      <header className="h-nav">
        <a className="h-brand" href="#/"><BrandMark />3inLink</a>
        <nav aria-label="Sections">
          <a href="#try" onClick={scrollTo('try')}>Try it</a>
          <a href="#how" onClick={scrollTo('how')}>How it works</a>
          <a href="#device" onClick={scrollTo('device')}>The device</a>
          <a href="#who" onClick={scrollTo('who')}>Who it helps</a>
        </nav>
        <DemoSwitch current="#/" drawerOnly sections={[
          { id: 'try', label: 'Try it' }, { id: 'how', label: 'How it works' },
          { id: 'device', label: 'The device' }, { id: 'who', label: 'Who it helps' },
        ]} />
        <span className="h-progress" aria-hidden="true" />
      </header>

      <section className="h-hero" data-mode="night">
        <span className="h-glow" aria-hidden="true" />
        <div className="h-hero-text">
          <p className="h-eyebrow" data-reveal style={st(0)}>Connecting patients through their eyes</p>
          <h1 data-reveal style={st(1)}>Your eyes can call for help.</h1>
          <p className="h-lead" data-reveal style={st(2)}>
            3inLink is a low-cost wearable that turns eye movements and blinks into requests for the nursing team,
            for patients who cannot speak or move.
          </p>
          <div className="h-cta" data-reveal style={st(3)}>
            <a className="h-btn" href="#/demo"><Icon name="play" />Watch the live demo</a>
            <a className="h-btn ghost" href="#/patient">Try the patient screen</a>
          </div>
          <p className="h-note" data-reveal style={st(4)}>Research prototype. Not a certified medical device.</p>
        </div>
        <div className="h-mini-wrap" data-reveal data-reveal-kind="zoom" style={st(2)}>
          <MiniGrid />
        </div>
        <a className="h-scroll" href="#vocab" onClick={scrollTo('vocab')} aria-label="Scroll down"><Icon name="down" /></a>
      </section>

      <main className="h-main">
        <section className="h-sec h-signal" id="vocab">
          <div className="h-sec-head">
            <p className="h-eyebrow" data-reveal>The whole vocabulary</p>
            <h2 data-reveal style={st(1)}>Look up or down to move. Blink twice to send.</h2>
            <p className="h-sub" data-reveal style={st(2)}>
              Looking only previews a message, and it is read aloud. Nothing reaches staff until a deliberate double blink,
              because people blink naturally all the time.
            </p>
          </div>
          <div className="h-trace-wrap" data-reveal style={st(3)}><Trace /></div>
        </section>

        <section className="h-sec" id="try">
          <div className="h-sec-head">
            <p className="h-eyebrow" data-reveal>Try it now</p>
            <h2 data-reveal style={st(1)}>Open both screens and send a message</h2>
            <p className="h-sub" data-reveal style={st(2)}>Put the two side by side, or open the care assistant app on your phone with the same link.</p>
          </div>
          <div className="h-try">
            <a className="h-card" href="#/patient" data-reveal style={st(0)}>
              <span className="h-card-ic"><Icon name="water" /></span>
              <span className="h-card-t">Patient screen</span>
              <span className="h-card-d">Eight messages around a panel in English, Arabic and French. Night mode by default.</span>
              <span className="h-keys">
                <span><kbd>↑</kbd><kbd>↓</kbd> move</span>
                <span><kbd>Space</kbd><kbd>Space</kbd> send</span>
              </span>
              <span className="h-card-go">Open <Icon name="right" /></span>
            </a>
            <a className="h-card" href="#/nurse" data-reveal style={st(1)}>
              <span className="h-card-ic urgent"><Icon name="pain" /></span>
              <span className="h-card-t">Care assistant app</span>
              <span className="h-card-d">Live list of patient requests with ID and room. Pain is pinned in red. Tap to mark handled.</span>
              <span className="h-keys"><span>Works on any phone, no install</span></span>
              <span className="h-card-go">Open <Icon name="right" /></span>
            </a>
          </div>
        </section>

        <section className="h-sec" id="how">
          <div className="h-sec-head">
            <p className="h-eyebrow" data-reveal>How it works</p>
            <h2 data-reveal style={st(1)}>From a glance to an alert in four steps</h2>
          </div>
          <ol className="h-steps">
            {STEPS.map((s, i) => <li key={s.t} data-reveal style={st(i)}><b>{s.t}</b><span>{s.d}</span></li>)}
          </ol>
          <div className="h-facts">
            <Fact i={0} to={99.4} decimals={1} suffix="%" label="accuracy of the LDA classifier on 182 recordings from 21 people (5-fold cross-validation)" />
            <Fact i={1} to={8} label="messages, from “I feel pain” to “Call my family”" />
            <Fact i={2} to={3} label="languages with equal rank: English, Arabic, French" />
          </div>
        </section>

        <section className="h-sec" id="device">
          <div className="h-sec-head">
            <p className="h-eyebrow" data-reveal>The device · {DEVICE_STATUS.split(' · ')[1]}</p>
            <h2 data-reveal style={st(1)}>A light mask, a module behind the ear</h2>
            <p className="h-sub" data-reveal style={st(2)}>
              Five electrodes around the eye pick up the signal. The module amplifies, filters and digitises it,
              then sends it over Bluetooth. No camera, and it runs on a rechargeable battery.
            </p>
          </div>
          <div className="h-device">
            <div className="h-device-art" data-reveal data-reveal-kind="zoom"><FaceDiagram view="front" /></div>
            <div className="h-device-side">
              <ul className="h-device-els">
                {ELECTRODES.map((e, i) => (
                  <li key={e.id} className={`k-${e.kind}`} data-reveal style={st(i)}><span className="hw-el-dot" /><b>{e.label}</b><span>{e.placement}</span></li>
                ))}
              </ul>
              <div className="h-device-feats">
                {FEATURES.map((f, i) => (
                  <span key={f.title} data-reveal style={st(i)}><Icon name={f.icon} />{f.title}</span>
                ))}
              </div>
              <a className="h-device-go" href="#/hardware" data-reveal>Explore the hardware <Icon name="right" /></a>
            </div>
          </div>
        </section>

        <section className="h-sec" id="who">
          <div className="h-sec-head">
            <p className="h-eyebrow" data-reveal>Who it helps</p>
            <h2 data-reveal style={st(1)}>For patients who can still move their eyes</h2>
          </div>
          <div className="h-for">
            {FOR.map((f, i) => (
              <div key={f.t} data-reveal style={st(i)}>
                <span className="h-for-ic"><Icon name={f.icon} /></span>
                <b>{f.t}</b><span>{f.d}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="h-band" data-mode="night">
        <div data-reveal data-reveal-kind="zoom"><Eye /></div>
        <p className="h-eyebrow" data-reveal style={st(1)}>Built for the ward at night</p>
        <h2 data-reveal style={st(2)}>No camera. No light needed.</h2>
        <p data-reveal style={st(3)}>
          Camera-based eye trackers depend on room lighting. 3inLink reads electrical signals from the skin,
          so patients can rest in a dark, quiet room and still ask for help.
        </p>
      </section>

      <footer className="h-foot">
        <span className="h-brand small"><BrandMark />3inLink</span>
        <span>Thirduni Project · Dr. Ahlem Benazzouz · Eng. Mohamed Riad Doukha</span>
        <span>October 2026</span>
      </footer>
    </div>
  );
}
