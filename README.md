# NutriTrack

PWA personal para registrar comidas, entrenamientos y sueño. Pensada para
iPhone (instalada en la pantalla de inicio), funciona offline y guarda todo en
el teléfono (localStorage). Sin backend.

## Qué hace

**Hoy**
- Anillo de calorías restantes y barras de proteína, carbos y grasa contra la meta.
- Comidas agrupadas por momento (desayuno, almuerzo, merienda, cena, colaciones),
  con "Repetir lo de ayer" de un toque.
- Agua por vasos (tamaño configurable). Deslizá una comida para borrarla (con deshacer).
- Tira semanal para moverte entre días; racha de días registrando.

**Agregar** (botón "+" siempre a mano)
- Un solo buscador: Mis comidas, lo que ya registraste, ~200 alimentos locales y
  productos envasados de Open Food Facts.
- Frecuentes según el momento del día: el "+" agrega la misma cantidad que la última vez.
- Calorías rápidas, crear alimento, escáner de código de barras, equivalencias.
- Cada comida se puede marcar como **fuera de plan** (gusto).

**Progreso**
- Calorías y macros de 7 días, 30 días o 3 meses.
- Peso con tendencia suavizada (filtra el ruido de agua del día a día).
- **Gasto real estimado**: con tu ingesta y tu peso de las últimas 4 semanas calcula
  cuánto gastás de verdad y sugiere la meta para tu objetivo.

**Entreno** y **Sueño**: módulos opcionales (se apagan en Ajustes).

**Mi plan**: PDFs de la nutricionista, notas y equivalencias.

**Ajustes**: metas, recalcular con Mifflin-St Jeor, tema claro/oscuro/automático,
copia de seguridad (en iPhone se comparte a Archivos o WhatsApp).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
npm run build
```

Deploy: cada push a `main` lo publica Vercel.

## Estructura

```
src/
  App.jsx            shell: pestañas, botón +, hojas
  ui/                componentes compartidos (Sheet, Button, Segmented, Ring, toast...)
  lib/               fechas, storage, ajustes, tema, hápticos, viewport
  nutrition/         Hoy, Agregar, Progreso, Ajustes; store.js y model.js
  workout/           módulo de entrenamiento
  sleep/             módulo de sueño
```

Colores: variables CSS en `src/index.css` (la rampa `ink` se invierte en modo
claro, así que siempre se usa por rol: 900 fondo, 800 card, 500 texto secundario).

## Datos

Todo vive en `localStorage` del dispositivo (los PDFs en IndexedDB). Claves:
`nutri_*` (comidas, metas, catálogos, ajustes), `weight_logs`, `workout_*`,
`sleep_*`. La copia de seguridad exporta todas esas claves en un JSON.
