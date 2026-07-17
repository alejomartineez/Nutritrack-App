import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
  </React.StrictMode>
);

// Registro del service worker para soporte offline en producción
if ('serviceWorker' in navigator) {
  // Si ya había un SW controlando la página, cuando entre uno nuevo (tras un
  // deploy) recargamos una sola vez para servir la versión actualizada en el
  // acto, sin que el usuario tenga que forzar el cierre de la app.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return; // ignora la primera instalación
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si falla el registro (por ejemplo en desarrollo local sin HTTPS),
      // la app sigue funcionando normalmente, solo sin caché offline.
    });
  });
}
