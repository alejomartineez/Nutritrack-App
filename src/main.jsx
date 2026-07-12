import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registro del service worker para soporte offline en producción
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Si falla el registro (por ejemplo en desarrollo local sin HTTPS),
      // la app sigue funcionando normalmente, solo sin caché offline.
    });
  });
}
