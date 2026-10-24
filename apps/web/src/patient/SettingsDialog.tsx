import { useEffect, useRef } from 'react';
import { DIR, LANGS } from '@3inlink/core';
import { setLang, useLang } from '../lib/lang';
import type { PatientSettings } from './settings';
import { PATIENT_TEXT } from './strings';

interface Props {
  settings: PatientSettings;
  onChange(patch: Partial<PatientSettings>): void;
  onClose(): void;
}

/** Bedside setup, used by staff or the demo operator, never by the patient. */
export function SettingsDialog({ settings, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const lang = useLang();
  const t = PATIENT_TEXT[lang];
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} className="settings" onClose={onClose} aria-labelledby="settings-title" dir={DIR[lang]} lang={lang}>
      <h2 id="settings-title">{t.setup}</h2>

      <fieldset>
        <legend>{t.devPhase}</legend>
        <div className="seg">
          <button aria-pressed={settings.phase === 1} onClick={() => onChange({ phase: 1 })}>{t.phase1Btn}</button>
          <button aria-pressed={settings.phase === 2} onClick={() => onChange({ phase: 2 })}>{t.phase2Btn}</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t.lighting}</legend>
        <div className="seg">
          <button aria-pressed={settings.mode === 'night'} onClick={() => onChange({ mode: 'night' })}>{t.night}</button>
          <button aria-pressed={settings.mode === 'day'} onClick={() => onChange({ mode: 'day' })}>{t.day}</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>{t.language}</legend>
        <div className="seg" dir="ltr">
          {LANGS.map((l) => (
            <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
          ))}
        </div>
      </fieldset>

      <div className="fields">
        <label>{t.patientId}
          <input dir="ltr" value={settings.patientCode} onChange={(e) => onChange({ patientCode: e.target.value })} />
        </label>
        <label>{t.room}
          <input dir="ltr" value={settings.room} onChange={(e) => onChange({ room: e.target.value })} />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={settings.testControls} onChange={(e) => onChange({ testControls: e.target.checked })} />
        {t.showTest}
      </label>

      <p className="hint">{t.keyboardHint}</p>

      <button className="btn" onClick={() => ref.current?.close()}>{t.done}</button>
    </dialog>
  );
}
