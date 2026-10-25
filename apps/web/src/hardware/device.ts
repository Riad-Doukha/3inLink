import type { IconName } from '@3inlink/design-tokens';

/**
 * The 3inLink wearable, as specified in the hardware design sheet ("3inLink Eye System").
 * Single source of truth for the home teaser, the hardware page and the simulation:
 * change a placement or a part here and every view follows.
 */

export type ElectrodeId = 'hp' | 'hm' | 'vp' | 'vm' | 'ref';

export interface Electrode {
  id: ElectrodeId;
  label: string;
  name: string;
  placement: string;
  role: string;
  kind: 'h' | 'v' | 'ref';
}

export const ELECTRODES: Electrode[] = [
  { id: 'vp', label: 'V+', name: 'Vertical (+)', placement: 'Above the eye', role: 'Vertical channel. Rises when the eye looks up or blinks.', kind: 'v' },
  { id: 'vm', label: 'V−', name: 'Vertical (−)', placement: 'Below the eye', role: 'Vertical channel. Pairs with V+ to measure up and down.', kind: 'v' },
  { id: 'hp', label: 'H+', name: 'Horizontal (+)', placement: 'Outer canthus (outer corner of the eye)', role: 'Horizontal channel. Rises when the eye turns toward it.', kind: 'h' },
  { id: 'hm', label: 'H−', name: 'Horizontal (−)', placement: 'Inner canthus (inner corner of the eye)', role: 'Horizontal channel. Pairs with H+ to measure left and right.', kind: 'h' },
  { id: 'ref', label: 'REF', name: 'Reference', placement: 'Mastoid, just behind the earlobe', role: 'Electrically quiet reference point for both channels.', kind: 'ref' },
];

export const CHANNELS = [
  { id: 'H', pair: 'H+ − H−', detects: 'Left and right glances' },
  { id: 'V', pair: 'V+ − V−', detects: 'Up and down glances, blinks' },
] as const;

export interface Part { title: string; text: string; icon: IconName }

export const COMPONENTS: Part[] = [
  { title: 'Clean PCBA', text: 'Custom low-power EOG processing board: amplification, filtering and digitising.', icon: 'chip' },
  { title: 'Lithium polymer battery', text: 'Rechargeable cell for long battery life, away from mains noise.', icon: 'battery' },
  { title: 'Mechanical clip', text: 'Secure, adjustable mounting on the strap or behind the ear.', icon: 'shield' },
  { title: 'Assembled module', text: 'Fully integrated, lightweight design for daily use.', icon: 'eye' },
];

export type ModuleView = 'upper' | 'down' | 'left';
export type PartId = 'cables' | 'ble' | 'clip' | 'power' | 'leds' | 'usb';

export const MODULE_VIEWS: { id: ModuleView; label: string; parts: PartId[] }[] = [
  { id: 'upper', label: 'Upper side · connections', parts: ['cables', 'ble'] },
  { id: 'down', label: 'Down side · clip', parts: ['cables', 'clip'] },
  { id: 'left', label: 'Left side · controls and charging', parts: ['power', 'leds', 'usb', 'ble'] },
];

export const MODULE_PARTS: Record<PartId, { title: string; text: string }> = {
  cables: { title: '5 shielded electrode cables', text: 'H+, H−, REF, V+ and V−, with gold electrodes.' },
  ble: { title: 'Bluetooth status LED', text: 'The eye logo blinks while pairing and stays lit when connected.' },
  clip: { title: 'Clip', text: 'Secure mounting on the strap or behind the ear.' },
  power: { title: 'Power button', text: 'Turns the module on or off.' },
  leds: { title: 'Battery indicator', text: 'Four LEDs show the charge level.' },
  usb: { title: 'USB-C charging', text: 'Charge the lithium polymer battery with any USB-C cable.' },
};

export const FEATURES: Part[] = [
  { title: 'High-precision EOG', text: 'Two channels, 250 samples a second.', icon: 'eye' },
  { title: 'Lightweight and comfortable', text: 'A soft mask and a small module.', icon: 'feather' },
  { title: 'Secure fit', text: 'Adjustable strap and clip.', icon: 'shield' },
  { title: 'USB-C charging', text: 'One standard cable.', icon: 'usb' },
  { title: 'Long battery life', text: 'Lithium polymer, low-power board.', icon: 'battery' },
  { title: 'Wireless (BLE)', text: 'Bluetooth Low Energy to the processing unit.', icon: 'bluetooth' },
];

export const PIPELINE = [
  { id: 'electrodes', title: 'Electrodes', text: 'Corneo-retinal potential, 10 µV to 3.5 mV' },
  { id: 'amp', title: 'Amplify', text: 'AD620 instrumentation amplifier' },
  { id: 'filter', title: 'Filter', text: 'Band-pass 0.1–35 Hz' },
  { id: 'adc', title: 'Digitise', text: 'ESP32, 250 samples a second' },
  { id: 'ble', title: 'Bluetooth LE', text: 'Wireless link from the module' },
  { id: 'cpu', title: 'Process', text: 'Classifier on a laptop today, Raspberry Pi in the final design' },
  { id: 'screen', title: 'Patient screen', text: 'The selected message, then the nurses' },
] as const;

export const DEVICE_STATUS = 'Wearable design · in development';
