/**
 * Model of the wearable for the hardware page: device state (power, Bluetooth, battery) and the
 * shape of the EOG each eye action produces. Pure and deterministic so it can be unit-tested.
 * The signal is illustrative: the polarity and order of magnitude follow the project report
 * (about 16 µV per degree horizontally and 14 µV per degree vertically); it is not recorded data.
 */

export type Ble = 'off' | 'pairing' | 'connected';
export type EyeAction = 'up' | 'down' | 'left' | 'right' | 'blink' | 'double_blink';

export interface DeviceState {
  power: boolean;
  ble: Ble;
  /** 0–100 % */
  battery: number;
  charging: boolean;
  /** Time (ms) pairing started, while ble is 'pairing'. */
  pairingSince: number | null;
}

export type DeviceEvent =
  | { type: 'power'; t: number }
  | { type: 'charge'; on: boolean }
  | { type: 'tick'; t: number; dt: number };

export const PAIRING_MS = 1500;
/** Sped up for the demo: a full battery lasts about two minutes on screen. */
export const DRAIN_PER_S = 0.8;
export const CHARGE_PER_S = 6;
export const LOW_BATTERY = 15;

export const initialDevice: DeviceState = { power: false, ble: 'off', battery: 72, charging: false, pairingSince: null };

export function reduceDevice(s: DeviceState, e: DeviceEvent): DeviceState {
  switch (e.type) {
    case 'power':
      if (s.power) return { ...s, power: false, ble: 'off', pairingSince: null };
      if (s.battery <= 0) return s; // flat battery: nothing happens until it charges
      return { ...s, power: true, ble: 'pairing', pairingSince: e.t };
    case 'charge':
      return { ...s, charging: e.on };
    case 'tick': {
      let { battery, power, ble, pairingSince } = s;
      if (s.charging) battery = Math.min(100, battery + CHARGE_PER_S * e.dt);
      else if (power) battery = Math.max(0, battery - DRAIN_PER_S * e.dt);
      if (power && ble === 'pairing' && pairingSince !== null && e.t - pairingSince >= PAIRING_MS) {
        ble = 'connected';
        pairingSince = null;
      }
      if (battery <= 0 && power) { power = false; ble = 'off'; pairingSince = null; }
      if (battery === s.battery && power === s.power && ble === s.ble) return s;
      return { ...s, battery, power, ble, pairingSince };
    }
  }
}

/** Duration of the signal produced by one action, in seconds. */
export const ACTION_S = 0.9;

const GLANCE_H_UV = 16 * 30; // 30° glance, horizontal channel
const GLANCE_V_UV = 14 * 25; // 25° glance, vertical channel
const BLINK_UV = 650;

/** Glance and return: quick rise, hold, return to baseline. 0..1 */
function glance(t: number) {
  if (t < 0 || t > 0.75) return 0;
  if (t < 0.08) return t / 0.08;
  if (t < 0.5) return 1;
  return 1 - (t - 0.5) / 0.25;
}

/** A blink: a short, tall spike. 0..1 */
function spike(t: number, at: number) {
  const x = (t - at) / 0.045;
  return Math.exp(-x * x);
}

/** H and V channel values (µV) `t` seconds after the action started; 0 outside the action. */
export function actionSignal(action: EyeAction | null, t: number): { h: number; v: number } {
  if (!action || t < 0 || t > ACTION_S) return { h: 0, v: 0 };
  switch (action) {
    case 'up': return { h: 0, v: GLANCE_V_UV * glance(t) };
    case 'down': return { h: 0, v: -GLANCE_V_UV * glance(t) };
    case 'right': return { h: GLANCE_H_UV * glance(t), v: 0 };
    case 'left': return { h: -GLANCE_H_UV * glance(t), v: 0 };
    case 'blink': return { h: 0, v: BLINK_UV * spike(t, 0.15) };
    case 'double_blink': return { h: 0, v: BLINK_UV * (spike(t, 0.15) + spike(t, 0.45)) };
  }
}

/** Small, deterministic baseline noise (µV) so the trace looks alive without being random in tests. */
export function baselineNoise(t: number) {
  return 9 * Math.sin(t * 7.3) + 6 * Math.sin(t * 23.1 + 1.3) + 4 * Math.sin(t * 51.7 + 0.4);
}

export const ACTION_TEXT: Record<EyeAction, { label: string; result: string }> = {
  up: { label: 'Look up', result: 'Up → previous message' },
  down: { label: 'Look down', result: 'Down → next message' },
  left: { label: 'Look left', result: 'Left → tile on the left (Phase 2)' },
  right: { label: 'Look right', result: 'Right → tile on the right (Phase 2)' },
  blink: { label: 'Blink', result: 'Single blink → ignored, people blink naturally' },
  double_blink: { label: 'Double blink', result: 'Double blink → send the message to the nurses' },
};
