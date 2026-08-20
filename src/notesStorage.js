// ---------------------------------------------------------------------------
// BLOC DE NOTAS
//
// Un cuaderno local para machetes, ideas y recetas. Sin sync: vive en
// localStorage como el resto de la app, y entra en la copia de seguridad JSON.
// ---------------------------------------------------------------------------

const KEY = 'nutri_notes';

const readJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento no disponible, se continúa sin persistir
  }
};

export const uid = () => `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const blankNote = () => ({
  id: uid(),
  body: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/** Primera línea con texto, para listar sin pedirle un título al usuario. */
export const titleFromBody = (body) => {
  const line = String(body || '')
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return 'Sin título';
  return line.length > 48 ? `${line.slice(0, 48).trim()}…` : line;
};

export const loadNotes = () => {
  const raw = readJSON(KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && typeof n === 'object' && typeof n.id === 'string')
    .map((n) => ({
      id: n.id,
      body: typeof n.body === 'string' ? n.body : '',
      createdAt: Number(n.createdAt) || Date.now(),
      updatedAt: Number(n.updatedAt) || Date.now(),
    }));
};

/** Persiste solo notas con contenido: un borrador vacío no ensucia el cuaderno. */
export const saveNotes = (notes) => {
  const cleaned = (Array.isArray(notes) ? notes : []).filter((n) => n.body && n.body.trim());
  writeJSON(KEY, cleaned);
  return cleaned;
};
