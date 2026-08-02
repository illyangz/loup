import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register the (network-passthrough) service worker so the app is
// installable to the home screen. Production only — a service worker in
// dev interferes with Vite's HMR module serving.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        // Installability is progressive enhancement; never block the app.
      });
  });
}
