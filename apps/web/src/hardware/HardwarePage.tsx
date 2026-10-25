import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BrandMark, Icon } from '@3inlink/design-tokens';
import { DemoSwitch } from '../lib/DemoSwitch';
import { useScrollEffects } from '../home/motion';
import { FaceDiagram } from './FaceDiagram';
import { ModuleDiagram } from './ModuleDiagram';
import { HardwareSim } from './HardwareSim';
import {
  CHANNELS, COMPONENTS, DEVICE_STATUS, ELECTRODES, FEATURES, MODULE_PARTS, MODULE_VIEWS, PIPELINE,
  type ElectrodeId, type ModuleView, type PartId,
} from './device';
import './hardware.css';

const st = (i: number) => ({ '--i': i }) as CSSProperties;

export function HardwarePage() {
  const root = useRef<HTMLDivElement>(null);
  useScrollEffects(root);
  useEffect(() => { document.documentElement.dataset.mode = 'day'; }, []);

  const [electrode, setElectrode] = useState<ElectrodeId>('vp');
  const [view, setView] = useState<ModuleView>('upper');
  const [part, setPart] = useState<PartId>('ble');
  const e = ELECTRODES.find((x) => x.id === electrode)!;
  const partsInView = MODULE_VIEWS.find((v) => v.id === view)!.parts;
  const shownPart = partsInView.includes(part) ? part : partsInView[0]!;

  return (
    <div className="hw" data-mode="day" ref={root}>
      <header className="hw-nav">
        <a className="hw-brand" href="#/"><BrandMark />3inLink</a>
        <DemoSwitch current="#/hardware" />
      </header>

      <section className="hw-hero" data-mode="night">
        <div className="hw-hero-text">
          <p className="hw-badge" data-reveal>{DEVICE_STATUS}</p>
          <h1 data-reveal style={st(1)}>3inLink Eye System</h1>
          <p className="hw-tagline" data-reveal style={st(2)}>See · Interact · Connect</p>
          <p className="hw-lead" data-reveal style={st(3)}>
            A soft mask carries five electrodes around the eye. A small module behind the ear amplifies, filters and
            digitises the signal, then sends it over Bluetooth to the unit that recognises each glance and blink.
          </p>
          <div className="hw-cta" data-reveal style={st(4)}>
            <a className="hw-btn" href="#sim" onClick={(ev) => { ev.preventDefault(); document.getElementById('sim')?.scrollIntoView({ behavior: 'smooth' }); }}>
              <Icon name="play" />Try the simulation
            </a>
            <a className="hw-btn ghost" href="#/demo">Watch real recordings</a>
          </div>
        </div>
        <div className="hw-hero-art" data-reveal data-reveal-kind="zoom" style={st(2)}>
          <FaceDiagram view="side" showLabels={false} />
        </div>
      </section>

      <main className="hw-main">
        <section className="hw-sec" id="wear">
          <div className="hw-head">
            <p className="hw-eyebrow" data-reveal>Wearing it</p>
            <h2 data-reveal style={st(1)}>Five electrodes, two channels</h2>
            <p className="hw-sub" data-reveal style={st(2)}>Tap an electrode to see where it sits and what it measures.</p>
          </div>
          <div className="hw-wear">
            <div className="hw-figures" data-reveal>
              <figure><FaceDiagram view="front" active={electrode} onSelect={setElectrode} /><figcaption>Front</figcaption></figure>
              <figure><FaceDiagram view="side" active={electrode} onSelect={setElectrode} /><figcaption>Side · module and reference</figcaption></figure>
            </div>
            <div className="hw-detail" data-reveal style={st(1)}>
              <div className={`hw-el-card k-${e.kind}`} aria-live="polite">
                <span className="hw-el-dot" />
                <div>
                  <b>{e.label} · {e.name}</b>
                  <span>{e.placement}</span>
                  <p>{e.role}</p>
                </div>
              </div>
              <ul className="hw-el-list">
                {ELECTRODES.map((x) => (
                  <li key={x.id}>
                    <button className={`k-${x.kind}`} aria-pressed={x.id === electrode} onClick={() => setElectrode(x.id)}>
                      <span className="hw-el-dot" />{x.label}<small>{x.placement}</small>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="hw-channels">
                {CHANNELS.map((c) => (
                  <div key={c.id}><b>{c.id} channel</b><span className="mono">{c.pair}</span><span>{c.detects}</span></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="hw-sec" id="module">
          <div className="hw-head">
            <p className="hw-eyebrow" data-reveal>The module</p>
            <h2 data-reveal style={st(1)}>Everything fits behind the ear</h2>
          </div>
          <div className="hw-module" data-reveal>
            <div className="hw-tabs" role="tablist" aria-label="Module views">
              {MODULE_VIEWS.map((v) => (
                <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => setView(v.id)}>{v.label}</button>
              ))}
            </div>
            <div className="hw-module-body">
              <div className="hw-module-art"><ModuleDiagram view={view} selected={shownPart} onSelect={setPart} /></div>
              <div className="hw-part" aria-live="polite">
                <b>{MODULE_PARTS[shownPart].title}</b>
                <p>{MODULE_PARTS[shownPart].text}</p>
                <div className="hw-part-list">
                  {partsInView.map((id) => (
                    <button key={id} aria-pressed={id === shownPart} onClick={() => setPart(id)}>{MODULE_PARTS[id].title}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="hw-cards">
            {COMPONENTS.map((c, i) => (
              <div key={c.title} className="hw-card" data-reveal style={st(i)}>
                <span className="hw-ic"><Icon name={c.icon} /></span>
                <b>{c.title}</b>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="hw-sim-band" id="sim" data-mode="night">
        <div className="hw-head">
          <p className="hw-eyebrow" data-reveal>Hardware simulation</p>
          <h2 data-reveal style={st(1)}>Turn it on and move the eye</h2>
          <p className="hw-sub" data-reveal style={st(2)}>
            Power the module, wait for Bluetooth, then look up, down, left or right, or blink. Watch the electrodes,
            the two channels and the data path. The signal here is simulated; real recordings are in the live demo.
          </p>
        </div>
        <div data-reveal style={st(3)}><HardwareSim /></div>
      </section>

      <main className="hw-main">
        <section className="hw-sec">
          <div className="hw-head">
            <p className="hw-eyebrow" data-reveal>Key features</p>
            <h2 data-reveal style={st(1)}>Made for a night on the ward</h2>
          </div>
          <div className="hw-features">
            {FEATURES.map((f, i) => (
              <div key={f.title} data-reveal style={st(i)}>
                <span className="hw-ic"><Icon name={f.icon} /></span>
                <b>{f.title}</b>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="hw-sec">
          <div className="hw-head">
            <p className="hw-eyebrow" data-reveal>From skin to screen</p>
            <h2 data-reveal style={st(1)}>The path of one glance</h2>
          </div>
          <ol className="hw-pipeline">
            {PIPELINE.map((p, i) => (
              <li key={p.id} data-reveal style={st(i)}><b>{p.title}</b><span>{p.text}</span></li>
            ))}
          </ol>
          <p className="hw-note" data-reveal>
            {DEVICE_STATUS}. The working prototype today is the acquisition circuit with an ESP32 and a laptop; the
            wearable mask and module are the design being built (PCB in progress).
          </p>
        </section>
      </main>

      <footer className="hw-foot">
        <span className="hw-brand small"><BrandMark />3inLink</span>
        <span>Thirduni Project · Dr. Ahlem Benazzouz · Eng. Mohamed Riad Doukha</span>
      </footer>
    </div>
  );
}
