import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Lays its children out at a fixed CSS width (like a real device viewport) and scales the result to fill
 * the container, so an embedded screen keeps its own responsive layout at any window size.
 * The container must get its size from CSS.
 */
export function Scaled({ width, className, children }: { width: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      const scale = e.contentRect.width / width;
      setFit({ scale, h: e.contentRect.height / scale });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={ref} className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width, height: fit.h, transform: `scale(${fit.scale})`, transformOrigin: 'top left' }}>
        {fit.h > 0 && children}
      </div>
    </div>
  );
}
