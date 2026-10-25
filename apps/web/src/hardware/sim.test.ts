import { describe, expect, it } from 'vitest';
import { LOW_BATTERY, PAIRING_MS, actionSignal, initialDevice, reduceDevice, type DeviceState } from './sim';

describe('reduceDevice', () => {
  it('powers on into pairing, then connects after the pairing time', () => {
    let s = reduceDevice(initialDevice, { type: 'power', t: 1000 });
    expect(s).toMatchObject({ power: true, ble: 'pairing' });
    s = reduceDevice(s, { type: 'tick', t: 1000 + PAIRING_MS - 1, dt: 0.1 });
    expect(s.ble).toBe('pairing');
    s = reduceDevice(s, { type: 'tick', t: 1000 + PAIRING_MS, dt: 0.1 });
    expect(s.ble).toBe('connected');
  });
  it('powers off and drops the link', () => {
    const on: DeviceState = { ...initialDevice, power: true, ble: 'connected' };
    expect(reduceDevice(on, { type: 'power', t: 0 })).toMatchObject({ power: false, ble: 'off' });
  });
  it('drains while on, charges on USB-C, and shuts down when empty', () => {
    const on: DeviceState = { ...initialDevice, power: true, ble: 'connected', battery: 50 };
    expect(reduceDevice(on, { type: 'tick', t: 0, dt: 10 }).battery).toBeLessThan(50);
    const charging = reduceDevice(on, { type: 'charge', on: true });
    expect(reduceDevice(charging, { type: 'tick', t: 0, dt: 10 }).battery).toBeGreaterThan(50);
    const empty = reduceDevice({ ...on, battery: 0.1 }, { type: 'tick', t: 0, dt: 10 });
    expect(empty).toMatchObject({ power: false, ble: 'off', battery: 0 });
    expect(LOW_BATTERY).toBeGreaterThan(0);
  });
  it('will not power on with a flat battery', () => {
    const flat = { ...initialDevice, battery: 0 };
    expect(reduceDevice(flat, { type: 'power', t: 0 })).toBe(flat);
  });
});

describe('actionSignal', () => {
  const peak = (a: Parameters<typeof actionSignal>[0], ch: 'h' | 'v') => {
    let best = 0;
    for (let t = 0; t <= 0.9; t += 0.01) { const x = actionSignal(a, t)[ch]; if (Math.abs(x) > Math.abs(best)) best = x; }
    return best;
  };
  it('looking up is a positive pulse on V, down a negative one', () => {
    expect(peak('up', 'v')).toBeGreaterThan(200);
    expect(peak('down', 'v')).toBeLessThan(-200);
    expect(peak('up', 'h')).toBe(0);
  });
  it('left and right move the H channel only', () => {
    expect(peak('right', 'h')).toBeGreaterThan(200);
    expect(peak('left', 'h')).toBeLessThan(-200);
    expect(peak('left', 'v')).toBe(0);
  });
  it('a blink is a tall, short spike on V', () => {
    expect(peak('blink', 'v')).toBeGreaterThan(peak('up', 'v'));
    expect(actionSignal('blink', 0.6).v).toBeLessThan(1);
  });
  it('returns to baseline after the action', () => {
    expect(actionSignal('up', 2)).toEqual({ h: 0, v: 0 });
    expect(actionSignal(null, 0.2)).toEqual({ h: 0, v: 0 });
  });
});
