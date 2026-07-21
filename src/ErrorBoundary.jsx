import React from 'react';
import { AlertTriangle, RotateCcw, Download } from 'lucide-react';
import { downloadFullBackup } from './backupStorage';

// ---------------------------------------------------------------------------
// ERROR BOUNDARY — red de última instancia
//
// Sin esto, un error de render en cualquier parte del árbol dejaba la pantalla
// en blanco: los datos seguían intactos en localStorage, pero el usuario quedaba
// trabado sin ninguna salida y sin saber que no perdió nada.
//
// La pantalla de recuperación hace dos cosas, en este orden:
//   1. Tranquiliza: los datos están a salvo (es verdad, viven en el teléfono).
//   2. Da salidas reales: reintentar el render, y —clave— exportar la copia de
//      seguridad SIN tener que volver a Ajustes, que es justo lo que está roto.
//      Si el crash es determinista, el backup es la forma de no perder nada
//      antes de reinstalar.
//
// Tiene que ser componente de clase: los error boundaries son la única cosa que
// React todavía no expone como hook (`getDerivedStateFromError` /
// `componentDidCatch` no tienen equivalente funcional).
// ---------------------------------------------------------------------------

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Queda en la consola para poder diagnosticarlo si el usuario manda captura.
    // No hay logging remoto: la app no tiene backend y no manda nada afuera.
    console.error('NutriTrack se colgó:', error, info?.componentStack);
  }

  handleRetry = () => {
    // Reinicio suave: se vuelve a intentar el render sin recargar. Alcanza para
    // los errores transitorios; si es determinista, se vuelve a caer acá mismo
    // y queda el botón de exportar como salida real.
    this.setState({ hasError: false, error: null });
  };

  handleExport = () => {
    try {
      downloadFullBackup();
    } catch (e) {
      // Si hasta el backup falla, no hay mucho más que ofrecer desde acá.
      console.error('No se pudo exportar la copia de seguridad:', e);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="min-h-screen w-full bg-slate-900 text-slate-100 flex items-center justify-center px-6"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="w-full max-w-sm surface rounded-3xl p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>

          <h1 className="mt-4 text-lg font-bold text-slate-100">Se colgó algo</h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            La app tuvo un error inesperado, pero tus datos están a salvo: todo se guarda en tu
            teléfono. Probá reintentar; si vuelve a pasar, exportá una copia por las dudas.
          </p>

          <div className="mt-6 space-y-2.5">
            <button
              onClick={this.handleRetry}
              className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-5 h-5" /> Reintentar
            </button>
            <button
              onClick={this.handleExport}
              className="w-full rounded-2xl border border-slate-600 text-slate-300 font-semibold py-3 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"
            >
              <Download className="w-5 h-5" /> Exportar mis datos
            </button>
          </div>

          {/* El mensaje del error queda a mano pero plegado: sirve si el usuario
              saca captura, sin ensuciar la pantalla de recuperación. */}
          {this.state.error?.message && (
            <details className="mt-5 text-left">
              <summary className="text-xs text-slate-500 cursor-pointer select-none">Detalles técnicos</summary>
              <p className="mt-2 text-[11px] text-slate-500 font-mono break-words leading-relaxed">
                {String(this.state.error.message)}
              </p>
            </details>
          )}
        </div>
      </div>
    );
  }
}
