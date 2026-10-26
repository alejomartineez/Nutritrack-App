import React from 'react';
import ReactDOM from 'react-dom/client';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { Toaster } from './ui/toast';
import { lockViewportZoom } from './lib/viewport';
import { initAppearance } from './lib/appearance';
import { snapshotBeforeUpgrade, requestPersistentStorage } from './backupStorage';
import './index.css';

snapshotBeforeUpgrade();
requestPersistentStorage();
initAppearance();
lockViewportZoom();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster />
    <SpeedInsights />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  // Tras un deploy, el SW nuevo toma control y se recarga una vez para servir
  // la versión nueva sin tener que cerrar la app.
  const hadController = !!navigator.serviceWorker.controller;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
