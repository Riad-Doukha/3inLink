import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DIR, LANGS, STAFF_MESSAGES, URGENT, type PatientAlert } from '@3inlink/core';
import { Icon } from '@3inlink/design-tokens';
import { alertStore, type AlertChange, type StoreStatus } from '../lib/alertStore';
import { NURSE_TEXT } from './strings';
import { notifyNewAlert } from './notify';
import { DemoSwitch } from '../lib/DemoSwitch';
import { setLang, useLang } from '../lib/lang';
import './nurse.css';

const PREFS_KEY = '3inlink.nurse.prefs';
const LATE_MIN = 10;
/** Alerts older than this when they arrive (e.g. backdated demo seeds) do not ring. */
const FRESH_MS = 60_000;

/** Lighting is per device; the language is shared with the patient screen (lib/lang.ts). */
type Prefs = { mode: 'day' | 'night' };

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { mode: JSON.parse(raw).mode === 'night' ? 'night' : 'day' };
  } catch { /* defaults */ }
  return { mode: 'day' };
}

/** Pain first, then newest first; handled list by most recently handled. */
function sortPending(a: PatientAlert, b: PatientAlert) {
  const u = Number(URGENT.has(b.command)) - Number(URGENT.has(a.command));
  return u || b.createdAt - a.createdAt;
}

export function NurseApp({ embedded = false }: { embedded?: boolean }) {
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [status, setStatus] = useState<StoreStatus>('connecting');
  const [tab, setTab] = useState<'pending' | 'handled'>('pending');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [banner, setBanner] = useState<PatientAlert | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const lang = useLang();
  const t = NURSE_TEXT[lang];
  const tRef = useRef(t);
  tRef.current = t;

  const updatePrefs = (p: Partial<Prefs>) => {
    const next = { ...prefs, ...p };
    setPrefs(next);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* session only */ }
  };

  const reload = useCallback(async () => {
    try {
      setAlerts(await alertStore.list());
      setError(null);
    } catch {
      setError(tRef.current.loadError);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChange = (c: AlertChange) => {
      if (c.type === 'reload') { void reload(); return; }
      if (c.type === 'delete') { setAlerts((xs) => xs.filter((x) => x.id !== c.id)); return; }
      const a = c.alert;
      setAlerts((xs) => (xs.some((x) => x.id === a.id) ? xs.map((x) => (x.id === a.id ? a : x)) : [a, ...xs]));
      if (c.type === 'insert' && Date.now() - a.createdAt < FRESH_MS) {
        setBanner(a);
        notifyNewAlert(URGENT.has(a.command));
      }
    };
    // After a reconnect, re-list so nothing that arrived while offline is missed.
    const onStatus = (s: StoreStatus) => { setStatus(s); if (s === 'live') void reload(); };
    return alertStore.subscribe(onChange, onStatus);
  }, [reload]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Routine alerts leave the banner after a few seconds; pain stays until dismissed.
  useEffect(() => {
    if (!banner || URGENT.has(banner.command)) return;
    const id = setTimeout(() => setBanner(null), 8000);
    return () => clearTimeout(id);
  }, [banner]);

  const pending = useMemo(() => alerts.filter((a) => !a.handledAt).sort(sortPending), [alerts]);
  const handled = useMemo(
    () => alerts.filter((a) => a.handledAt).sort((a, b) => (b.handledAt ?? 0) - (a.handledAt ?? 0)),
    [alerts],
  );
  const shown = tab === 'pending' ? pending : handled;

  async function handle(a: PatientAlert) {
    setAlerts((xs) => xs.map((x) => (x.id === a.id ? { ...x, handledAt: Date.now() } : x)));
    if (banner?.id === a.id) setBanner(null);
    try {
      await alertStore.markHandled(a.id);
      setError(null);
    } catch {
      setAlerts((xs) => xs.map((x) => (x.id === a.id ? { ...x, handledAt: null } : x)));
      setError(t.saveError);
    }
  }

  async function reset() {
    try {
      await alertStore.reset();
      setBanner(null);
      setTab('pending');
      await reload();
    } catch {
      setError(t.loadError);
    }
  }

  const elapsed = (a: PatientAlert) => {
    const m = Math.max(0, Math.floor((now - a.createdAt) / 60_000));
    return m < 1 ? t.now : `${m} ${t.min}`;
  };

  return (
    <div className={`nurse${embedded ? ' embedded' : ''}`} data-mode={prefs.mode} dir={DIR[lang]} lang={lang}>
      <div className="n-col">
        <header className="n-head">
          <div className="n-top">
            <div>
              <div className="n-ward">{t.ward}</div>
              <h1 className="n-title">{t.title}</h1>
            </div>
            <div className="n-top-end">
              <div className="count" aria-label={`${pending.length} ${t.pending}`}>{pending.length}</div>
              {!embedded && <DemoSwitch current="#/nurse" tone="brand" />}
            </div>
          </div>
          <div className="n-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'pending'} onClick={() => setTab('pending')}>{t.pending}</button>
            <button role="tab" aria-selected={tab === 'handled'} onClick={() => setTab('handled')}>{t.handled}</button>
          </div>
        </header>

        {banner && (
          <div className={`n-banner${URGENT.has(banner.command) ? ' urgent' : ''}`} role="alert">
            <span className="ic"><Icon name={banner.command} /></span>
            <span>
              <span className="n-banner-cap">{t.newAlert}</span>
              <span className="ti">{STAFF_MESSAGES[banner.command][lang]}</span>
              <span className="chips">
                <span className="chip" dir="ltr">ID {banner.patientCode}</span>
                <span className="chip room">{t.room} <bdi dir="ltr">{banner.room}</bdi></span>
              </span>
            </span>
            <button className="n-dismiss" onClick={() => setBanner(null)}>{t.dismiss}</button>
          </div>
        )}

        {error && <p className="n-error" role="status">{error}</p>}

        <section className="n-list" aria-live="polite">
          {shown.length === 0 && <div className="empty">{tab === 'pending' ? t.none : t.noneHandled}</div>}
          {shown.map((a) => {
            const done = Boolean(a.handledAt);
            const urgent = !done && URGENT.has(a.command);
            const late = !done && (now - a.createdAt) / 60_000 >= LATE_MIN;
            return (
              <button
                key={a.id}
                className={`acard${urgent ? ' urgent' : ''}${done ? ' done' : ''}`}
                disabled={done}
                onClick={() => void handle(a)}
              >
                <span className="ic"><Icon name={done ? 'check' : a.command} /></span>
                <span>
                  <span className="ti">{STAFF_MESSAGES[a.command][lang]}</span>
                  <span className="chips">
                    <span className="chip" dir="ltr">ID {a.patientCode}</span>
                    <span className="chip room">{t.room} <bdi dir="ltr">{a.room}</bdi></span>
                  </span>
                </span>
                <span className={`tm${late ? ' late' : ''}`}>{elapsed(a)}</span>
              </button>
            );
          })}
          {tab === 'pending' && shown.length > 0 && <p className="n-hint">{t.tapHint}</p>}
        </section>

        <footer className="n-foot">
          <div className="n-foot-row">
            <span className={`n-status s-${status}`}><i />{t[status]}</span>
            <button className="n-reset" onClick={() => void reset()}>{t.reset}</button>
          </div>
          <div className="n-tools">
            <div className="seg" role="group" aria-label={t.language} dir="ltr">
              {LANGS.map((l) => (
                <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
            <div className="seg" role="group">
              <button aria-pressed={prefs.mode === 'day'} onClick={() => updatePrefs({ mode: 'day' })} title={t.day}>{t.day}</button>
              <button aria-pressed={prefs.mode === 'night'} onClick={() => updatePrefs({ mode: 'night' })} title={t.night}>{t.night}</button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
