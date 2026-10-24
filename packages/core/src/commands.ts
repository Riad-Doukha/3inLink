/** The eight patient messages, in ring order: clockwise from the top-left cell of the 3x3 grid. */
export const ORDER = ['toilet', 'pain', 'cold', 'water', 'hot', 'bed', 'family', 'nurse'] as const;
export type Command = (typeof ORDER)[number];

/** [row, col] of each ring index; the center cell (1,1) is the message panel. */
export const POS: readonly (readonly [number, number])[] = [
  [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0],
];

/** Commands that staff must treat as urgent (pinned and red in the nurse app). */
export const URGENT: ReadonlySet<Command> = new Set<Command>(['pain']);

export type Lang = 'en' | 'ar' | 'fr';
export const LANGS: readonly Lang[] = ['en', 'ar', 'fr'];
export const SPEECH_LANG: Record<Lang, string> = { en: 'en-US', ar: 'ar-SA', fr: 'fr-FR' };
export const DIR: Record<Lang, 'ltr' | 'rtl'> = { en: 'ltr', ar: 'rtl', fr: 'ltr' };
