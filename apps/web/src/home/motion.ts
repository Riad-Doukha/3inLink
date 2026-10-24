import { useEffect, useState, type RefObject } from 'react';

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * Scroll effects for the landing page:
 * - adds `is-in` to every [data-reveal] element the first time it enters the viewport
 * - exposes scroll position as --sy (px) and reading progress as --progress (0–1) on the root
 * Content is only hidden once this runs (`reveal-on`), so it stays visible without JS.
 */
export function useScrollEffects(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();

    const targets = el.querySelectorAll<HTMLElement>('[data-reveal]');
    let io: IntersectionObserver | null = null;
    if (!reduced && 'IntersectionObserver' in window) {
      el.classList.add('reveal-on');
      io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io?.unobserve(e.target);
          }
        }
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
      targets.forEach((t) => io!.observe(t));
    } else {
      targets.forEach((t) => t.classList.add('is-in'));
    }

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        el.style.setProperty('--progress', String(max > 0 ? window.scrollY / max : 0));
        if (!reduced) el.style.setProperty('--sy', String(window.scrollY));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [root]);
}

/** Counts from 0 to `to` once the element has been revealed. */
export function useCountUp(to: number, decimals: number, ref: RefObject<HTMLElement>, ms = 1400) {
  const [value, setValue] = useState(prefersReducedMotion() ? to : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const start = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / ms);
        setValue(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { start(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, ms, ref]);
  return value.toFixed(decimals);
}
