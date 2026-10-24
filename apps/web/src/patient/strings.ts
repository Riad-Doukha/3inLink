import type { Direction, Lang } from '@3inlink/core';

/** Patient screen interface text. Message wording comes from PATIENT_MESSAGES / PANEL_TEXT in @3inlink/core. */
export const PATIENT_TEXT: Record<Lang, {
  phase1: string; phase2: string; ai: string; language: string; readAloud: string; settings: string;
  capIdle: string; capIdleHint: string; capFocus: string; capPending: string; room: string;
  legendIdle: string; legendFocus: string; legendSent: string;
  dir: Record<Direction, string>; blink: string; lookAway: string; previous: string; next: string;
  testControls: string; gridAria: string; wheelAria: string;
  setup: string; devPhase: string; phase1Btn: string; phase2Btn: string; lighting: string; night: string; day: string;
  patientId: string; showTest: string; keyboardHint: string; done: string;
}> = {
  en: {
    phase1: 'PHASE 1 · UP / DOWN', phase2: 'PHASE 2 · 4 DIRECTIONS', ai: 'AI Assistant', language: 'Language',
    readAloud: 'Read aloud', settings: 'Settings',
    capIdle: 'No message selected', capIdleHint: 'look up or down', capFocus: 'Selected message · double blink to confirm',
    capPending: 'Blink 1 of 2 · blink again to confirm', room: 'Room',
    legendIdle: 'Idle', legendFocus: 'Gaze focus: message and voice feedback', legendSent: 'Double blink: confirmed, sent to staff',
    dir: { up: 'Up', down: 'Down', left: 'Left', right: 'Right' }, blink: 'Blink', lookAway: 'Look away',
    previous: 'previous', next: 'next',
    testControls: 'Test controls (simulate eye movements)',
    gridAria: 'Eight communication symbols around the message panel. Arrow keys move, Space blinks.',
    wheelAria: 'Eight messages stacked vertically. Up and down arrows move, Space blinks.',
    setup: 'Bedside setup', devPhase: 'Development phase', phase1Btn: 'Phase 1 · up / down', phase2Btn: 'Phase 2 · 4 directions',
    lighting: 'Ward lighting', night: 'Night ward', day: 'Day ward', patientId: 'Patient ID',
    showTest: 'Show test controls (simulate glances and blinks)',
    keyboardHint: 'Keyboard: arrow keys for glances (up/down only in Phase 1), Space for a blink (twice to send), Esc to look away.',
    done: 'Done',
  },
  fr: {
    phase1: 'PHASE 1 · HAUT / BAS', phase2: 'PHASE 2 · 4 DIRECTIONS', ai: 'Assistant IA', language: 'Langue',
    readAloud: 'Lire à voix haute', settings: 'Réglages',
    capIdle: 'Aucun message sélectionné', capIdleHint: 'regardez en haut ou en bas',
    capFocus: 'Message sélectionné · clignez deux fois pour confirmer',
    capPending: 'Clignement 1 sur 2 · clignez encore pour confirmer', room: 'Chambre',
    legendIdle: 'Inactif', legendFocus: 'Regard : message et retour vocal', legendSent: "Double clignement : confirmé, envoyé à l'équipe",
    dir: { up: 'Haut', down: 'Bas', left: 'Gauche', right: 'Droite' }, blink: 'Cligner', lookAway: 'Regarder ailleurs',
    previous: 'précédent', next: 'suivant',
    testControls: 'Commandes de test (simuler les mouvements des yeux)',
    gridAria: 'Huit symboles autour du panneau de message. Flèches pour se déplacer, Espace pour cligner.',
    wheelAria: 'Huit messages empilés verticalement. Flèches haut et bas pour se déplacer, Espace pour cligner.',
    setup: 'Réglage au chevet', devPhase: 'Phase de développement', phase1Btn: 'Phase 1 · haut / bas', phase2Btn: 'Phase 2 · 4 directions',
    lighting: 'Éclairage du service', night: 'Service de nuit', day: 'Service de jour', patientId: 'ID patient',
    showTest: 'Afficher les commandes de test (simuler regards et clignements)',
    keyboardHint: 'Clavier : flèches pour les regards (haut/bas seulement en phase 1), Espace pour un clignement (deux pour envoyer), Échap pour regarder ailleurs.',
    done: 'Terminé',
  },
  ar: {
    phase1: 'المرحلة 1 · أعلى / أسفل', phase2: 'المرحلة 2 · 4 اتجاهات', ai: 'المساعد الذكي', language: 'اللغة',
    readAloud: 'قراءة بصوت عالٍ', settings: 'الإعدادات',
    capIdle: 'لم يتم اختيار أي رسالة', capIdleHint: 'انظر إلى الأعلى أو الأسفل', capFocus: 'الرسالة المختارة · ارمش مرتين للتأكيد',
    capPending: 'الرمشة 1 من 2 · ارمش مرة أخرى للتأكيد', room: 'غرفة',
    legendIdle: 'خامل', legendFocus: 'تركيز النظر: رسالة وتغذية صوتية', legendSent: 'رمشة مزدوجة: تم التأكيد والإرسال إلى الطاقم',
    dir: { up: 'أعلى', down: 'أسفل', left: 'يسار', right: 'يمين' }, blink: 'رمشة', lookAway: 'النظر بعيدًا',
    previous: 'السابق', next: 'التالي',
    testControls: 'أدوات الاختبار (محاكاة حركات العين)',
    gridAria: 'ثمانية رموز حول لوحة الرسالة. الأسهم للتنقل، والمسافة للرمش.',
    wheelAria: 'ثماني رسائل مكدسة عموديًا. سهما الأعلى والأسفل للتنقل، والمسافة للرمش.',
    setup: 'إعداد بجانب السرير', devPhase: 'مرحلة التطوير', phase1Btn: 'المرحلة 1 · أعلى / أسفل', phase2Btn: 'المرحلة 2 · 4 اتجاهات',
    lighting: 'إضاءة الجناح', night: 'الجناح ليلًا', day: 'الجناح نهارًا', patientId: 'معرّف المريض',
    showTest: 'إظهار أدوات الاختبار (محاكاة النظرات والرمش)',
    keyboardHint: 'لوحة المفاتيح: الأسهم للنظرات (أعلى/أسفل فقط في المرحلة 1)، المسافة للرمش (مرتين للإرسال)، Esc للنظر بعيدًا.',
    done: 'تم',
  },
};
