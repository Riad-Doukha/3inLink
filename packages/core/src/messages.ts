import type { Command, Lang } from './commands';

/** Patient-facing wording (spoken and shown on the message panel). */
export const PATIENT_MESSAGES: Record<Command, Record<Lang, string>> = {
  nurse: { en: 'Call Nurse', ar: 'نداء الممرض', fr: "Appeler l'infirmier(ère)" },
  pain: { en: 'I Feel Pain', ar: 'أشعر بألم', fr: "J'ai mal" },
  water: { en: 'I Need Water', ar: 'أحتاج إلى ماء', fr: "J'ai besoin d'eau" },
  bed: {
    en: 'I Feel Uncomfortable; Please Adjust My Bed',
    ar: 'أشعر بعدم الارتياح، يرجى تعديل سريري',
    fr: 'Je suis inconfortable ; veuillez ajuster mon lit',
  },
  toilet: { en: 'I Need the Bathroom', ar: 'أحتاج إلى دورة المياه', fr: "J'ai besoin des toilettes" },
  cold: { en: 'I Feel Cold', ar: 'أشعر بالبرد', fr: "J'ai froid" },
  hot: { en: 'I Feel Hot', ar: 'أشعر بالحر', fr: "J'ai chaud" },
  family: { en: 'Call My Family', ar: 'اتصلوا بعائلتي', fr: 'Appelez ma famille' },
};

/** Staff-facing wording (alert card titles). */
export const STAFF_MESSAGES: Record<Command, Record<Lang, string>> = {
  pain: { en: 'I feel pain', fr: "J'ai mal", ar: 'أشعر بألم' },
  nurse: { en: 'Call nurse', fr: 'Appel infirmier(ère)', ar: 'نداء الممرض' },
  water: { en: 'I need water', fr: "J'ai besoin d'eau", ar: 'أحتاج إلى ماء' },
  bed: { en: 'Uncomfortable: please adjust my bed', fr: 'Inconfortable : veuillez ajuster mon lit', ar: 'غير مرتاح: يرجى تعديل سريري' },
  toilet: { en: 'I need the bathroom', fr: "J'ai besoin des toilettes", ar: 'أحتاج إلى دورة المياه' },
  cold: { en: 'I feel cold', fr: "J'ai froid", ar: 'أشعر بالبرد' },
  hot: { en: 'I feel hot', fr: "J'ai chaud", ar: 'أشعر بالحر' },
  family: { en: 'Call my family', fr: 'Appelez ma famille', ar: 'اتصلوا بعائلتي' },
};

/** Message panel chrome on the patient screen. */
export const PANEL_TEXT = {
  idle: { en: 'Look at a symbol', ar: 'انظر إلى رمز', fr: 'Regardez un symbole' },
  sent: { en: 'Sent to nursing staff', ar: 'تم الإرسال إلى طاقم التمريض', fr: "Envoyé à l'équipe soignante" },
  capIdle: 'No message selected',
  capFocus: 'Selected message · double blink to confirm',
  capPending: 'Blink 1 of 2 · blink again to confirm',
} as const;
