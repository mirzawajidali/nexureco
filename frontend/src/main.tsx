import './utils/storageMigration';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Typography: Barlow (body/UI, 400 + 700 only) and Archivo (display headlines, width axis for font-stretch)
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/700.css';
import '@fontsource-variable/archivo/wdth.css';
import App from './App';
import './styles/globals.css';

// Auto-reload when a lazy chunk fails to load (stale deployment)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
