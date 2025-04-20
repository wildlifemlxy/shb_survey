import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register'; // PWA service worker hook

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version is available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('The app is ready to work offline!');
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
