import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  DIR, DOUBLE_BLINK_WINDOW_MS, LANGS, ORDER, PANEL_TEXT, PATIENT_MESSAGES,
  allowedDirections, initialHci, reduceHci,
  type Direction, type HciInput, type HciState, type Phase,
} from '@3inlink/core';
import { BrandMark, Icon } from '@3inlink/design-tokens';
import { speak } from './speech';
import { alertStore, type NewAlert } from '../lib/alertStore';
import { loadSettings, saveSettings, type PatientSettings } from './settings';
import { SettingsDialog } from './SettingsDialog';
import { Wheel } from './Wheel';
import { DemoSwitch } from '../lib/DemoSwitch';
import { subscribeGaze } from '../lib/gazeBus';
import { setLang, useLang } from '../lib/lang';
import { PATIENT_TEXT } from './strings';
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
  const lang = useLang();
  const t = PATIENT_TEXT[lang];

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
    if (cmd && hci.status === 'focus') speak(PATIENT_MESSAGES[cmd][lang], lang);
    // only on a new focus, not when a pending blink expires or the language changes
  }, [hci.cur]);

  const prevStatus = useRef(hci.status);
  useEffect(() => {
    if (hci.status === 'sent' && prevStatus.current !== 'sent' && cmd) {
      speak(PANEL_TEXT.sent[lang], lang);
      void sendAlert({ patientCode: settings.patientCode, room: settings.room, command: cmd });
    }
    prevStatus.current = hci.status;
  }, [hci.status, cmd, settings, lang]);

  const sent = hci.status === 'sent';
  const panelText = cmd === null
    ? PANEL_TEXT.idle[lang]
    : sent ? PANEL_TEXT.sent[lang] : PATIENT_MESSAGES[cmd][lang];
  const caption = cmd === null
    ? t.capIdle
    : sent ? `${PATIENT_MESSAGES[cmd][lang]} · ${settings.patientCode} · ${t.room} ${settings.room}`
    : hci.status === 'pending' ? t.capPending : t.capFocus;
  const dirs = allowedDirections(settings.phase);

  return (
    <div className={`app${embedded ? ' embedded' : ''}`} data-mode={settings.mode} lang={lang} dir={DIR[lang]}>
      <header className="bar">
        <span className="bar-start">
          <a className="bar-brand" href="#/"><BrandMark className="mark" />3inLink</a>
          {!embedded && <DemoSwitch current="#/patient" tone="brand" />}
        </span>
        <span className="bar-meta">
          <span className="phase-tag">{settings.phase === 1 ? t.phase1 : t.phase2}</span>
          <span className="ai-pill">{t.ai}</span>
          <span className="langs" role="group" aria-label={t.language} dir="ltr">
            <button
              className="spk"
              aria-label={t.readAloud}
              onClick={() => cmd && speak(PATIENT_MESSAGES[cmd][lang], lang)}
            >
              <Icon name="speaker" />
            </button>
            {LANGS.map((l) => (
              <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </span>
          {!embedded && (
            <button className="icon-btn" aria-label={t.settings} onClick={() => setSettingsOpen(true)}>
              <Icon name="settings" />
            </button>
          )}
        </span>
      </header>

      {settings.phase === 1 ? (
        <main className="pwheel" aria-label={t.wheelAria}>
          <Wheel
            cur={hci.cur}
            status={hci.status}
            lang={lang}
            caption={cmd === null ? `${t.capIdle} · ${t.capIdleHint}` : caption}
            panelText={panelText}
            previous={t.previous}
            next={t.next}
            onSelect={(i) => input({ type: 'select', index: i })}
          />
        </main>
      ) : (
        <main
          className="pgrid"
          aria-label={t.gridAria}
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
                <span className="l" dir={DIR[lang]}>{PATIENT_MESSAGES[c][lang]}</span>
              </button>
            );
          })}
  
          <section className="msg" data-state={sent ? 'sent' : hci.status} aria-live="polite" dir={DIR[lang]}>
            <div className="cap">{caption}</div>
            <div className="line">{panelText}</div>
          </section>
        </main>
      )}

      <footer className="legend">
        <span><i />{t.legendIdle}</span>
        <span><i className="g" />{t.legendFocus}</span>
        <span><i className="r" />{t.legendSent}</span>
      </footer>

      {settings.testControls && !embedded && (
        <div className="test-ctrl" role="group" aria-label={t.testControls}>
          {(['left', 'right', 'up', 'down'] as const).map((d) => (
            <button key={d} className="btn ghost" disabled={!dirs.includes(d)} onClick={() => input({ type: 'gaze', dir: d })}>
              <Icon name={d} /> {t.dir[d]}
            </button>
          ))}
          <button className="btn ghost" data-pending={hci.status === 'pending'} onClick={blink}>{t.blink}</button>
          <button className="btn ghost" onClick={() => input({ type: 'clear' })}>{t.lookAway}</button>
        </div>
      )}

      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
