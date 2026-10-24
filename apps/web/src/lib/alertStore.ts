import type { Command, PatientAlert } from '@3inlink/core';
import { supabase } from './supabase';

export type NewAlert = Pick<PatientAlert, 'patientCode' | 'room' | 'command'>;
export type StoreStatus = 'connecting' | 'live' | 'offline' | 'local';
export type AlertChange =
  | { type: 'insert' | 'update'; alert: PatientAlert }
  | { type: 'delete'; id: string }
  /** Many rows changed at once (demo reset): re-list. */
  | { type: 'reload' };

/** Where patient alerts live. The patient screen creates them; the nurse app lists, watches and handles them. */
export interface AlertStore {
  readonly mode: 'supabase' | 'local';
  list(): Promise<PatientAlert[]>;
  create(alert: NewAlert): Promise<void>;
  markHandled(id: string): Promise<void>;
  reset(): Promise<void>;
  /** Returns an unsubscribe function. */
  subscribe(onChange: (c: AlertChange) => void, onStatus: (s: StoreStatus) => void): () => void;
}

/* ---------- Supabase ---------- */

interface AlertRow {
  id: string;
  patient_code: string;
  room: string;
  command: Command;
  created_at: string;
  handled_at: string | null;
}

const fromRow = (r: AlertRow): PatientAlert => ({
  id: r.id,
  patientCode: r.patient_code,
  room: r.room,
  command: r.command,
  createdAt: Date.parse(r.created_at),
  handledAt: r.handled_at ? Date.parse(r.handled_at) : null,
});

function supabaseStore(): AlertStore {
  const db = supabase!;
  return {
    mode: 'supabase',
    async list() {
      const { data, error } = await db
        .from('alerts')
        .select('id, patient_code, room, command, created_at, handled_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as AlertRow[]).map(fromRow);
    },
    async create(a) {
      const { error } = await db.from('alerts').insert({ patient_code: a.patientCode, room: a.room, command: a.command });
      if (error) throw error;
    },
    async markHandled(id) {
      const { error } = await db.from('alerts').update({ handled_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    async reset() {
      const { error } = await db.rpc('reset_demo');
      if (error) throw error;
    },
    subscribe(onChange, onStatus) {
      onStatus('connecting');
      // A unique topic per subscription: re-subscribing under the same name (React remounts, two nurse
      // views on one page) lets the server's close of the old channel kill the new one.
      const channel = db
        .channel(`alerts-feed-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (p) =>
          onChange({ type: 'insert', alert: fromRow(p.new as AlertRow) }))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, (p) =>
          onChange({ type: 'update', alert: fromRow(p.new as AlertRow) }))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'alerts' }, (p) =>
          onChange({ type: 'delete', id: (p.old as { id: string }).id }))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') onStatus('live');
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus('offline');
        });
      return () => { void db.removeChannel(channel); };
    },
  };
}

/* ---------- Single-browser fallback (no Supabase configured) ---------- */

const LOCAL_KEY = '3inlink.alerts';
const CHANNEL = '3inlink-alerts';
const min = 60_000;

function sampleAlerts(): PatientAlert[] {
  const now = Date.now();
  const s = (patientCode: string, room: string, command: Command, ago: number): PatientAlert =>
    ({ id: crypto.randomUUID(), patientCode, room, command, createdAt: now - ago * min, handledAt: null });
  return [
    s('PT-10482', '204-B', 'pain', 1), s('PT-10517', '211-A', 'nurse', 3), s('PT-10390', '207-A', 'water', 6),
    s('PT-10455', '215-B', 'bed', 9), s('PT-10508', '209-A', 'cold', 11), s('PT-10361', '203-B', 'toilet', 14),
  ];
}

function localStore(): AlertStore {
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;
  const read = (): PatientAlert[] => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? (JSON.parse(raw) as PatientAlert[]) : sampleAlerts();
    } catch {
      return sampleAlerts();
    }
  };
  let memory = read();
  const write = (all: PatientAlert[]) => {
    memory = all;
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch { /* memory only */ }
  };
  const listeners = new Set<(c: AlertChange) => void>();
  // Other tabs: re-read storage, then forward the change.
  bc?.addEventListener('message', (e: MessageEvent<AlertChange>) => { memory = read(); listeners.forEach((l) => l(e.data)); });
  const notify = (c: AlertChange) => { listeners.forEach((l) => l(c)); bc?.postMessage(c); };

  return {
    mode: 'local',
    async list() { return [...memory].sort((a, b) => b.createdAt - a.createdAt); },
    async create(a) {
      const alert: PatientAlert = { ...a, id: crypto.randomUUID(), createdAt: Date.now(), handledAt: null };
      write([alert, ...memory]);
      notify({ type: 'insert', alert });
    },
    async markHandled(id) {
      const all = memory.map((x) => (x.id === id ? { ...x, handledAt: Date.now() } : x));
      write(all);
      const alert = all.find((x) => x.id === id);
      if (alert) notify({ type: 'update', alert });
    },
    async reset() { write(sampleAlerts()); notify({ type: 'reload' }); },
    subscribe(onChange, onStatus) {
      onStatus('local');
      listeners.add(onChange);
      return () => { listeners.delete(onChange); };
    },
  };
}

export const alertStore: AlertStore = supabase ? supabaseStore() : localStore();
