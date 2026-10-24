import type { SVGProps } from 'react';

/* Command symbols on a 24 px grid, 1.8 px round stroke (see the "Icons and layout" section of the design system). */
const PATHS = {
  nurse: (
    <>
      <circle className="ico" cx="12" cy="10" r="4" />
      <path className="ico" d="M4.5 21c0-4.2 3.3-6.5 7.5-6.5s7.5 2.3 7.5 6.5" />
      <path className="ico" d="M12 2.2v3.2M10.4 3.8h3.2" />
    </>
  ),
  pain: (
    <>
      <circle className="ico" cx="11" cy="13" r="8" />
      <path className="ico" d="M7.4 11.2l2.4.9M14.6 11.2l-2.4.9M8.6 17c.8-1 1.5-1.4 2.4-1.4s1.6.4 2.4 1.4" />
      <path className="ico" d="M19 2.5l-2.6 4.2h3.2l-2.6 4.1" />
    </>
  ),
  water: (
    <>
      <path className="ico" d="M12 3c3.6 4.6 6.2 7.7 6.2 11.1a6.2 6.2 0 0 1-12.4 0C5.8 10.7 8.4 7.6 12 3z" />
      <path className="ico" d="M9.2 14.8a3 3 0 0 0 2.3 2.5" />
    </>
  ),
  bed: (
    <>
      <path className="ico" d="M3 19V6M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7V15" />
      <rect className="ico" x="5.5" y="9" width="4" height="3.2" rx="1.2" />
      <path className="ico" d="M14 3.5v3.5M12.5 5.2L14 3.5l1.5 1.7" />
    </>
  ),
  toilet: <path className="ico" d="M7 3h10v5H7zM5 11h14c0 4-2.5 6.5-7 6.5S5 15 5 11zM10 17.5V21M14 17.5V21M8 21h8" />,
  cold: <path className="ico" d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.8L12 6.8l2.5-2M9.5 19.2L12 17.2l2.5 2" />,
  hot: <path className="ico" d="M9 14.5V5a2.5 2.5 0 0 1 5 0v9.5a4 4 0 1 1-5 0zM11.5 9v7.5M18 6h3M18 10h3" />,
  family: (
    <>
      <circle className="ico" cx="7" cy="8" r="2.8" />
      <circle className="ico" cx="17" cy="8" r="2.8" />
      <path className="ico" d="M2.5 19.5c0-3.3 1.9-5 4.5-5s4.5 1.7 4.5 5M12.5 19.5c0-3.3 1.9-5 4.5-5s4.5 1.7 4.5 5" />
    </>
  ),
  check: <path className="ico" d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path className="ico" d="M8 5.5v13l10.5-6.5z" />,
  pause: <path className="ico" d="M8.5 5.5v13M15.5 5.5v13" />,
  speaker: <path className="ico" d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />,
  left: <path className="ico" d="M19 12H5M11 6l-6 6 6 6" />,
  right: <path className="ico" d="M5 12h14M13 6l6 6-6 6" />,
  up: <path className="ico" d="M12 19V5M6 11l6-6 6 6" />,
  down: <path className="ico" d="M12 5v14M6 13l6 6 6-6" />,
  /* gear outline adapted from Lucide "settings" (ISC licence) */
  settings: (
    <>
      <path className="ico" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle className="ico" cx="12" cy="12" r="3" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      {PATHS[name]}
    </svg>
  );
}

/** Brand mark: eye outline, pupil, and gaze dots above and below. */
export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <path className="ico" d="M2 16C6 9.5 10.5 6.5 16 6.5S26 9.5 30 16c-4 6.5-8.5 9.5-14 9.5S6 22.5 2 16z" />
      <circle cx="16" cy="16" r="3.6" fill="currentColor" />
      <circle cx="16" cy="3" r="1.6" fill="currentColor" />
      <circle cx="16" cy="29" r="1.6" fill="currentColor" />
    </svg>
  );
}
