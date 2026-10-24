import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { BrandMark, Icon, type IconName } from '@3inlink/design-tokens';
import { DemoSwitch } from '../lib/DemoSwitch';
import { PhoneFrame } from '../lib/PhoneFrame';
import { useMedia } from '../lib/useMedia';
import { NurseApp } from './NurseApp';
import './showcase.css';

const WIDE = '(min-width: 980px) and (min-height: 620px)';

const FEATURES: { icon: IconName; title: string; text: string; urgent?: boolean }[] = [
  { icon: 'check', title: 'Live, no refresh', text: 'A confirmed double blink appears on every nurse phone within a second or two.' },
  { icon: 'pain', title: 'Pain comes first', text: 'Pinned to the top in red, with a double vibration. Late alerts turn red after 10 minutes.', urgent: true },
  { icon: 'bed', title: 'ID and room, never names', text: 'Cards show only the patient ID and room, so nothing sensitive sits on a lock screen.' },
  { icon: 'speaker', title: 'English, Français, العربية', text: 'Switch language in the app footer. Arabic mirrors the whole layout.' },
];

/** Nurse app presented inside a phone on a dark stage. Narrow screens get the plain full-screen app. */
export function NurseShowcase() {
  const wide = useMedia(WIDE);
  const [qr, setQr] = useState<string | null>(null);
  const nurseUrl = `${window.location.origin}${window.location.pathname}#/nurse`;
  const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname);

  useEffect(() => {
    if (!wide) return;
    QRCode.toDataURL(nurseUrl, { margin: 1, width: 240, color: { dark: '#0F2A33', light: '#FFFFFF' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [wide, nurseUrl]);

  if (!wide) return <NurseApp />;

  const openPatient = () => {
    window.open('#/patient', '3inlink-patient', 'width=1280,height=800');
  };

  return (
    <div className="stage" data-mode="night">
      <span className="stage-glow g1" aria-hidden="true" />
      <span className="stage-glow g2" aria-hidden="true" />

      <header className="stage-bar">
        <a className="stage-brand" href="#/"><BrandMark />3inLink</a>
        <DemoSwitch current="#/nurse" tone="brand" />
      </header>

      <main className="stage-main">
        <section className="stage-side left" aria-label="What the nurse app does">
          <p className="stage-eyebrow">Nurse app</p>
          <h1 className="stage-title">Every request, the moment it is sent.</h1>
          <ul className="stage-features">
            {FEATURES.map((f, i) => (
              <li key={f.title} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <span className={`stage-ic${f.urgent ? ' urgent' : ''}`}><Icon name={f.icon} /></span>
                <span><b>{f.title}</b><span>{f.text}</span></span>
              </li>
            ))}
          </ul>
        </section>

        <div className="phone-wrap">
          <PhoneFrame label="Nurse app on a phone">
            <NurseApp embedded />
          </PhoneFrame>
        </div>

        <section className="stage-side right" aria-label="Try the demo">
          <p className="stage-eyebrow">Try it</p>
          <ol className="stage-steps">
            <li><b>Open the patient screen</b><span>It opens in a second window. Put the two side by side.</span>
              <button className="stage-btn" onClick={openPatient}>Open patient screen <Icon name="right" /></button>
            </li>
            <li><b>Look down, then blink twice</b><span>Use <kbd>↓</kbd> to move and <kbd>Space</kbd> <kbd>Space</kbd> to send.</span></li>
            <li><b>Watch it arrive here</b><span>Tap the card on the phone to mark it handled.</span></li>
          </ol>

          <div className="stage-qr">
            {qr ? <img src={qr} alt="QR code to open the nurse app on your phone" width={120} height={120} /> : <span className="stage-qr-ph" />}
            <span>
              <b>Use your own phone</b>
              <span>{isLocal
                ? 'Scan once the demo is deployed. Localhost is not reachable from a phone.'
                : 'Scan to open the nurse app. Alerts arrive on it in real time.'}</span>
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
