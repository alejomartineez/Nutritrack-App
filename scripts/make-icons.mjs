// ---------------------------------------------------------------------------
// ÍCONO DE LA APP — fuente reproducible
//
// El ícono es arte generado, no un archivo dibujado a mano: este script es su
// fuente. Los PNG de public/icons/ salen de acá, así que para cambiar el ícono
// se toca este archivo y se vuelve a correr, nunca se editan los PNG.
//
// El diseño sigue el sistema de la app (ver src/lib/theme.js e index.css): base
// de grafito, un solo acento, y el material de vidrio armado con las mismas
// capas que la barra flotante —luz cenital que cae a la nada, reflejo especular
// arriba a la izquierda, filo brillante en el canto y sombra propia abajo—.
// El motivo es el anillo de calorías, que es el elemento firma de Mi Día.
//
// CÓMO REGENERAR (macOS, sin dependencias):
//
//   cd scripts && node make-icons.mjs
//   for f in src-flat icon-512 icon-512-maskable; do
//     qlmanage -t -s 512 -o . "$f.svg" >/dev/null 2>&1
//   done
//   cp icon-512.svg.png          ../public/icons/icon-512.png
//   cp icon-512-maskable.svg.png ../public/icons/icon-512-maskable.png
//   sips -z 192 192 icon-512.svg.png  --out ../public/icons/icon-192.png
//   sips -z 180 180 src-flat.svg.png  --out ../public/icons/apple-touch-icon.png
//   rm -f *.svg *.svg.png
//
// Dos trampas que cuestan tiempo si no están anotadas:
//
//   - `qlmanage -s N` NO escala el SVG: renderiza al tamaño intrínseco del
//     archivo y lo pega en un lienzo de N×N. Por eso todo se rasteriza a 512 y
//     los tamaños chicos salen de `sips`, que sí remuestrea bien.
//   - Cada variante existe por una razón de plataforma: `maskable` se achica al
//     72% porque Android recorta hasta un círculo del 80%, y `src-flat` va sin
//     esquinas redondeadas porque iOS aplica su propia squircle encima (si el
//     PNG ya viniera redondeado, se verían dos redondeos).
//
// Y por qué después los PNG pesan: el arte es casi todo degradados suaves, que
// es justo lo que PNG no comprime. Es el precio del material de vidrio. Los
// 512 solo se piden al instalar y quedan en la caché del service worker; los
// que se bajan en cada visita son el de 192 y el de Apple, que son chicos.
// ---------------------------------------------------------------------------
import { writeFileSync } from 'node:fs';

const VB = 512; // el arte se dibuja siempre en 512 y el SVG se escala solo

function art({ scale = 1, rounded = true, size = 512 }) {
  const cx = VB / 2, cy = VB / 2;
  const r = 148 * scale;
  const w = 40 * scale;
  const C = 2 * Math.PI * r;
  const filled = 0.72;
  const R = rounded ? 114 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#161B21"/>
      <stop offset="55%" stop-color="#0C1013"/>
      <stop offset="100%" stop-color="#050709"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.015"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="accent" x1="0.12" y1="0" x2="0.88" y2="1">
      <stop offset="0%" stop-color="#8FE0BE"/>
      <stop offset="34%" stop-color="#5FD3A2"/>
      <stop offset="70%" stop-color="#3ABE88"/>
      <stop offset="100%" stop-color="#249A70"/>
    </linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="spec" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.20"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="52%" stop-color="#26A578" stop-opacity="0"/>
      <stop offset="76%" stop-color="#3ABE88" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#26A578" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="shape">
      <rect x="0" y="0" width="${VB}" height="${VB}" rx="${R}" ry="${R}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#shape)">
    <rect width="${VB}" height="${VB}" fill="url(#base)"/>
    <rect width="${VB}" height="${VB}" fill="url(#sheen)"/>
    <ellipse cx="${cx - 60 * scale}" cy="${cy - 90 * scale}" rx="${250 * scale}" ry="${190 * scale}" fill="url(#spec)"/>
    <circle cx="${cx}" cy="${cy}" r="${r + w}" fill="url(#glow)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#20262C" stroke-width="${w}"/>
    <circle cx="${cx}" cy="${cy + 5 * scale}" r="${r}" fill="none" stroke="#000000" stroke-opacity="0.42" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${C * filled} ${C}" transform="rotate(-90 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#accent)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="${C * filled} ${C}" transform="rotate(-90 ${cx} ${cy})"/>
    <circle cx="${cx}" cy="${cy}" r="${r + w / 2 - 3 * scale}" fill="none" stroke="url(#edge)" stroke-width="${5 * scale}" stroke-linecap="round" stroke-dasharray="${C * filled} ${C}" transform="rotate(-90 ${cx} ${cy})"/>
    ${rounded ? `<rect x="0.75" y="0.75" width="${VB - 1.5}" height="${VB - 1.5}" rx="${R}" ry="${R}" fill="none" stroke="url(#edge)" stroke-width="1.5"/>` : ''}
  </g>
</svg>`;
}

const jobs = [
  ['src-flat',          { scale: 1,    rounded: false, size: 512 }],
  ['icon-512',          { scale: 1,    rounded: true,  size: 512 }],
  
  ['icon-512-maskable', { scale: 0.72, rounded: false, size: 512 }],
  
];

for (const [name, opts] of jobs) {
  writeFileSync(`${name}.svg`, art(opts));
  console.log('svg:', name, opts.size);
}
