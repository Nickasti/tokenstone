#!/usr/bin/env node
/**
 * Disegna le icone dell'app: la fronte di un tempio, nei colori della scena.
 *
 *   node tools/make-icons.js
 *
 * Scrive assets/icons/: un SVG per il favicon e i PNG che servono per
 * installare la pagina come app (192 e 512, piu una versione "maskable" che
 * i sistemi possono ritagliare a cerchio o a goccia senza tagliare il tempio).
 *
 * Niente librerie: le forme sono poche, e un rasterizzatore con
 * sovracampionamento e un codificatore PNG stanno in queste righe.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(__dirname, '..', 'assets', 'icons');

const NOTTE = [0x0b, 0x14, 0x1d];
const MARMO = [0xe9, 0xdd, 0xc3];
const MINIO = [0xbe, 0x5b, 0x40];

/** Il tempio, in un riquadro di 100 x 100: frontone, fregio, colonne, gradini. */
function temple() {
  const cols = [22, 38.33, 54.67, 71].map((x) => ({ rect: [x, 46, 7, 26], color: MARMO }));
  return [
    { poly: [[20, 38], [80, 38], [50, 22]], color: MARMO },
    { rect: [20, 38, 60, 4], color: MINIO },
    { rect: [20, 42, 60, 4], color: MARMO },
    ...cols,
    { rect: [18, 72, 64, 3], color: MARMO },
    { rect: [15, 75, 70, 3], color: MARMO },
    { rect: [12, 78, 76, 3], color: MARMO },
  ];
}

/** Lo stesso tempio, rimpicciolito attorno al centro: per l'icona maskable. */
function scaled(shapes, k) {
  const t = (v) => 50 + (v - 50) * k;
  return shapes.map((s) => s.poly
    ? { poly: s.poly.map(([x, y]) => [t(x), t(y)]), color: s.color }
    : { rect: [t(s.rect[0]), t(s.rect[1]), s.rect[2] * k, s.rect[3] * k], color: s.color });
}

function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inRoundRect(x, y, r) {
  const cx = Math.min(Math.max(x, r), 100 - r);
  const cy = Math.min(Math.max(y, r), 100 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

/** Colore di un punto: l'ultima forma che lo contiene, sopra lo sfondo. */
function colorAt(x, y, shapes, radius) {
  if (radius !== null && !inRoundRect(x, y, radius)) return null;
  let c = NOTTE;
  for (const s of shapes) {
    const hit = s.poly
      ? inPoly(x, y, s.poly)
      : x >= s.rect[0] && x < s.rect[0] + s.rect[2] && y >= s.rect[1] && y < s.rect[1] + s.rect[3];
    if (hit) c = s.color;
  }
  return c;
}

/** RGBA, con 4 x 4 campioni per pixel perche i bordi obliqui non seghettino. */
function rasterize(size, shapes, radius) {
  const N = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const c = colorAt(((pxi + (sx + 0.5) / N) / size) * 100, ((py + (sy + 0.5) / N) / size) * 100, shapes, radius);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a++;
        }
      }
      const o = (py * size + pxi) * 4;
      if (a) { px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; }
      px[o + 3] = Math.round((a / (N * N)) * 255);
    }
  }
  return px;
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // 8 bit per canale
  ihdr[9] = 6;  // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
function svg(shapes, radius) {
  const parts = shapes.map((s) => s.poly
    ? `<polygon points="${s.poly.map((p) => p.join(',')).join(' ')}" fill="${hex(s.color)}"/>`
    : `<rect x="${s.rect[0]}" y="${s.rect[1]}" width="${s.rect[2]}" height="${s.rect[3]}" fill="${hex(s.color)}"/>`);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    `<rect width="100" height="100" rx="${radius}" fill="${hex(NOTTE)}"/>` + parts.join('') + '</svg>\n';
}

fs.mkdirSync(OUT, { recursive: true });
const base = temple();
// la zona sicura di un'icona maskable e il cerchio centrale dell'80%: il
// tempio rimpicciolito al 70% ci sta dentro con margine, lo sfondo va al bordo
const files = {
  'icon.svg': svg(base, 18),
  'icon-192.png': png(192, rasterize(192, base, 18)),
  'icon-512.png': png(512, rasterize(512, base, 18)),
  'icon-maskable-512.png': png(512, rasterize(512, scaled(base, 0.7), null)),
  'apple-touch-icon.png': png(180, rasterize(180, scaled(base, 0.85), null)),
};
for (const [name, data] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), data);
  process.stdout.write('  ' + name + '  ' + data.length + ' B\n');
}
