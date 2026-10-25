import './demoSwitch.css';

const LINKS = [
  { href: '#/', label: 'Home' },
  { href: '#/demo', label: 'Live demo' },
  { href: '#/hardware', label: 'Hardware' },
  { href: '#/patient', label: 'Patient' },
  { href: '#/nurse', label: 'Nurse' },
] as const;

type Current = Exclude<(typeof LINKS)[number]['href'], '#/'>;

/** Demo-only switcher between the screens. `tone` matches the surface it sits on. */
export function DemoSwitch({ current, tone = 'surface' }: { current: Current; tone?: 'brand' | 'surface' }) {
  return (
    <nav className={`demo-switch ${tone}`} aria-label="Demo screens" dir="ltr">
      <span className="demo-switch-tag">Demo</span>
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} aria-current={l.href === current ? 'page' : undefined}>{l.label}</a>
      ))}
    </nav>
  );
}
