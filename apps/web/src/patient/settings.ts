import type { Phase } from '@3inlink/core';

/** Bedside settings. The interface and voice language is shared with the nurse app (see lib/lang.ts). */
export interface PatientSettings {
  phase: Phase;
  mode: 'night' | 'day';
  patientCode: string;
  room: string;
  testControls: boolean;
}

const KEY = '3inlink.patient.settings';

export const DEFAULT_SETTINGS: PatientSettings = {
  phase: 1,
  mode: 'night',
  patientCode: 'PT-10390',
  room: '207-A',
  testControls: true,
};

export function loadSettings(): PatientSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: PatientSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings last for this session only */
  }
}
