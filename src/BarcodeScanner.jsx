import React, { useEffect, useRef, useState } from 'react';
import { X, ScanLine, Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// ESCÁNER DE CÓDIGO DE BARRAS
//
// Apunta al paquete y listo: evita tipear los macros de un producto envasado.
// Detección en dos niveles:
//   - `BarcodeDetector` nativo donde exista (Android/Chrome): sin descargas.
//   - `@zxing/browser` como respaldo (Safari/iOS no lo soporta). Se importa de
//     forma dinámica para que no pese en el bundle de quien nunca escanea.
//
// La cámara exige HTTPS (o localhost). Todo error termina en un mensaje claro
// con salida a carga manual: nunca deja al usuario trabado.
// ---------------------------------------------------------------------------

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export default function BarcodeScanner({ onDetected, onCancel }) {
  const videoRef = useRef(null);
  const stopRef = useRef(null); // limpieza del lector zxing, si se usó
  const doneRef = useRef(false); // evita disparar dos veces el mismo escaneo
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let stream = null;
    let raf = 0;
    let cancelled = false;

    const finish = (code) => {
      if (doneRef.current || cancelled) return;
      doneRef.current = true;
      onDetected(code);
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStarting(false);

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: FORMATS });
          const tick = async () => {
            if (cancelled || doneRef.current) return;
            try {
              const codes = await detector.detect(video);
              if (codes && codes.length > 0) {
                finish(codes[0].rawValue);
                return;
              }
            } catch (e) {
              // un frame ilegible no es un fallo: se reintenta en el siguiente
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          return;
        }

        // Respaldo para Safari/iOS: se descarga recién acá.
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) finish(result.getText());
        });
        stopRef.current = () => controls.stop();
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        setError(
          e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
            ? 'No nos diste permiso para usar la cámara. Podés habilitarlo en los ajustes del navegador.'
            : e && e.name === 'NotFoundError'
            ? 'No encontramos una cámara en este dispositivo.'
            : 'No pudimos abrir la cámara. Probá de nuevo o cargá el alimento a mano.'
        );
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (stopRef.current) {
        try {
          stopRef.current();
        } catch (e) {
          // el lector ya estaba detenido
        }
      }
      // Cortar los tracks es imprescindible: si no, la cámara queda prendida.
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  // Escape cancela el escaneo.
  //
  // Va en un efecto propio, separado del de la cámara: `onCancel` llega como
  // flecha inline desde App, así que cambia de identidad en cada render, y
  // sumarlo a las dependencias del efecto de arriba reiniciaría la cámara —pedir
  // `getUserMedia` de nuevo, el destello del video, todo— cada vez que el padre
  // se renderiza. Acá reenganchar un listener de teclado no cuesta nada.
  //
  // No usa Sheet porque el escáner es una toma de pantalla completa y opaca, no
  // una hoja sobre velo: no comparte nada de ese comportamiento salvo esto. Las
  // otras dos pantallas completas —la intro y el cálculo del plan— NO cierran
  // con Escape a propósito: son pasos de un alta, y descartarlos con una tecla
  // suelta es más fácil de hacer sin querer que de deshacer.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col" role="dialog" aria-modal="true" aria-label="Escanear código de barras">
      <div
        className="flex items-center justify-between px-5 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}
      >
        <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-emerald-400" /> Escaneá el código
        </p>
        <button onClick={onCancel} aria-label="Cerrar escáner" className="btn-icon hover:bg-slate-800">
          <X className="w-5 h-5 text-slate-300" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />

        {/* Marco guía */}
        {!error && !starting && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4/5 h-32 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_100vmax_rgba(15,23,42,0.55)]" />
          </div>
        )}

        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Abriendo la cámara…
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <p className="text-sm text-slate-300 text-center leading-relaxed">{error}</p>
          </div>
        )}
      </div>

      <div className="px-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)', paddingTop: '1rem' }}>
        <p className="text-xs text-slate-500 text-center mb-3">
          {error ? 'Podés cargar el alimento a mano desde el buscador.' : 'Centrá el código de barras dentro del marco'}
        </p>
        <button
          onClick={onCancel}
          className="w-full rounded-2xl border border-slate-600 text-slate-300 font-semibold py-3 hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
