/** Vibrate and chime for a new alert. Urgent alerts get a double pattern. Both fail silently where unsupported. */
export function notifyNewAlert(urgent: boolean) {
  try { navigator.vibrate?.(urgent ? [200, 120, 200] : 200); } catch { /* not supported */ }
  try {
    const ctx = new AudioContext();
    const tones = urgent ? [880, 660, 880] : [660];
    tones.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch { /* audio blocked until the page has been touched */ }
}
