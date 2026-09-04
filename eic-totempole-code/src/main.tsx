import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/App';
import { KioskProvider } from './context/KioskContext';

import './styles/tokens.css';
import './styles/fonts.css';
import './styles/reset.css';

/**
 * Kiosk hardening: suppress the context menu so a long-press cannot open a
 * browser menu over the UI on a device with no keyboard to dismiss it
 * (research.md R9). Registered once for the life of the page.
 */
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root not found');
}

createRoot(container).render(
  <StrictMode>
    <KioskProvider>
      <App />
    </KioskProvider>
  </StrictMode>,
);
