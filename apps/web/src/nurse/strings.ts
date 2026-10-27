import type { Lang } from '@3inlink/core';

/** Care assistant app interface text. Alert titles come from STAFF_MESSAGES in @3inlink/core. */
export const NURSE_TEXT: Record<Lang, {
  ward: string; title: string; pending: string; handled: string; room: string; min: string; now: string;
  none: string; noneHandled: string; tapHint: string; newAlert: string; dismiss: string; reset: string;
  live: string; connecting: string; offline: string; local: string; day: string; night: string;
  loadError: string; saveError: string; language: string;
}> = {
  en: {
    ward: '3INLINK · WARD 2', title: 'Patient alerts', pending: 'Pending', handled: 'Handled', room: 'Room', min: 'min', now: 'now',
    none: 'No pending alerts.', noneHandled: 'Nothing handled yet.', tapHint: 'Tap an alert once you have attended to it.',
    newAlert: 'New alert', dismiss: 'Dismiss', reset: 'Reset demo',
    live: 'Live', connecting: 'Connecting…', offline: 'Offline, retrying', local: 'This browser only',
    day: 'Day', night: 'Night shift',
    loadError: 'Could not load alerts. Check the connection and try again.',
    saveError: 'Could not mark the alert handled. It is still pending; try again.',
    language: 'Language',
  },
  fr: {
    ward: '3INLINK · SERVICE 2', title: 'Alertes patients', pending: 'En attente', handled: 'Traitées', room: 'Chambre', min: 'min', now: 'maint.',
    none: 'Aucune alerte en attente.', noneHandled: 'Aucune alerte traitée.', tapHint: "Touchez une alerte une fois le patient pris en charge.",
    newAlert: 'Nouvelle alerte', dismiss: 'Fermer', reset: 'Réinitialiser la démo',
    live: 'En direct', connecting: 'Connexion…', offline: 'Hors ligne, nouvelle tentative', local: 'Ce navigateur uniquement',
    day: 'Jour', night: 'Garde de nuit',
    loadError: 'Impossible de charger les alertes. Vérifiez la connexion et réessayez.',
    saveError: "Impossible de marquer l'alerte comme traitée. Elle reste en attente ; réessayez.",
    language: 'Langue',
  },
  ar: {
    ward: '3INLINK · الجناح 2', title: 'تنبيهات المرضى', pending: 'قيد الانتظار', handled: 'تمت المعالجة', room: 'غرفة', min: 'د', now: 'الآن',
    none: 'لا توجد تنبيهات قيد الانتظار.', noneHandled: 'لم تتم معالجة أي تنبيه بعد.', tapHint: 'المس التنبيه بعد الاهتمام بالمريض.',
    newAlert: 'تنبيه جديد', dismiss: 'إغلاق', reset: 'إعادة ضبط العرض',
    live: 'مباشر', connecting: 'جارٍ الاتصال…', offline: 'غير متصل، إعادة المحاولة', local: 'هذا المتصفح فقط',
    day: 'نهار', night: 'مناوبة ليلية',
    loadError: 'تعذر تحميل التنبيهات. تحقق من الاتصال وحاول مرة أخرى.',
    saveError: 'تعذر تعليم التنبيه كمعالج. لا يزال قيد الانتظار؛ حاول مرة أخرى.',
    language: 'اللغة',
  },
};
