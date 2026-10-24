import { SPEECH_LANG, type Lang } from '@3inlink/core';

/** Speaks a message in the chosen language. Silently does nothing if the browser has no speech synthesis. */
export function speak(text: string, lang: Lang) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[lang];
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* no speech synthesis available */
  }
}
