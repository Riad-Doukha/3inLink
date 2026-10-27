import { useSyncExternalStore } from 'react';
import { LANGS, type Lang } from '@3inlink/core';

/**
 * One interface language for the whole product. Choosing EN, FR or AR on the patient screen or in the
 * care assistant app switches both, in this tab and in other tabs of the same browser (through the storage event).
 */
const KEY = '3inlink.lang';
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v && (LANGS as readonly string[]).includes(v)) return v as Lang;
  } catch { /* storage unavailable */ }
  return 'en';
}

let current: Lang = read();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    current = read();
    listeners.forEach((l) => l());
  });
}

export function setLang(lang: Lang) {
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* this tab only */ }
  listeners.forEach((l) => l());
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => current,
  );
}
