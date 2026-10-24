import { useEffect, useRef } from 'react';
import { LANGS } from '@3inlink/core';
import type { PatientSettings } from './settings';

interface Props {
  settings: PatientSettings;
  onChange(patch: Partial<PatientSettings>): void;
  onClose(): void;
}

/** Bedside setup, used by staff or the demo operator, never by the patient. */
export function SettingsDialog({ settings, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);

  return (
    <dialog ref={ref} className="settings" onClose={onClose} aria-labelledby="settings-title">
      <h2 id="settings-title">Bedside setup</h2>

      <fieldset>
        <legend>Development phase</legend>
        <div className="seg">
          <button aria-pressed={settings.phase === 1} onClick={() => onChange({ phase: 1 })}>Phase 1 · up / down</button>
          <button aria-pressed={settings.phase === 2} onClick={() => onChange({ phase: 2 })}>Phase 2 · 4 directions</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Ward lighting</legend>
        <div className="seg">
          <button aria-pressed={settings.mode === 'night'} onClick={() => onChange({ mode: 'night' })}>Night ward</button>
          <button aria-pressed={settings.mode === 'day'} onClick={() => onChange({ mode: 'day' })}>Day ward</button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Voice language</legend>
        <div className="seg">
          {LANGS.map((l) => (
            <button key={l} aria-pressed={settings.voice === l} onClick={() => onChange({ voice: l })}>{l.toUpperCase()}</button>
          ))}
        </div>
      </fieldset>

      <div className="fields">
        <label>Patient ID
          <input value={settings.patientCode} onChange={(e) => onChange({ patientCode: e.target.value })} />
        </label>
        <label>Room
          <input value={settings.room} onChange={(e) => onChange({ room: e.target.value })} />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" checked={settings.testControls} onChange={(e) => onChange({ testControls: e.target.checked })} />
        Show test controls (simulate glances and blinks)
      </label>

      <p className="hint">Keyboard: arrow keys for glances (up/down only in Phase 1), Space for a blink (twice to send), Esc to look away.</p>

      <button className="btn" onClick={() => ref.current?.close()}>Done</button>
    </dialog>
  );
}
