/* Il modello di un mondo: una torre di pietra, da una miniatura fantasy. Un
   basamento quadrato col portale ad arco, un corpo rotondo con due balconate,
   una torretta snella con la finestra a losanghe, e in cima una lanterna e un
   tetto conico di scandole con la sua guglia.

   E il punto da cui partire per scrivere un mondo vero, e la guida passo per
   passo e docs/creare-un-mondo.md. Un mondo e due cose.
   1. world.json: nome, luogo, epoca, durata, sole. Lo leggono il motore, il
      registro e la pagina iniziale.
   2. Questo file: costruisce i pezzi e passa al motore quello che rende il
      mondo se stesso. Cielo, luce, camera, credito, posa, pannello: e tutto
      del motore, in engine/.

   Per guardarla costruirsi in fretta: /worlds/_template/?demo=10 */

import * as THREE from 'three';
import { startWorld } from '/engine/scene.js';
import { addPiece, mark } from '/engine/pieces.js';

const meta = await (await fetch(new URL('../world.json', import.meta.url))).json();

/* ─────────── materiali ───────────
   Ogni mondo ha i suoi. Qui la pietra grigia della miniatura, in tre toni
   perche i corsi vicini non sembrino un muro solo. Il verderame del blocco
   in volo e del motore. */
const M = {
  pietra: new THREE.MeshStandardMaterial({ color: 0x9D9C98, roughness: .93 }),
  pietra2: new THREE.MeshStandardMaterial({ color: 0x8F8E8A, roughness: .95 }),
  pietra3: new THREE.MeshStandardMaterial({ color: 0xA9A8A3, roughness: .9 }),
  ardesia: new THREE.MeshStandardMaterial({ color: 0x7C7D7E, roughness: .82, flatShading: true }),
  scuro: new THREE.MeshStandardMaterial({ color: 0x2C2F33, roughness: .7 }),
  legno: new THREE.MeshStandardMaterial({ color: 0x5E5850, roughness: .9 }),
  terra: new THREE.MeshStandardMaterial({ color: 0x78725F, roughness: 1 }),
};
const TONI = [M.pietra, M.pietra2, M.pietra3];

/* ─────────── pesi ───────────
   Non sono prezzi: dicono quanto vale un pezzo rispetto agli altri. Il motore
   ripartisce sui pesi il budget del mondo - la quota settimanale per le
   settimane di world.json - e da li viene il costo in TE di ogni pezzo. */
const COST = {
  slab: 3, block: 2, voussoir: 1, door: 6, cornice: 3,
  floor: 12, post: 1, rail: 6, lattice: 20, band: 8, shingles: 10, spire: 25,
};

/* ─────────── fasi ───────────
   L'ordine del cantiere, per il pannello. k e la chiave usata da addPiece,
   b l'edificio, y l'anno o il periodo, n il nome, t il testo che si legge
   mentre la fase e in corso. */
const PHASES = [
  { k: 'plinto', b: 'Basamento', y: 'I', n: 'Il plinto', t: 'Prima il piano di posa: lastre larghe, su cui poggia tutto il resto.' },
  { k: 'basamento', b: 'Basamento', y: 'II', n: 'Mura e portale', t: 'Il basamento quadrato, corso dopo corso. Il portale si chiude con un arco di conci, come le finestre.' },
  { k: 'torre', b: 'Torre', y: 'III', n: 'Il corpo rotondo', t: 'Sopra il quadrato, il cilindro: conci curvi, ogni corso sfalsato rispetto a quello sotto.' },
  { k: 'balconate', b: 'Torre', y: 'IV', n: 'Le balconate', t: 'Due balconate a mezzaluna, una sopra l\'altra, davanti alle aperture ad arco.' },
  { k: 'torretta', b: 'Torretta', y: 'V', n: 'La torretta', t: 'La torretta snella sale dietro il corpo rotondo, con un anello piu largo a meta e la finestra a losanghe.' },
  { k: 'cuspide', b: 'Torretta', y: 'VI', n: 'Lanterna e cuspide', t: 'In cima la lanterna aperta, il tetto conico a filari di scandole, e la guglia.' },
];

/* ─────────── geometria di servizio ───────────
   Gli angoli girano attorno all'asse verticale: un concio all'angolo a sta
   nella direzione (cos a, -sin a) sul piano x-z. E la convenzione di
   rotation.y in three.js, cosi un oggetto ruotato di a guarda verso a. */
const TAU = Math.PI * 2;
const polar = (r, a) => [r * Math.cos(a), -r * Math.sin(a)];

function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// un concio curvo: un settore di corona circolare, alto h, che parte
// dall'angolo 0 e copre da radianti; poi lo si ruota al suo posto
const curveCache = new Map();
function curvedGeometry(rIn, rOut, da, h) {
  const key = [rIn, rOut, da.toFixed(4), h].join('/');
  if (!curveCache.has(key)) {
    const s = new THREE.Shape();
    s.absarc(0, 0, rOut - .03, .012, da - .012, false);
    s.absarc(0, 0, rIn, da - .012, .012, true);
    const g = new THREE.ExtrudeGeometry(s, { depth: h - .04, bevelEnabled: false, curveSegments: 5 });
    g.rotateX(-Math.PI / 2);
    curveCache.set(key, g);
  }
  return curveCache.get(key);
}

/** Distanza angolare, fra 0 e pi greco. */
function gap(a, b) {
  const d = Math.abs(((a - b) % TAU + TAU) % TAU);
  return Math.min(d, TAU - d);
}

/**
 * Un corso di un muro rotondo: n conci attorno a (cx, cz), alla quota y,
 * sfalsati di mezzo concio a corsi alterni. openAt(angolo) dice se in quel
 * punto c'e un'apertura, e il concio non si posa.
 */
function roundCourse({ cx, cz, y, rIn, rOut, n, h, course, phase, tag, openAt }) {
  const da = TAU / n;
  const offset = course % 2 ? da / 2 : 0;
  for (let i = 0; i < n; i++) {
    const a = offset + i * da;
    if (openAt && openAt(a + da / 2)) continue;
    const b = mesh(curvedGeometry(rIn, rOut, da, h), TONI[(i + course) % 3]);
    b.position.set(cx, y, cz);
    b.rotation.y = a;
    addPiece(phase, b, COST.block, mark(tag), 'concio del corso ' + (course + 1), 4);
  }
}

/**
 * Un arco di conci, in un piano verticale. Il gruppo che lo regge sta in
 * (x, z), girato verso l'angolo dir: l'arco si apre di traverso a quella
 * direzione, con l'imposta alla quota y e raggio r.
 */
function arch({ x, z, y, r, dir, depth, phase, tag, count = 7 }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = dir;
  scene.add(g);
  const len = Math.PI * r / count;
  for (let k = 0; k < count; k++) {
    const b = (k + .5) / count * Math.PI;
    const v = mesh(new THREE.BoxGeometry(depth, .32, len * .94), TONI[k % 3]);
    // nel gruppo: x e la direzione dir, z va di traverso, y in alto
    v.position.set(0, y + r * Math.sin(b), r * Math.cos(b));
    v.rotation.x = b - Math.PI / 2;
    addPiece(phase, v, COST.voussoir, mark(tag), 'concio dell\'arco', 3, g);
  }
}

let scene = null;

/* ─────────── le misure ─────────── */
const CAM_DIR = -0.87;               // l'angolo da cui guarda la camera
const BASE = { half: 3.2, wall: .8, y0: .6, course: .75, courses: 6 };
const TOP_BASE = BASE.y0 + BASE.course * BASE.courses + .3;   // sopra la cornice
const BODY = { r: 2.8, wall: .7, n: 14, courses: 9 };
const TOP_BODY = TOP_BASE + BODY.courses * BASE.course;
const BALCONY_DIR = CAM_DIR - .8;     // le balconate a sinistra, come nella miniatura
const SPIRE_DIR = CAM_DIR + 1.75;     // la torretta a destra, un po' dietro
const [SX, SZ] = polar(2.3, SPIRE_DIR);
const SLIM = { r: 1.45, wall: .5, n: 10, courses: 19 };
const TOP_SLIM = TOP_BASE + SLIM.courses * BASE.course;

/* ─────────── costruzione ───────────
   L'ordine delle chiamate ad addPiece e l'ordine di posa: il cantiere e "i
   primi N pezzi dell'elenco", e il registro ricorda N. Una volta pubblicato
   un mondo, l'ordine non si cambia piu: N indicherebbe altri pezzi.

   addPiece(fase, oggetto, peso, marca, descrizione, caduta, contenitore)
   - oggetto: un Object3D nella sua posizione finale
   - marca: l'identificativo del pezzo; mark('PREFISSO') lo numera da se
   - caduta: da quanti metri scende il blocco quando si posa
   - contenitore: se il pezzo sta dentro un gruppo, come i conci di un arco */

function plinth() {
  // 4 x 4 lastre di 1,75 metri: 7 metri di lato, mezzo metro di spessore
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const s = mesh(new THREE.BoxGeometry(1.72, BASE.y0, 1.72), TONI[(i + j) % 3]);
      s.position.set(-2.625 + i * 1.75, BASE.y0 / 2, -2.625 + j * 1.75);
      addPiece('plinto', s, COST.slab, mark('PLINTO'), 'lastra del plinto', 3);
    }
  }
}

function base() {
  const { half, wall, y0, course, courses } = BASE;
  // Quattro lati. I lunghi (x) vanno da spigolo a spigolo, i corti (z) stanno
  // fra i due lunghi: cinque blocchi sui primi, tre sui secondi. Il blocco di
  // mezzo di ogni lato e quello che lascia il posto a una porta o a una finestra.
  const sides = [
    { k: 'S', ax: 'x', at: half - wall / 2, len: half * 2, n: 5, dir: -Math.PI / 2 },
    { k: 'N', ax: 'x', at: -half + wall / 2, len: half * 2, n: 5, dir: Math.PI / 2 },
    { k: 'E', ax: 'z', at: half - wall / 2, len: half * 2 - wall * 2, n: 3, dir: 0 },
    { k: 'W', ax: 'z', at: -half + wall / 2, len: half * 2 - wall * 2, n: 3, dir: Math.PI },
  ];
  // il portale sul lato che guarda la camera, una finestra sugli altri tre
  const [fx, fz] = polar(1, CAM_DIR);
  const front = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 'E' : 'W') : (fz > 0 ? 'S' : 'N');
  const DOOR = { from: 0, to: 4 }, WINDOW = { from: 2, to: 3 };
  const vano = (side) => side.k === front ? DOOR : WINDOW;
  const centro = (side) => side.ax === 'x' ? [0, side.at] : [side.at, 0];

  for (let c = 0; c < courses; c++) {
    const y = y0 + c * course;
    for (const side of sides) {
      const L = side.len / side.n;
      const v = vano(side);
      for (let i = 0; i < side.n; i++) {
        if (i === (side.n - 1) / 2 && c >= v.from && c <= v.to) continue;
        const g = side.ax === 'x'
          ? new THREE.BoxGeometry(L - .04, course - .04, wall)
          : new THREE.BoxGeometry(wall, course - .04, L - .04);
        const blk = mesh(g, TONI[(i + c) % 3]);
        const t = -side.len / 2 + L * (i + .5);
        if (side.ax === 'x') blk.position.set(t, y + course / 2, side.at);
        else blk.position.set(side.at, y + course / 2, t);
        addPiece('basamento', blk, COST.block, mark('MURO'), 'blocco del basamento, corso ' + (c + 1), 4);
      }
      // finito l'ultimo corso del vano, l'arco lo chiude dall'alto: il suo
      // diametro e la larghezza del vano, e sta tutto dentro
      if (c === v.to) {
        const [px, pz] = centro(side);
        const r = L / 2 - .03;
        const top = y0 + (v.to + 1) * course;
        arch({ x: px, z: pz, y: top - r, r, dir: side.dir, depth: wall, phase: 'basamento',
          tag: side.k === front ? 'ARCO PORTALE' : 'ARCO FINESTRA', count: side.k === front ? 9 : 6 });
        if (side.k === front) {
          // il portone, un po' arretrato nel vano
          const [nx, nz] = polar(1, side.dir);
          const door = mesh(side.ax === 'x'
            ? new THREE.BoxGeometry(L - .1, top - r - y0, .12)
            : new THREE.BoxGeometry(.12, top - r - y0, L - .1), M.legno);
          door.position.set(px - nx * .2, y0 + (top - r - y0) / 2, pz - nz * .2);
          addPiece('basamento', door, COST.door, 'PORTA', 'il portone', 3);
        }
      }
    }
  }
  // la cornice: quattro lastre sui bordi e una al centro, su cui poggia il cilindro
  const ty = y0 + courses * course + .15;
  const cornice = [
    [0, half - .9, half * 2 + .3, 1.8], [0, -half + .9, half * 2 + .3, 1.8],
    [half - .9, 0, 1.8, half * 2 - 3.3], [-half + .9, 0, 1.8, half * 2 - 3.3],
    [0, 0, half * 2 - 3.6, half * 2 - 3.6],
  ];
  cornice.forEach(([x, z, w, d], k) => {
    const sl = mesh(new THREE.BoxGeometry(w - .04, .3, d - .04), TONI[k % 3]);
    sl.position.set(x, ty, z);
    addPiece('basamento', sl, COST.cornice, mark('CORNICE'), 'lastra della cornice', 3);
  });
}

function body() {
  const { r, wall, n, courses } = BODY;
  // le due aperture ad arco verso le balconate
  const openings = [
    { from: 3, to: 5, spring: TOP_BASE + 3 * BASE.course + 1.65, r: .55 },
    { from: 7, to: 8, spring: TOP_BASE + 7 * BASE.course + .95, r: .5 },
  ];
  for (let c = 0; c < courses; c++) {
    const open = openings.find((o) => c >= o.from && c <= o.to);
    roundCourse({
      cx: 0, cz: 0, y: TOP_BASE + c * BASE.course, rIn: r - wall, rOut: r, n, h: BASE.course,
      course: c, phase: 'torre', tag: 'TORRE',
      openAt: open ? (a) => gap(a, BALCONY_DIR) < Math.PI / n : null,
    });
    for (const o of openings.filter((o) => o.to === c)) {
      const [x, z] = polar(r - wall / 2, BALCONY_DIR);
      arch({ x, z, y: o.spring, r: o.r, dir: BALCONY_DIR, depth: wall, phase: 'torre', tag: 'ARCO TORRE', count: 6 });
    }
  }
  // il coronamento del corpo rotondo
  const band = mesh(new THREE.CylinderGeometry(BODY.r + .15, BODY.r + .15, .35, 28), M.pietra2);
  band.position.set(0, TOP_BODY + .175, 0);
  addPiece('torre', band, COST.band, 'CORONA TORRE', 'la cornice in cima al corpo rotondo', 3);
}

/** Una balconata a mezzaluna, alla quota y, davanti all'apertura. */
function balcony(y, size, n) {
  const g = new THREE.Group();
  const [x, z] = polar(BODY.r - .3, BALCONY_DIR);
  g.position.set(x, 0, z);
  g.rotation.y = BALCONY_DIR;
  scene.add(g);
  const floor = mesh(new THREE.CylinderGeometry(size, size, .28, 24, 1, false, 0, Math.PI), M.pietra3);
  floor.position.y = y - .14;
  addPiece('balconate', floor, COST.floor, mark('BALCONATA'), 'il piano della balconata', 4, g);
  // le mensole sotto il piano
  for (const t of [-.5, .5]) {
    const m = mesh(new THREE.BoxGeometry(size * .8, .45, .3), M.pietra2);
    m.position.set(size * .4, y - .5, t * size * .9);
    addPiece('balconate', m, COST.post, mark('MENSOLA'), 'mensola della balconata', 3, g);
  }
  // le colonnine sul bordo, e il corrimano
  for (let k = 1; k < n; k++) {
    const t = k / n * Math.PI;
    const p = mesh(new THREE.CylinderGeometry(.07, .09, .9, 6), M.pietra);
    p.position.set((size - .12) * Math.sin(t), y + .45, (size - .12) * Math.cos(t));
    addPiece('balconate', p, COST.post, mark('COLONNINA'), 'colonnina della balaustra', 2, g);
  }
  const rail = new THREE.TorusGeometry(size - .12, .08, 6, 28, Math.PI);
  rail.rotateX(Math.PI / 2);
  rail.rotateY(Math.PI / 2);
  const rm = mesh(rail, M.pietra3);
  rm.position.y = y + .92;
  addPiece('balconate', rm, COST.rail, mark('CORRIMANO'), 'il corrimano della balconata', 2, g);
}

function spireTower() {
  const { r, wall, n, courses } = SLIM;
  // la finestra a losanghe guarda la camera, a meta altezza
  const winFrom = 12, winTo = 13;
  // l'anello piu largo, che nella miniatura gonfia la torretta a meta
  const bulgeFrom = 8, bulgeTo = 9;
  for (let c = 0; c < courses; c++) {
    const bulge = c >= bulgeFrom && c <= bulgeTo;
    roundCourse({
      cx: SX, cz: SZ, y: TOP_BASE + c * BASE.course, rIn: r - wall, rOut: bulge ? r + .3 : r, n, h: BASE.course,
      course: c, phase: 'torretta', tag: 'TORRETTA',
      openAt: c >= winFrom && c <= winTo ? (a) => gap(a, CAM_DIR) < Math.PI / n : null,
    });
    if (c === winTo) {
      // dietro il vano, la finestra: una cornice scura con l'inferriata a losanghe
      const g = new THREE.Group();
      const [wx, wz] = polar(r - wall * .6, CAM_DIR);
      g.position.set(SX + wx, TOP_BASE + winFrom * BASE.course + .55, SZ + wz);
      g.rotation.y = CAM_DIR;
      const pane = mesh(new THREE.BoxGeometry(.06, 1.05, .8), M.scuro);
      g.add(pane);
      for (const s of [-1, 1]) {
        for (let k = -1; k <= 1; k++) {
          const bar = mesh(new THREE.BoxGeometry(.05, 1.15, .04), M.pietra);
          bar.position.set(.05, 0, k * .26);
          bar.rotation.x = s * Math.PI / 4.6;
          g.add(bar);
        }
      }
      // l'inferriata e un pezzo solo: la si posa intera
      addPiece('torretta', g, COST.lattice, 'FINESTRA', 'la finestra a losanghe', 3);
      const [ax, az] = polar(r - wall / 2, CAM_DIR);
      arch({ x: SX + ax, z: SZ + az, y: TOP_BASE + (winTo + 1) * BASE.course - .44, r: .42, dir: CAM_DIR, depth: wall, phase: 'torretta', tag: 'ARCO FINESTRA', count: 5 });
    }
  }
}

function crown() {
  const y0 = TOP_SLIM;
  const cornice = mesh(new THREE.CylinderGeometry(SLIM.r + .25, SLIM.r + .1, .32, 20), M.pietra2);
  cornice.position.set(SX, y0 + .16, SZ);
  addPiece('cuspide', cornice, COST.band, 'CORNICE LANTERNA', 'la cornice sotto la lanterna', 3);
  // la lanterna: sei colonnine aperte, e l'architrave ad anello sopra
  const ly = y0 + .32;
  for (let k = 0; k < 6; k++) {
    const [px, pz] = polar(SLIM.r - .05, k / 6 * TAU + .3);
    const p = mesh(new THREE.BoxGeometry(.3, 1.5, .3), TONI[k % 3]);
    p.position.set(SX + px, ly + .75, SZ + pz);
    addPiece('cuspide', p, COST.post * 3, mark('LANTERNA'), 'colonnina della lanterna', 3);
  }
  const lintel = mesh(new THREE.CylinderGeometry(SLIM.r + .2, SLIM.r + .2, .3, 20, 1, true), M.pietra3);
  lintel.position.set(SX, ly + 1.65, SZ);
  addPiece('cuspide', lintel, COST.band, 'ARCHITRAVE', 'l\'architrave della lanterna', 3);
  // il tetto: otto filari di scandole, ognuno un po' sporgente sul successivo
  const roof0 = ly + 1.8, roofH = 4.6, rows = 8, rBase = SLIM.r + .55;
  for (let k = 0; k < rows; k++) {
    const t0 = k / rows, t1 = (k + 1) / rows;
    const rb = rBase * (1 - t0) + .08, rt = rBase * (1 - t1);
    const row = mesh(new THREE.CylinderGeometry(rt, rb, roofH / rows + .06, 18), M.ardesia);
    row.position.set(SX, roof0 + (t0 + t1) / 2 * roofH, SZ);
    row.rotation.y = k * .17;
    addPiece('cuspide', row, COST.shingles, mark('SCANDOLE'), 'filare di scandole d\'ardesia', 4);
  }
  const spire = mesh(new THREE.ConeGeometry(.12, 2.4, 8), M.pietra);
  spire.position.set(SX, roof0 + roofH + 1.2, SZ);
  addPiece('cuspide', spire, COST.spire, 'GUGLIA', 'la guglia', 6);
}

function build(s) {
  scene = s;
  // Il terreno non e un pezzo e non si paga: c'era prima.
  const ground = mesh(new THREE.CircleGeometry(70, 48), M.terra);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  plinth();
  base();
  body();
  balcony(TOP_BASE + 3 * BASE.course, 1.7, 9);
  balcony(TOP_BASE + 7 * BASE.course, 1.35, 7);
  spireTower();
  crown();
}

/* ─────────── il mondo, al motore ─────────── */
await startWorld({
  meta,
  build,
  phases: PHASES,
  completion: { mark: 'FINE', text: 'La torre di prova è compiuta.' },
  // l'inquadratura: angolo orizzontale, angolo dal verticale, distanza, punto guardato
  view: { az: .7, pol: 1.2, dist: 52, target: [0, 11, 0] },
  // dove guarda il sole, e quanto copre la sua ombra (in metri attorno al centro)
  sun: { center: [0, 0, 0], shadow: { left: -24, right: 24, top: 24, bottom: -24, near: 60, far: 640 } },
  fog: 0x9AA8AE,
  hour: 9.5,
  // l'immagine della scheda nella pagina iniziale: npm run previews
  snapshot: { hour: 16, view: { az: .7, pol: 1.22, dist: 46, target: [0, 12, 0] } },
  // "vola al cantiere": dove va la camera per la fase in corso
  focus(phase) {
    if (phase === 'plinto' || phase === 'basamento') return { x: 0, z: 0, dist: 28 };
    if (phase === 'cuspide' || phase === 'torretta') return { x: SX, z: SZ, dist: 44 };
    return { x: 0, z: 0, dist: 38 };
  },
});
