// ---------------------------------------------------------------------------
// PLANES EN PDF
//
// Los PDFs no entran en localStorage (se quedan cortos de cupo) ni en el backup
// JSON. Van a IndexedDB como Blob, en el teléfono, para abrirlos adentro de la
// app sin salir a Archivos.
// ---------------------------------------------------------------------------

const DB_NAME = 'nutritrack';
const DB_VERSION = 1;
const STORE = 'pdfs';

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador no puede guardar PDFs.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error || new Error('No se pudo abrir el archivo de PDFs.'));
    };
  });
  return dbPromise;
};

const txDone = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Operación cancelada.'));
  });

export const isPdfFile = (file) => {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  if (type === 'application/pdf' || type === 'application/x-pdf') return true;
  return /\.pdf$/i.test(file.name || '');
};

export const formatBytes = (n) => {
  const bytes = Number(n) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const requestToPromise = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const listPdfs = async () => {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const all = await requestToPromise(tx.objectStore(STORE).getAll());
  await txDone(tx);
  return (all || [])
    .map(({ blob, ...meta }) => meta)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
};

export const getPdf = async (id) => {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readonly');
  const rec = await requestToPromise(tx.objectStore(STORE).get(id));
  await txDone(tx);
  return rec || null;
};

export const addPdf = async (file) => {
  if (!isPdfFile(file)) {
    throw new Error('Elegí un archivo PDF.');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`El PDF pesa más de ${formatBytes(MAX_PDF_BYTES)}.`);
  }
  const rec = {
    id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: (file.name || 'plan.pdf').replace(/\.pdf$/i, '') || 'plan',
    size: file.size,
    addedAt: Date.now(),
    blob: file,
  };
  try {
    const db = await openDb();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(rec);
    await txDone(tx);
    return { id: rec.id, name: rec.name, size: rec.size, addedAt: rec.addedAt };
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
      throw new Error('No hay espacio en el teléfono para guardar este PDF.');
    }
    throw err;
  }
};

export const deletePdf = async (id) => {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
};
