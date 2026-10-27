import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DECISION_TEXT, ORDER, PATIENT_MESSAGES, decisionToInput, initialHci, reduceHci,
  type Decision, type DecisionLabel, type HciInput, type HciState, type Session, type SessionIndexEntry,
} from '@3inlink/core';
import { BrandMark, Icon } from '@3inlink/design-tokens';
import { DemoSwitch } from '../lib/DemoSwitch';
import { Scaled } from '../lib/Scaled';
import { useMedia } from '../lib/useMedia';
import { publishGaze } from '../lib/gazeBus';
import { alertStore } from '../lib/alertStore';
import { PatientScreen } from '../patient/PatientScreen';
import { ReplayClock } from './ReplayClock';
import { SignalPlot } from './SignalPlot';
import { EyeSim } from './EyeSim';
import './demo.css';

const BASE = import.meta.env.BASE_URL;

const SHORT: Record<DecisionLabel, string> = {
  up: 'UP', down: 'DN', left: 'L', right: 'R', straight: '—', blink: 'B', double_blink: 'DB',
};

/** What a decision did on the patient screen, for the timeline. */
interface Outcome { kind: 'move' | 'send' | 'none'; text: string }

function toGazeEvent(i: HciInput) {
  if (i.type === 'gaze') publishGaze({ type: 'gaze', dir: i.dir });
  else if (i.type === 'confirm') publishGaze({ type: 'confirm' });
  else if (i.type === 'blink') publishGaze({ type: 'blink' });
}

/** Mirrors the patient screen's state machine so the timeline can say what each decision did. */
function outcome(prev: HciState, next: HciState, input: HciInput | null): Outcome {
  if (!input) return { kind: 'none', text: 'No move' };
  const msg = next.cur === null ? '' : PATIENT_MESSAGES[ORDER[next.cur]!].en;
  if (next.status === 'sent' && prev.status !== 'sent') return { kind: 'send', text: `Sent: ${msg}` };
  if (input.type === 'gaze') return { kind: 'move', text: msg };
  if (prev.status === 'sent') return { kind: 'none', text: 'Already sent' };
  return { kind: 'none', text: 'Nothing selected' };
}

export function DemoRoom() {
  const [index, setIndex] = useState<SessionIndexEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState<ReplayClock | null>(null);
  const [view, setView] = useState({ t: 0, playing: false, speed: 1 });
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  const shadow = useRef<HciState>(initialHci);
  // on phones the patient screen is laid out at a phone-like width so its text stays readable
  const narrow = useMedia('(max-width: 900px)');

  useEffect(() => { document.documentElement.dataset.mode = 'night'; }, []);

  useEffect(() => {
    fetch(`${BASE}sessions/index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((list: SessionIndexEntry[]) => { setIndex(list); setSessionId(list[0]?.id ?? null); })
      .catch(() => setError('Could not load the recordings. Reload the page to try again.'));
  }, []);

  useEffect(() => {
    const entry = index.find((s) => s.id === sessionId);
    if (!entry) return;
    setSession(null);
    fetch(`${BASE}sessions/${entry.file}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((s: Session) => setSession(s))
      .catch(() => setError('Could not load this recording. Reload the page to try again.'));
  }, [index, sessionId]);

  const resetPatient = useCallback((s: Session) => {
    shadow.current = initialHci;
    setOutcomes({});
    publishGaze({ type: 'phase', phase: s.meta.phase });
    publishGaze({ type: 'clear' });
  }, []);

  useEffect(() => {
    if (!session) return;
    const onDecision = (d: Decision) => {
      const input = decisionToInput(d.label, performance.now());
      const prev = shadow.current;
      const next = input ? reduceHci(prev, input, session.meta.phase) : prev;
      shadow.current = next;
      if (input) toGazeEvent(input);
      setOutcomes((o) => ({ ...o, [d.t]: outcome(prev, next, input) }));
    };
    const c = new ReplayClock(session, onDecision);
    let lastT = -1, lastPlaying = false, lastSpeed = 1;
    const off = c.subscribe((t) => {
      // the plot redraws every frame on its own; the rest of the page only needs ~10 updates a second
      if (Math.abs(t - lastT) >= 0.1 || c.playing !== lastPlaying || c.speed !== lastSpeed || t === 0) {
        lastT = t; lastPlaying = c.playing; lastSpeed = c.speed;
        setView({ t, playing: c.playing, speed: c.speed });
      }
    });
    setClock(c);
    // the embedded patient screen subscribes on mount; reset it once it is listening
    const id = setTimeout(() => resetPatient(session), 0);
    return () => { clearTimeout(id); off(); c.dispose(); };
  }, [session, resetPatient]);

  const restart = () => {
    if (!clock || !session) return;
    clock.restart();
    resetPatient(session);
  };

  const togglePlay = () => {
    if (!clock || !session) return;
    if (clock.playing) { clock.pause(); return; }
    if (clock.t >= clock.duration || clock.t === 0) { clock.restart(); resetPatient(session); }
    clock.play();
  };

  const meta = session?.meta;
  const lastDecision = session?.decisions.filter((d) => d.t <= view.t).at(-1);
  const last = lastDecision && outcomes[lastDecision.t] ? { d: lastDecision, o: outcomes[lastDecision.t]! } : null;
  const ended = !!meta && view.t >= meta.duration_s;

  return (
    <div className="room" data-mode="night">
      <header className="room-bar">
        <a className="room-brand" href="#/"><BrandMark />3inLink</a>
        <DemoSwitch current="#/demo" tone="brand" />
        <div className="room-session">
          {index.length > 1 ? (
            <select value={sessionId ?? ''} onChange={(e) => setSessionId(e.target.value)} aria-label="Recording">
              {index.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          ) : <span className="room-title">{meta?.title ?? 'Loading recording…'}</span>}
          {meta && <span className={`room-badge ${meta.source}`}>{meta.source === 'real' ? 'Real EOG recording' : 'Simulated signal'} · {meta.classifier}</span>}
        </div>
        <div className="room-controls">
          <button className="room-play" onClick={togglePlay} disabled={!clock}>
            <Icon name={view.playing ? 'pause' : 'play'} />
            {view.playing ? 'Pause' : ended ? 'Play again' : view.t > 0 ? 'Resume' : 'Play'}
          </button>
          <button className="room-btn" onClick={restart} disabled={!clock}>Restart</button>
          <div className="room-seg" role="group" aria-label="Speed">
            {[1, 2].map((s) => (
              <button key={s} aria-pressed={view.speed === s} onClick={() => clock?.setSpeed(s)}>{s}×</button>
            ))}
          </div>
          <span className="room-time">{view.t.toFixed(1)} / {meta ? meta.duration_s.toFixed(1) : '–'} s</span>
        </div>
      </header>

      {error && <p className="room-error" role="alert">{error}</p>}

      <main className="room-main">
        <div className="room-left">
          <section className="room-panel room-signal" aria-label="EOG signal and classifier decisions">
            <div className="room-panel-head">
              <span><b>EOG signal</b> · {meta ? `one classifier decision every ${meta.hop_s} s, on the last ${meta.window_s} s` : ''}</span>
              {meta?.note && <span className="room-note">{meta.note}</span>}
            </div>
            {session && clock ? <SignalPlot session={session} clock={clock} /> : <div className="plot" />}
            <ol className="room-strip" aria-label="Classifier decisions">
              {session?.decisions.map((d) => {
                const o = outcomes[d.t];
                const done = d.t <= view.t && o;
                return (
                  <li key={d.t} className={done ? `done ${o.kind}` : ''} title={`${d.t} s · ${DECISION_TEXT[d.label]}${done ? ` → ${o.text}` : ''}`}>
                    {SHORT[d.label]}
                  </li>
                );
              })}
            </ol>
            <p className="room-last" aria-live="polite">
              {last
                ? <><span className="mono">{last.d.t.toFixed(1)} s</span> <b>{DECISION_TEXT[last.d.label]}</b> ({last.d.confidence.toFixed(2)}) → <span className={`out ${last.o.kind}`}>{last.o.text}</span></>
                : 'The first decision comes after 3 seconds of signal.'}
            </p>
          </section>

          <section className="room-panel room-eye" aria-label="Simulated eye">
            <div className="room-panel-head">
              <span><b>The eye</b> · reconstructed from the signal above</span>
            </div>
            {session && clock && <EyeSim session={session} clock={clock} />}
          </section>
        </div>

        <div className="room-right">
          <div className="monitor-fit">
            <div className="monitor">
              <Scaled width={narrow ? 560 : 1280} className="monitor-screen">
                <PatientScreen embedded />
              </Scaled>
            </div>
          </div>
          <p className="room-caption">
            <b>Patient screen</b> follows the classifier: up and down move around the ring, a double blink sends to the nurses.
            <button className="room-link" onClick={() => window.open('#/nurse', '3inlink-nurse', 'width=520,height=900')}>Open care assistant app</button>
            <button className="room-link" onClick={() => void alertStore.reset()}>Reset care assistant board</button>
          </p>
        </div>
      </main>
    </div>
  );
}
