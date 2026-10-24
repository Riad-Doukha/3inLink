import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  DOUBLE_BLINK_WINDOW_MS, LANGS, ORDER, PANEL_TEXT, PATIENT_MESSAGES,
  allowedDirections, initialHci, reduceHci,
  type Direction, type HciInput, type HciState, type Lang, type Phase,
} from '@3inlink/core';
import { BrandMark, Icon } from '@3inlink/design-tokens';
import { speak } from './speech';
import { alertStore, type NewAlert } from '../lib/alertStore';
import { loadSettings, saveSettings, type PatientSettings } from './settings';
import { SettingsDialog } from './SettingsDialog';
import { DemoSwitch } from '../lib/DemoSwitch';
import { subscribeGaze } from '../lib/gazeBus';
import './patient.css';

/** Send a confirmed message to staff; retry once so a brief network drop does not lose it. */
async function sendAlert(alert: NewAlert) {
  try {
    await alertStore.create(alert);
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    await alertStore.create(alert).catch((e) => console.error('[3inLink] alert not delivered', e));
  }
}
const KEY_DIR: Record<string, Direction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

type Action = { input: HciInput; phase: Phase };
const reducer = (s: HciState, a: Action) => reduceHci(s, a.input, a.phase);

/**
 * The patient screen. Inputs come from the keyboard / test controls (stand-ins for the EOG classifier)
 * and from the gaze bus (the replay of real classifier decisions).
 * `embedded`: shown inside the demo room. It fills its container, has no keyboard or operator controls,
 * and leaves the page theme alone.
 */
export function PatientScreen({ embedded = false }: { embedded?: boolean }) {
  const [settings, setSettings] = useState<PatientSettings>(loadSettings);
  const [hci, dispatch] = useReducer(reducer, initialHci);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const input = useCallback((i: HciInput) => dispatch({ input: i, phase: settings.phase }), [settings.phase]);
  const blink = useCallback(() => input({ type: 'blink', t: performance.now() }), [input]);

  const updateSettings = useCallback((patch: Partial<PatientSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!embedded) document.documentElement.dataset.mode = settings.mode;
  }, [settings.mode, embedded]);

  useEffect(() => subscribeGaze((e) => {
    switch (e.type) {
      case 'phase': updateSettings({ phase: e.phase }); break;
      case 'blink': input({ type: 'blink', t: performance.now() }); break;
      case 'gaze': input({ type: 'gaze', dir: e.dir }); break;
      default: input(e);
    }
  }), [input, updateSettings]);

  // Keyboard stands in for the EOG signal: arrows = glances, Space = blink.
  useEffect(() => {
    if (settingsOpen || embedded) return;
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (dir) { e.preventDefault(); input({ type: 'gaze', dir }); }
      else if (e.key === ' ') { e.preventDefault(); blink(); }
      else if (e.key === 'Escape') input({ type: 'clear' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [input, blink, settingsOpen, embedded]);

  // Forget a first blink that was not followed by a second one in time.
  useEffect(() => {
    if (hci.status !== 'pending') return;
    const id = setTimeout(() => input({ type: 'tick', t: performance.now() }), DOUBLE_BLINK_WINDOW_MS + 50);
    return () => clearTimeout(id);
  }, [hci.status, hci.pendingSince, input]);

  // Voice before send: speak the focused message; confirm the send out loud.
  const cmd = hci.cur === null ? null : ORDER[hci.cur]!;
  useEffect(() => {
    if (cmd && hci.status === 'focus') speak(PATIENT_MESSAGES[cmd][settings.voice], settings.voice);
    // only on a new focus, not when a pending blink expires or the voice changes
  }, [hci.cur]);

  const prevStatus = useRef(hci.status);
  useEffect(() => {
    if (hci.status === 'sent' && prevStatus.current !== 'sent' && cmd) {
      speak(PANEL_TEXT.sent[settings.voice], settings.voice);
      void sendAlert({ patientCode: settings.patientCode, room: settings.room, command: cmd });
    }
    prevStatus.current = hci.status;
  }, [hci.status, cmd, settings]);

  const sent = hci.status === 'sent';
  const panelLines: Record<Lang, string> = cmd === null
    ? PANEL_TEXT.idle
    : sent ? PANEL_TEXT.sent : PATIENT_MESSAGES[cmd];
  const caption = cmd === null
    ? PANEL_TEXT.capIdle
    : sent ? `${PATIENT_MESSAGES[cmd].en} · ${settings.patientCode} · Room ${settings.room}`
    : hci.status === 'pending' ? PANEL_TEXT.capPending : PANEL_TEXT.capFocus;
  const dirs = allowedDirections(settings.phase);

  return (
    <div className={`app${embedded ? ' embedded' : ''}`} data-mode={settings.mode}>
      <header className="bar">
        <span className="bar-start">
          <a className="bar-brand" href="#/"><BrandMark className="mark" />3inLink</a>
          {!embedded && <DemoSwitch current="#/patient" tone="brand" />}
        </span>
        <span className="bar-meta">
          <span className="phase-tag">{settings.phase === 1 ? 'PHASE 1 · UP / DOWN' : 'PHASE 2 · 4 DIRECTIONS'}</span>
          <span className="ai-pill">AI Assistant</span>
          <span className="langs" role="group" aria-label="Voice language">
            <button
              className="spk"
              aria-label="Read aloud"
              onClick={() => cmd && speak(PATIENT_MESSAGES[cmd][settings.voice], settings.voice)}
            >
              <Icon name="speaker" />
            </button>
            {LANGS.map((l) => (
              <button key={l} aria-pressed={settings.voice === l} onClick={() => updateSettings({ voice: l })}>
                {l.toUpperCase()}
              </button>
            ))}
          </span>
          {!embedded && (
            <button className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              <Icon name="settings" />
            </button>
          )}
        </span>
      </header>

      <main
        className="pgrid"
        aria-label={settings.phase === 1
          ? 'Eight communication symbols around the message panel. Up and down arrows go around, Space blinks.'
          : 'Eight communication symbols around the message panel. Arrow keys move, Space blinks.'}
      >
        {ORDER.map((c, i) => {
          const state = hci.cur === i ? (sent ? 'sent' : 'focus') : 'idle';
          return (
            <button
              key={c}
              className={`tile p${i}`}
              data-state={state}
              aria-current={state !== 'idle' ? 'true' : undefined}
              onClick={() => input({ type: 'select', index: i })}
            >
              <span className="d">{String(i + 1).padStart(2, '0')}</span>
              <Icon name={c} />
              <span className="l">{PATIENT_MESSAGES[c].en}</span>
            </button>
          );
        })}

        <section className="msg" data-state={sent ? 'sent' : hci.status} aria-live="polite">
          <div className="cap">{caption}</div>
          <div className="en">{panelLines.en}</div>
          <div className="ar" lang="ar" dir="rtl">{panelLines.ar}</div>
          <div className="fr" lang="fr">{panelLines.fr}</div>
        </section>
      </main>

      <footer className="legend">
        <span><i />Idle</span>
        <span><i className="g" />Gaze focus: message and voice feedback</span>
        <span><i className="r" />Double blink: confirmed, sent to staff</span>
      </footer>

      {settings.testControls && !embedded && (
        <div className="test-ctrl" role="group" aria-label="Test controls (simulate eye movements)">
          {(['left', 'right', 'up', 'down'] as const).map((d) => (
            <button key={d} className="btn ghost" disabled={!dirs.includes(d)} onClick={() => input({ type: 'gaze', dir: d })}>
              <Icon name={d} /> {d}
            </button>
          ))}
          <button className="btn ghost" data-pending={hci.status === 'pending'} onClick={blink}>Blink</button>
          <button className="btn ghost" onClick={() => input({ type: 'clear' })}>Look away</button>
        </div>
      )}

      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
