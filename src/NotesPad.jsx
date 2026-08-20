import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, ChevronLeft, Trash2, PenLine } from 'lucide-react';
import Sheet from './lib/Sheet';
import { blankNote, loadNotes, saveNotes, titleFromBody } from './notesStorage';

// ---------------------------------------------------------------------------
// BLOC DE NOTAS — superficie de escritura, sin chrome de "app de notas".
// Abrís y escribís. La primera línea es el título en la lista. Se guarda solo.
// ---------------------------------------------------------------------------

const formatWhen = (ts) => {
  try {
    return new Date(ts).toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function NotesPad({ onClose }) {
  const [notes, setNotes] = useState(loadNotes);
  const [activeId, setActiveId] = useState(() => {
    const all = loadNotes();
    if (all.length === 0) return null;
    return [...all].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
  });
  const [view, setView] = useState('write');
  const textareaRef = useRef(null);

  const persist = (next) => {
    setNotes(next);
    saveNotes(next);
  };

  const active = notes.find((n) => n.id === activeId) || null;
  const writing = active || (notes.length === 0 ? { id: 'draft', body: '', updatedAt: Date.now() } : null);

  const openNote = (id) => {
    setActiveId(id);
    setView('write');
  };

  const startNew = () => {
    const note = blankNote();
    persist([note, ...notes.filter((n) => n.body.trim())]);
    setActiveId(note.id);
    setView('write');
  };

  const setBody = (body) => {
    if (!active) {
      if (!body.trim()) return;
      const note = { ...blankNote(), body };
      persist([note]);
      setActiveId(note.id);
      return;
    }
    const next = notes.map((n) => (n.id === active.id ? { ...n, body, updatedAt: Date.now() } : n));
    persist(next);
  };

  const removeNote = (id) => {
    const next = notes.filter((n) => n.id !== id);
    persist(next);
    if (activeId === id) {
      setActiveId(next[0]?.id ?? null);
      if (next.length === 0) setView('write');
    }
  };

  useEffect(() => {
    if (view !== 'write') return;
    const el = textareaRef.current;
    if (!el) return;
    // Cursor al final, sin abrir el teclado a la fuerza (Sheet ya evita autofocus).
    el.setSelectionRange(el.value.length, el.value.length);
  }, [view, activeId]);

  const listed = useMemo(
    () => [...notes].filter((n) => n.body.trim()).sort((a, b) => b.updatedAt - a.updatedAt),
    [notes]
  );

  return (
    <Sheet onClose={onClose} labelledBy="notas-titulo" align="full">
      <div
        className="writer-sheet sheet sheet-full w-full h-full max-w-md flex flex-col min-h-0 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {view === 'list' ? (
          <>
            <header className="flex items-center justify-between px-4 py-3">
              <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <h2 id="notas-titulo" className="text-sm font-semibold tracking-wide text-slate-200">
                Notas
              </h2>
              <button onClick={startNew} aria-label="Nueva nota" className="btn-icon hover:bg-slate-800">
                <Plus className="w-5 h-5 text-slate-300" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {listed.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-16 leading-relaxed">
                  Todavía no hay nada escrito.
                  <br />
                  Tocá + para una página en blanco.
                </p>
              ) : (
                <ul className="space-y-2">
                  {listed.map((n) => (
                    <li key={n.id}>
                      <div className="writer-card rounded-2xl flex items-stretch">
                        <button
                          onClick={() => openNote(n.id)}
                          className="flex-1 text-left px-4 py-3.5 min-w-0"
                        >
                          <p className="text-[15px] text-amber-100/90 truncate leading-snug">
                            {titleFromBody(n.body)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{formatWhen(n.updatedAt)}</p>
                        </button>
                        <button
                          onClick={() => removeNote(n.id)}
                          aria-label={`Borrar ${titleFromBody(n.body)}`}
                          className="btn-icon shrink-0 self-center mr-1 hover:bg-slate-800"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between px-3 py-2">
              <button
                onClick={() => (listed.length > 0 ? setView('list') : onClose())}
                aria-label={listed.length > 0 ? 'Ver todas las notas' : 'Cerrar'}
                className="btn-icon hover:bg-slate-800"
              >
                {listed.length > 0 ? (
                  <ChevronLeft className="w-5 h-5 text-slate-400" />
                ) : (
                  <X className="w-5 h-5 text-slate-400" />
                )}
              </button>
              <h2 id="notas-titulo" className="text-sm font-semibold tracking-wide text-slate-400 flex items-center gap-1.5">
                <PenLine className="w-3.5 h-3.5" /> Escribir
              </h2>
              <div className="flex items-center">
                {listed.length > 0 && (
                  <button onClick={onClose} aria-label="Cerrar" className="btn-icon hover:bg-slate-800">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                )}
                <button onClick={startNew} aria-label="Nueva nota" className="btn-icon hover:bg-slate-800">
                  <Plus className="w-5 h-5 text-slate-300" />
                </button>
              </div>
            </header>
            <textarea
              ref={textareaRef}
              value={writing?.body ?? ''}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Un machete, una idea, lo que se te ocurra…"
              className="writer-body flex-1 min-h-0 w-full px-6 pb-10 bg-transparent text-amber-50/90 placeholder-slate-600 resize-none border-0 outline-none"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2.5rem)' }}
              spellCheck
            />
          </>
        )}
      </div>
    </Sheet>
  );
}
