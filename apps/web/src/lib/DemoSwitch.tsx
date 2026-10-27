import { useEffect, useRef, useState } from 'react';
import { BrandMark, Icon } from '@3inlink/design-tokens';
import { useMedia } from './useMedia';
import './demoSwitch.css';

const LINKS = [
  { href: '#/', label: 'Home' },
  { href: '#/demo', label: 'Live demo' },
  { href: '#/hardware', label: 'Hardware' },
  { href: '#/patient', label: 'Patient' },
  { href: '#/nurse', label: 'Care assistant' },
] as const;

type Current = (typeof LINKS)[number]['href'];

/** In-page links shown in the drawer under "On this page" (e.g. the home page sections). */
export interface Section { id: string; label: string }

export const NARROW = '(max-width: 720px)';

interface Props {
  current: Current;
  tone?: 'brand' | 'surface';
  sections?: Section[];
  /** Hide the inline links on wide screens (the page has its own navigation there). */
  drawerOnly?: boolean;
}

/**
 * Navigation between the demo screens. Wide screens: an inline pill of links.
 * Narrow screens: a menu button that opens a drawer, with the page sections when given.
 */
export function DemoSwitch({ current, tone = 'surface', sections, drawerOnly = false }: Props) {
  const narrow = useMedia(NARROW);
  const [open, setOpen] = useState(false);

  if (!narrow) {
    if (drawerOnly) return null;
    return (
      <nav className={`demo-switch ${tone}`} aria-label="Demo screens" dir="ltr">
        <span className="demo-switch-tag">Demo</span>
        {LINKS.filter((l) => l.href !== '#/' || current !== '#/').map((l) => (
          <a key={l.href} href={l.href} aria-current={l.href === current ? 'page' : undefined}>{l.label}</a>
        ))}
      </nav>
    );
  }

  return (
    <>
      <button className={`nav-burger ${tone}`} aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="menu" />
      </button>
      {open && <NavDrawer current={current} sections={sections} onClose={() => setOpen(false)} />}
    </>
  );
}

function NavDrawer({ current, sections, onClose }: { current: Current; sections?: Section[]; onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const close = () => ref.current?.close();

  const goTo = (id: string) => {
    close();
    // after the drawer has closed, so the page can scroll
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <dialog
      ref={ref}
      className="nav-drawer"
      dir="ltr"
      aria-label="Menu"
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="nav-drawer-inner">
        <div className="nav-drawer-head">
          <span className="nav-drawer-brand"><BrandMark />3inLink</span>
          <button className="nav-close" aria-label="Close menu" onClick={close}><Icon name="close" /></button>
        </div>

        {sections && sections.length > 0 && (
          <nav aria-label="On this page">
            <p className="nav-drawer-title">On this page</p>
            <ul>
              {sections.map((s) => (
                <li key={s.id}><button onClick={() => goTo(s.id)}>{s.label}</button></li>
              ))}
            </ul>
          </nav>
        )}

        <nav aria-label="Demo screens">
          <p className="nav-drawer-title">Screens</p>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} aria-current={l.href === current ? 'page' : undefined} onClick={close}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="nav-drawer-foot">Research prototype · Thirduni Project</p>
      </div>
    </dialog>
  );
}
