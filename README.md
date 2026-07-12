# Mi Plan Nutricional (NutriTrack) — PWA

App de seguimiento nutricional lista para instalar en el iPhone como si fuera
una app nativa (ícono en pantalla de inicio, pantalla completa, funciona
offline una vez cargada).

## Qué incluye este proyecto
- `src/App.jsx` — la app completa (React + Tailwind + lucide-react).
- `public/manifest.json` — nombre, colores e íconos de la app instalada.
- `public/sw.js` — service worker para que funcione sin conexión.
- `public/icons/` — íconos ya generados (192px, 512px, maskable y apple-touch-icon).
- `index.html` — carga Tailwind por CDN, sin configuración extra.

No necesitás tocar nada de esto: ya está listo para publicar.

---

## Opción A (recomendada): sin terminal, con GitHub + Vercel

1. Creá una cuenta gratis en **github.com** (si no tenés).
2. Andá a **github.com/new**, creá un repositorio (por ejemplo `nutritrack-pwa`),
   dejalo público o privado, y confirmá.
3. En la página del repositorio recién creado, tocá **"uploading an existing file"**
   y arrastrá ahí dentro **todo el contenido de esta carpeta** (todos los
   archivos y subcarpetas: `src/`, `public/`, `index.html`, `package.json`, etc.).
   Confirmá el commit.
4. Andá a **vercel.com** → creá una cuenta gratis (podés entrar directo con tu
   cuenta de GitHub) → **"Add New… → Project"** → elegí el repositorio que subiste.
5. Vercel detecta automáticamente que es un proyecto Vite y hace `npm install`
   y `npm run build` solo. Tocá **"Deploy"** y esperá 1-2 minutos.
6. Te da una URL pública (algo como `nutritrack-pwa.vercel.app`). Esa es tu app
   ya online.

(Netlify funciona igual: **netlify.com** → **"Add new site" → "Import an
existing project"** → elegís el repo de GitHub → deploy automático.)

## Opción B: si preferís hacerlo desde tu computadora con Node.js instalado

```bash
npm install
npm run build
```

Esto genera una carpeta `dist/`. Esa carpeta la podés:
- arrastrar directamente a **app.netlify.com/drop** (deploy instantáneo, sin
  cuenta obligatoria), o
- subir a cualquier hosting estático (Vercel, GitHub Pages, Cloudflare Pages, etc.)

Para probarla en tu computadora antes de publicar:
```bash
npm run dev
```

---

## Instalar la app en el iPhone (una vez que tengas la URL pública)

1. Abrí la URL en **Safari** (tiene que ser Safari, no Chrome ni otro navegador).
2. Tocá el ícono de compartir (el cuadrado con la flecha hacia arriba).
3. Elegí **"Agregar a pantalla de inicio"**.
4. Confirmá el nombre y tocá **"Agregar"**.

Te va a quedar un ícono como cualquier app, con el anillo de composición como
logo. Se abre a pantalla completa, sin la barra de direcciones de Safari, y
guarda tus datos (comidas, agua, metas) en el propio teléfono aunque cierres
la app o te quedes sin conexión.

## Nota sobre los datos
Todo se guarda con `localStorage`, es decir, en el propio dispositivo. Si
borrás los datos de navegación de Safari para ese sitio, o desinstalás la
app, el historial se pierde. No hay backend ni base de datos: es 100% local.
