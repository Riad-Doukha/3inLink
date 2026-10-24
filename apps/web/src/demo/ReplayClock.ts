import { decisionsDue, type Decision, type Session } from '@3inlink/core';

type Listener = (t: number) => void;

/**
 * Plays a session in real time (or faster). Each animation frame advances `t` and fires the
 * decisions whose time has come, in order, exactly once. Listeners get the new time every frame.
 */
export class ReplayClock {
  t = 0;
  playing = false;
  speed = 1;
  readonly duration: number;
  private last = 0;
  private raf = 0;
  private listeners = new Set<Listener>();

  constructor(private session: Session, private onDecision: (d: Decision) => void) {
    this.duration = session.meta.duration_s;
  }

  play() {
    if (this.playing) return;
    if (this.t >= this.duration) this.t = 0;
    this.playing = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.emit();
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.emit();
  }

  restart() {
    this.pause();
    this.t = 0;
    this.emit();
  }

  setSpeed(s: number) {
    this.speed = s;
    this.emit();
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.listeners.clear();
  }

  private frame = (now: number) => {
    if (!this.playing) return;
    // cap the step so a background tab does not fire a burst of decisions on return
    const dt = Math.min(0.25, (now - this.last) / 1000) * this.speed;
    this.last = now;
    const prev = this.t;
    this.t = Math.min(this.duration, this.t + dt);
    decisionsDue(this.session.decisions, prev, this.t).forEach(this.onDecision);
    if (this.t >= this.duration) this.playing = false;
    this.emit();
    if (this.playing) this.raf = requestAnimationFrame(this.frame);
  };

  private emit() {
    this.listeners.forEach((l) => l(this.t));
  }
}
