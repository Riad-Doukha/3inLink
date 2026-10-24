import { useEffect, useState, type ReactNode } from 'react';
import { Scaled } from './Scaled';
import './phone.css';

function useClock() {
  const fmt = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/** A phone frame whose screen is a 390 px-wide viewport scaled to the frame. Size it with --phone-h. */
export function PhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  const time = useClock();
  return (
    <div className="phone" role="region" aria-label={label}>
      <span className="phone-btn b1" aria-hidden="true" />
      <span className="phone-btn b2" aria-hidden="true" />
      <span className="phone-btn b3" aria-hidden="true" />
      <Scaled width={390} className="phone-screen">
        <div className="phone-status" aria-hidden="true">
          <span>{time}</span>
          <span className="phone-island" />
          <span className="phone-icons">
            <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2" width="3" height="10" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
            <svg viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3" fill="none" stroke="currentColor" /><rect x="2.5" y="2.5" width="15" height="7" rx="1.5" /><rect x="23.5" y="4" width="2" height="4" rx="1" /></svg>
          </span>
        </div>
        {children}
        <span className="phone-home" aria-hidden="true" />
      </Scaled>
    </div>
  );
}
