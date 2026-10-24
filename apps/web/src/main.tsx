import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@3inlink/design-tokens/tokens.css';
import { Router } from './Router';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
