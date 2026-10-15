import * as THREE from 'three';

/* ══════════════ GLI ORNATI DIPINTI ══════════════
   Oltre alle campiture piene - triglifi blu, fondi rossi - le modanature
   portavano motivi ripetuti: il meandro, la foglia d'acqua (kymation) sulle
   cornici, l'ovolo sotto i capitelli ionici, le palmette delle antefisse e
   degli acroteri. Sono disegnati qui su una tela, una volta sola, e posati
   come strisce sottili davanti alle facce dei blocchi.

   Le tele sono piccole e si ripetono: una striscia lunga venti metri usa la
   stessa immagine di una lunga uno, con le coordinate di texture stirate.
   Per questo la fusione delle mesh posate conserva le uv (engine/pieces.js). */

const C = {
  marmo: '#DCCDA9', blu: '#2C588A', minio: '#A6432D', rosso: '#8E3B2A', scuro: '#2B2520'
};

function canvasTexture(w, h, draw, repeatX = 1) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.x = repeatX;
  t.anisotropy = 4;
  return t;
}

/* il meandro: una chiave per piastrella, la linea di base la lega alla
   successiva. Marmo su fondo minio, fra due filetti scuri. */
function meander(g, w, h) {
  const u = w / 8;
  g.fillStyle = C.minio; g.fillRect(0, 0, w, h);
  g.strokeStyle = C.marmo; g.lineWidth = u * .9; g.lineCap = 'square'; g.lineJoin = 'miter';
  g.beginPath();
  g.moveTo(0, u * 6.5); g.lineTo(w, u * 6.5);
  g.moveTo(u * .5, u * 6.5); g.lineTo(u * .5, u * 1.5); g.lineTo(u * 6.5, u * 1.5);
  g.lineTo(u * 6.5, u * 4.5); g.lineTo(u * 2.5, u * 4.5); g.lineTo(u * 2.5, u * 3); g.lineTo(u * 4.5, u * 3);
  g.stroke();
  g.fillStyle = C.scuro; g.fillRect(0, 0, w, u * .5); g.fillRect(0, h - u * .5, w, u * .5);
}

/* la foglia d'acqua delle cornici doriche: lingue che pendono, alternate
   blu e minio, contornate di scuro, sotto un listello rosso */
function kymation(g, w, h) {
  g.fillStyle = C.marmo; g.fillRect(0, 0, w, h);
  g.fillStyle = C.minio; g.fillRect(0, 0, w, h * .16);
  const leaf = (cx, col) => {
    g.beginPath();
    g.moveTo(cx - w * .21, h * .2);
    g.lineTo(cx - w * .21, h * .62);
    g.quadraticCurveTo(cx - w * .21, h * .95, cx, h * .95);
    g.quadraticCurveTo(cx + w * .21, h * .95, cx + w * .21, h * .62);
    g.lineTo(cx + w * .21, h * .2);
    g.closePath();
    g.fillStyle = col; g.fill();
    g.lineWidth = w * .03; g.strokeStyle = C.scuro; g.stroke();
  };
  leaf(w * .25, C.blu);
  leaf(w * .75, C.minio);
}

/* l'ovolo con le frecce: uova di marmo nel loro guscio rosso, su fondo blu */
function eggAndDart(g, w, h) {
  g.fillStyle = C.blu; g.fillRect(0, 0, w, h);
  g.fillStyle = C.rosso;
  g.beginPath(); g.ellipse(w / 2, h * .52, w * .34, h * .44, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = C.marmo;
  g.beginPath(); g.ellipse(w / 2, h * .54, w * .25, h * .36, 0, 0, Math.PI * 2); g.fill();
  /* la freccia fra due uova: a cavallo del bordo, cosi la piastrella si ripete */
  [0, w].forEach(x => {
    g.beginPath(); g.moveTo(x - w * .07, h * .1); g.lineTo(x + w * .07, h * .1); g.lineTo(x, h * .92); g.closePath();
    g.fill();
  });
}

/* la palmetta: un ventaglio di foglie su due volute. Fondo trasparente,
   ritagliato con alphaTest, per antefisse e acroteri. */
function palmette(g, w, h) {
  g.clearRect(0, 0, w, h);
  const bx = w / 2, by = h * .80, n = 9;
  for (let i = 0; i < n; i++) {
    const a = (-1 + 2 * i / (n - 1)) * 1.25;
    g.save();
    g.translate(bx, by); g.rotate(a);
    g.beginPath(); g.ellipse(0, -h * .40, w * .065, h * .26, 0, 0, Math.PI * 2);
    g.fillStyle = C.marmo; g.fill();
    g.beginPath(); g.ellipse(0, -h * .40, w * .032, h * .19, 0, 0, Math.PI * 2);
    g.fillStyle = i % 2 ? C.minio : C.blu; g.fill();
    g.restore();
  }
  g.lineWidth = w * .07; g.strokeStyle = C.marmo;
  [-1, 1].forEach(s => {
    g.beginPath();
    g.arc(bx + s * w * .16, by + h * .03, w * .12, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.6 : -Math.PI * 1.6, s < 0);
    g.stroke();
  });
  g.fillStyle = C.minio;
  g.beginPath(); g.arc(bx, by, w * .07, 0, Math.PI * 2); g.fill();
}

const ornament = (map, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({
  map, roughness: .86, metalness: 0,
  /* la striscia sta a pochi millimetri dalla faccia: lo spostamento di
     profondita evita che le due si contendano gli stessi pixel */
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
}, opts));

export const ORN = {
  meander:  ornament(canvasTexture(64, 64, meander)),
  kyma:     ornament(canvasTexture(64, 64, kymation)),
  ovoli:    ornament(canvasTexture(64, 64, eggAndDart)),
  /* l'echino del capitello ionico e un cilindro: l'ovolo gli gira attorno */
  echinus:  new THREE.MeshStandardMaterial({ map: canvasTexture(64, 64, eggAndDart, 12), roughness: .84, metalness: 0 }),
  palmette: ornament(canvasTexture(128, 128, palmette), { alphaTest: .5, side: THREE.DoubleSide })
};

/* Una striscia dipinta lunga `len` e alta `h`, con il motivo ripetuto ogni
   `period` metri. Il piano guarda +z: chi la usa la gira verso l'esterno. */
const stripCache = new Map();
export function strip(len, h, mat, period) {
  const key = `${len.toFixed(3)}|${h.toFixed(3)}|${period}`;
  if (!stripCache.has(key)) {
    const geo = new THREE.PlaneGeometry(len, h);
    const uv = geo.attributes.uv, k = len / period;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * k);
    stripCache.set(key, geo);
  }
  const m = new THREE.Mesh(stripCache.get(key), mat);
  m.receiveShadow = true;
  return m;
}

/* Una striscia appoggiata alla faccia esterna di un blocco lungo un asse.
   `ax` e l'asse lungo del blocco ('x' o 'z'), `sign` il verso della faccia
   esterna sull'altro asse, `half` la meta dello spessore del blocco. */
export function faceStrip(parent, ax, sign, half, len, h, y, mat, period) {
  const s = strip(len, h, mat, period);
  const off = half + .006;
  if (ax === 'x') { s.position.set(0, y, sign * off); s.rotation.y = sign > 0 ? 0 : Math.PI; }
  else { s.position.set(sign * off, y, 0); s.rotation.y = sign * Math.PI / 2; }
  parent.add(s);
  return s;
}
