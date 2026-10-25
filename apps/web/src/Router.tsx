import { lazy, Suspense, useEffect, useState } from 'react';

/* Hash routes keep the build a single static page: one link for judges, no server rewrites. */
const PatientScreen = lazy(() => import('./patient/PatientScreen').then((m) => ({ default: m.PatientScreen })));
const NurseShowcase = lazy(() => import('./nurse/NurseShowcase').then((m) => ({ default: m.NurseShowcase })));
const HardwarePage = lazy(() => import('./hardware/HardwarePage').then((m) => ({ default: m.HardwarePage })));
const DemoRoom = lazy(() => import('./demo/DemoRoom').then((m) => ({ default: m.DemoRoom })));
const Home = lazy(() => import('./home/Home').then((m) => ({ default: m.Home })));

const routes = {
  '#/patient': PatientScreen,
  '#/nurse': NurseShowcase,
  '#/demo': DemoRoom,
  '#/hardware': HardwarePage,
} as const;

function currentHash() {
  return window.location.hash.replace(/\?.*$/, '');
}

export function Router() {
  const [hash, setHash] = useState(currentHash);
  useEffect(() => {
    const onChange = () => setHash(currentHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const Page = routes[hash as keyof typeof routes] ?? Home;
  return (
    <Suspense fallback={null}>
      <Page />
    </Suspense>
  );
}
