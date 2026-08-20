import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, ChevronLeft, Trash2, FileText, Upload } from 'lucide-react';
import Sheet from './lib/Sheet';
import { addPdf, deletePdf, formatBytes, getPdf, listPdfs } from './pdfStorage';

// ---------------------------------------------------------------------------
// DIRECTORIO DE PDFs — cargar planes y abrirlos adentro de la app.
// ---------------------------------------------------------------------------

const formatWhen = (ts) => {
  try {
    return new Date(ts).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

export default function PdfLibrary({ onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const fileRef = useRef(null);

  const refresh = async () => {
    try {
      const next = await listPdfs();
      setItems(next);
      setError('');
    } catch (err) {
      setError(err.message || 'No se pudieron leer los PDFs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!viewing?.blob) {
      setObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(viewing.blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [viewing]);

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await addPdf(file);
      await refresh();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el PDF.');
    } finally {
      setBusy(false);
    }
  };

  const openItem = async (id) => {
    setBusy(true);
    setError('');
    try {
      const rec = await getPdf(id);
      if (!rec) throw new Error('Ese PDF ya no está.');
      setViewing(rec);
    } catch (err) {
      setError(err.message || 'No se pudo abrir el PDF.');
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (id) => {
    setBusy(true);
    try {
      await deletePdf(id);
      if (viewing?.id === id) setViewing(null);
      await refresh();
    } catch (err) {
      setError(err.message || 'No se pudo borrar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose} labelledBy="pdfs-titulo" align="full">
      <div
        className="sheet sheet-full w-full h-full max-w-md flex flex-col min-h-0 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {viewing ? (
          <>
            <header className="flex items-center gap-1 px-3 py-2 border-b border-white/5">
              <button
                onClick={() => setViewing(null)}
                aria-label="Volver a la lista"
                className="btn-icon hover:bg-slate-800"
              >
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              <h2 id="pdfs-titulo" className="flex-1 min-w-0 text-sm font-semibold text-slate-100 truncate pr-2">
                {viewing.name}
              </h2>
              <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </header>
            {objectUrl ? (
              <div className="flex-1 min-h-0 bg-white">
                <iframe
                  title={viewing.name}
                  src={objectUrl}
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-16">Abriendo…</p>
            )}
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-4 py-3">
              <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <h2 id="pdfs-titulo" className="text-sm font-semibold tracking-wide text-slate-200">
                Planes PDF
              </h2>
              <button
                onClick={pickFile}
                disabled={busy}
                aria-label="Cargar PDF"
                className="btn-icon hover:bg-slate-800"
              >
                <Plus className="w-5 h-5 text-slate-300" />
              </button>
            </header>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={onFile}
            />

            <div
              className="flex-1 overflow-y-auto px-4 pb-8"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
            >
              {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2 mb-3">
                  {error}
                </p>
              )}

              {loading ? (
                <p className="text-sm text-slate-500 text-center py-16">Cargando…</p>
              ) : items.length === 0 ? (
                <button
                  onClick={pickFile}
                  disabled={busy}
                  className="w-full mt-6 rounded-3xl border border-dashed border-slate-600 px-6 py-14 text-center hover:border-slate-500 transition-colors"
                >
                  <span className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-slate-300" />
                  </span>
                  <p className="text-base font-semibold text-slate-100">Cargar un PDF</p>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Tu plan, un machete, lo que quieras consultar sin salir de la app.
                  </p>
                </button>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-2xl surface flex items-stretch">
                      <button
                        onClick={() => openItem(item.id)}
                        disabled={busy}
                        className="flex-1 flex items-center gap-3 text-left px-3.5 py-3 min-w-0"
                      >
                        <span className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-slate-300" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-100 truncate">{item.name}</span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            {formatWhen(item.addedAt)} · {formatBytes(item.size)}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={busy}
                        aria-label={`Borrar ${item.name}`}
                        className="btn-icon shrink-0 self-center mr-1 hover:bg-slate-800"
                      >
                        <Trash2 className="w-4 h-4 text-slate-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {items.length > 0 && (
                <button
                  onClick={pickFile}
                  disabled={busy}
                  className="w-full mt-3 py-3 rounded-2xl border border-dashed border-slate-600 text-sm font-semibold text-slate-300 hover:border-slate-500 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Cargar otro PDF
                </button>
              )}

              <p className="text-[11px] text-slate-600 text-center mt-6 leading-relaxed">
                Quedan en este teléfono, no viajan con la copia de seguridad JSON.
              </p>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
