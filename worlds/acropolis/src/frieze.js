import * as THREE from 'three';
import { M } from './materials.js';
import { COST, PARTHENON as P, POLYCHROMY as PC } from './config.js';
import { mk, box } from './kit.js';
import { faceStrip } from './ornaments.js';
import { addPiece, mark } from '/engine/pieces.js';

/* ══════════════ IL FREGIO DELLE PANATENEE ══════════════
   Centosessanta metri di processione in cima ai muri della cella, dentro
   il colonnato: la festa che ogni quattro anni portava ad Atena il peplo
   nuovo. Parte dall'angolo sud-ovest e corre lungo i due fianchi verso
   est: a ovest i cavalieri si preparano, sui fianchi la cavalcata, i carri,
   gli anziani e i musici, in testa le vittime; sulla fronte est le
   fanciulle arrivano dai due lati davanti agli dei seduti, e al centro un
   bambino consegna il peplo piegato.

   Le figure erano in marmo su fondo blu, con dettagli in bronzo e colore.
   Qui sono disegnate su tele, una per scena, e ripetute: ogni lastra prende
   la scena del suo tratto. I pezzi sono nuovi rispetto al primo elenco, e
   per questo stanno in fondo: il registro conta "i primi N pezzi", e
   l'ordine di quelli gia posati non si tocca. */

const C = { fondo: '#2C588A', marmo: '#E2D5B5', ombra: '#B4A47F', bronzo: '#6E7F55', scuro: '#1E2B3A' };
const W = 512, H = 128, BASE = H - 12;

/* Le quote, dallo stilobate. Il fregio vero stava a filo dell'architrave
   esterno, e da terra se ne vedeva appena una striscia: qui e abbassato di
   75 cm, con le colonne dei portici, perche la camera non entra sotto il
   colonnato e un fregio invisibile non racconterebbe niente. */
export const PORCH_COL_H = 7.3;
const ARCH_H = 1.2, FRIEZE_Y = PORCH_COL_H + ARCH_H;   // base del fregio

/* ---------- le figure, disegnate di profilo, in cammino verso destra ---------- */

function person(g, x, s = 1, opts = {}) {
  const y = BASE, h = 82 * s;
  g.fillStyle = opts.back ? C.ombra : C.marmo;
  /* il chitone: un trapezio, piu largo in basso */
  g.beginPath();
  g.moveTo(x - 9 * s, y - h * .2); g.lineTo(x + 9 * s, y - h * .2);
  g.lineTo(x + 6 * s, y - h * .78); g.lineTo(x - 6 * s, y - h * .78); g.closePath(); g.fill();
  /* le gambe in passo, se non e seduto */
  if (!opts.seated) {
    g.fillRect(x - 6 * s, y - h * .22, 4 * s, h * .22);
    g.save(); g.translate(x + 4 * s, y - h * .22); g.rotate(-.35); g.fillRect(0, 0, 4 * s, h * .23); g.restore();
  }
  g.beginPath(); g.arc(x + 1 * s, y - h * .87, 7 * s, 0, Math.PI * 2); g.fill();
  /* il braccio avanti, con quello che porta */
  g.save(); g.translate(x + 4 * s, y - h * .7); g.rotate(opts.armUp ? -1.1 : -.35);
  g.fillRect(0, -2 * s, 18 * s, 4 * s); g.restore();
  if (opts.carry === 'hydria') {
    g.beginPath(); g.ellipse(x + 2 * s, y - h * 1.02, 8 * s, 9 * s, 0, 0, Math.PI * 2); g.fill();
  } else if (opts.carry === 'branch') {
    g.strokeStyle = C.bronzo; g.lineWidth = 2 * s;
    g.beginPath(); g.moveTo(x + 18 * s, y - h * .8); g.lineTo(x + 26 * s, y - h * 1.05); g.stroke();
  } else if (opts.carry === 'lyre') {
    g.strokeStyle = C.marmo; g.lineWidth = 2.5 * s;
    g.beginPath(); g.arc(x + 20 * s, y - h * .7, 8 * s, Math.PI, 0); g.stroke();
  }
}

function seated(g, x, s, facing = 1) {
  const y = BASE;
  g.save(); g.translate(x, 0); g.scale(facing, 1);
  g.fillStyle = C.ombra; g.fillRect(-12 * s, y - 34 * s, 22 * s, 34 * s);   // lo sgabello
  g.fillStyle = C.marmo;
  g.fillRect(-10 * s, y - 40 * s, 26 * s, 9 * s);                            // le cosce
  g.fillRect(12 * s, y - 40 * s, 6 * s, 40 * s);                             // le gambe
  g.beginPath(); g.moveTo(-10 * s, y - 38 * s); g.lineTo(4 * s, y - 38 * s); g.lineTo(2 * s, y - 78 * s); g.lineTo(-8 * s, y - 78 * s); g.closePath(); g.fill();
  g.beginPath(); g.arc(-2 * s, y - 86 * s, 8 * s, 0, Math.PI * 2); g.fill();
  g.fillRect(-2 * s, y - 70 * s, 20 * s, 4 * s);
  g.restore();
}

function horse(g, x, s = 1, opts = {}) {
  const y = BASE;
  g.fillStyle = opts.back ? C.ombra : C.marmo;
  g.beginPath(); g.ellipse(x, y - 42 * s, 30 * s, 13 * s, 0, 0, Math.PI * 2); g.fill();
  /* collo e testa, alzati: i cavalli del fregio sono sempre in tensione */
  g.save(); g.translate(x + 22 * s, y - 48 * s); g.rotate(-.9);
  g.fillRect(0, -6 * s, 30 * s, 12 * s); g.restore();
  g.save(); g.translate(x + 38 * s, y - 72 * s); g.rotate(.5);
  g.fillRect(0, -5 * s, 18 * s, 10 * s); g.restore();
  /* le zampe al galoppo */
  const leg = (lx, a) => { g.save(); g.translate(lx, y - 34 * s); g.rotate(a); g.fillRect(-2.5 * s, 0, 5 * s, 34 * s); g.restore(); };
  leg(x + 20 * s, opts.rear ? -1.1 : -.6); leg(x + 14 * s, opts.rear ? -.8 : .3);
  leg(x - 20 * s, .5); leg(x - 14 * s, -.3);
  g.save(); g.translate(x - 28 * s, y - 46 * s); g.rotate(.9); g.fillRect(0, -3 * s, 22 * s, 6 * s); g.restore();
  if (opts.rider) {
    g.fillStyle = C.marmo;
    g.fillRect(x - 6 * s, y - 80 * s, 10 * s, 28 * s);
    g.beginPath(); g.arc(x, y - 86 * s, 7 * s, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(x + 3 * s, y - 70 * s); g.rotate(.3); g.fillRect(0, -2 * s, 22 * s, 4 * s); g.restore();
    g.save(); g.translate(x - 2 * s, y - 54 * s); g.rotate(.5); g.fillRect(0, -2.5 * s, 18 * s, 5 * s); g.restore();
    /* le redini erano di bronzo, fissate nei fori del marmo */
    g.strokeStyle = C.bronzo; g.lineWidth = 1.5 * s;
    g.beginPath(); g.moveTo(x + 22 * s, y - 64 * s); g.lineTo(x + 46 * s, y - 70 * s); g.stroke();
  }
}

function chariot(g, x, s = 1) {
  horse(g, x + 50 * s, s, { back: true });
  horse(g, x + 40 * s, s);
  const y = BASE;
  g.strokeStyle = C.marmo; g.lineWidth = 4 * s;
  g.beginPath(); g.arc(x - 6 * s, y - 20 * s, 19 * s, 0, Math.PI * 2); g.stroke();
  g.fillStyle = C.marmo; g.fillRect(x - 18 * s, y - 44 * s, 26 * s, 18 * s);
  person(g, x - 8 * s, s * .95, { armUp: true });
}

function cow(g, x, s = 1) {
  const y = BASE;
  g.fillStyle = C.marmo;
  g.beginPath(); g.ellipse(x, y - 36 * s, 34 * s, 16 * s, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(x + 26 * s, y - 50 * s, 16 * s, 16 * s);
  g.strokeStyle = C.marmo; g.lineWidth = 3 * s;
  g.beginPath(); g.moveTo(x + 34 * s, y - 50 * s); g.quadraticCurveTo(x + 40 * s, y - 64 * s, x + 30 * s, y - 66 * s); g.stroke();
  [22, 12, -18, -26].forEach(o => g.fillRect(x + o * s, y - 22 * s, 5 * s, 22 * s));
}

/* ---------- le scene ---------- */
function scene(draw) {
  return g => {
    g.fillStyle = C.fondo; g.fillRect(0, 0, W, H);
    draw(g);
    /* il listello sopra e il piano sotto, di marmo: incorniciano la lastra */
    g.fillStyle = C.ombra; g.fillRect(0, 0, W, 7); g.fillRect(0, BASE, W, H - BASE);
  };
}

const SCENES = {
  cavalieri: scene(g => { [40, 175, 310, 445].forEach((x, i) => horse(g, x, .92, { rider: true, rear: i % 2 === 0 })); }),
  carri:     scene(g => { chariot(g, 90, .9); chariot(g, 330, .9); }),
  anziani:   scene(g => { [30, 95, 160].forEach(x => person(g, x, .95, { carry: 'branch' }));
                         [250, 315].forEach(x => person(g, x, .95, { carry: 'lyre' }));
                         [395, 460].forEach(x => person(g, x, .95, { carry: 'hydria' })); }),
  vittime:   scene(g => { person(g, 40, .95); cow(g, 140, .95); person(g, 240, .95, { armUp: true }); cow(g, 360, .95); person(g, 470, .95); }),
  fanciulle: scene(g => { [30, 95, 160, 225, 290, 355, 420, 485].forEach((x, i) => person(g, x, .9, { back: i % 2 === 1 })); }),
  dei:       scene(g => { [60, 160, 260, 360, 460].forEach(x => seated(g, x, .95, -1)); }),
  peplo:     scene(g => { seated(g, 70, .95, 1); person(g, 200, .95); person(g, 260, .7, { armUp: true });
                          g.fillStyle = C.marmo; g.fillRect(222, BASE - 74, 34, 18);   // il peplo piegato
                          person(g, 340, .95, { back: true }); seated(g, 450, .95, -1); })
};

/* una tela per scena, e la sua copia a specchio per i cortei che vanno a sinistra */
const MATS = {};
function material(name, mirror) {
  const key = name + (mirror ? '-m' : '');
  if (!MATS[key]) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    SCENES[name](cv.getContext('2d'));
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    t.wrapS = THREE.RepeatWrapping;
    if (mirror) { t.repeat.x = -1; t.offset.x = 1; }
    MATS[key] = new THREE.MeshStandardMaterial({ map: t, roughness: .85, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  return MATS[key];
}

/* Il programma lungo i fianchi, da ovest a est: chi viene prima nel corteo. */
function flankScene(i, n) {
  const t = i / n;
  return t < .4 ? 'cavalieri' : t < .6 ? 'carri' : t < .82 ? 'anziani' : 'vittime';
}

/* ctx: il gruppo del Partenone, la quota dello stilobate, la curvatura. */
export function parthenonFrieze({ g, top, cur }) {
  const rise = (x, z) => cur ? cur(x, z) : 0;
  const FH = 1.0, TH = .2, yc = top + FRIEZE_Y + FH / 2;
  const slab = (len, ax, sign, scn, mirror) => {
    const grp = new THREE.Group();
    grp.add(mk(box(ax === 'x' ? len * .99 : TH, FH, ax === 'x' ? TH : len * .99), M.marmo));
    if (PC.on) faceStrip(grp, ax, sign, TH / 2, len * .99, FH * .98, 0, material(scn, mirror), len * .99);
    return grp;
  };

  /* i fianchi: dal muro della cella, da ovest (z -) a est (z +). A nord il
     corteo va verso la sinistra di chi guarda, a sud verso la destra. */
  const n = 15, len = P.cellaL / n;
  [1, -1].forEach(side => {
    const x = side * (P.cellaW / 2 + TH / 2 + .02);
    for (let i = 0; i < n; i++) {
      const z = -P.cellaL / 2 + len * (i + .5), scn = flankScene(i, n);
      const m = slab(len, 'z', side, scn, side > 0);
      m.position.set(x, yc + rise(x, z), z);
      addPiece('p-zoforo', m, COST.ionicFrieze, mark('ZWFOROS P'),
        `fregio ${side > 0 ? 'nord' : 'sud'} - ${scn}, lastra ${i + 1}`, 6, g);
    }
  });

  /* le fronti: sopra le sei colonne del pronao e dell'opistodomo, un
     architrave e poi il fregio. A ovest i cavalieri, a est il corteo che
     arriva dai due lati davanti agli dei, e al centro il peplo. */
  const PW = 18.6, zEnd = P.cellaL / 2 + 3.1;
  [1, -1].forEach(end => {
    const z = end * zEnd;
    for (let i = 0; i < 3; i++) {
      const ax = -PW / 2 + PW / 3 * (i + .5);
      const a = mk(box(PW / 3 * .99, ARCH_H, 1.3), M.marmo);
      a.position.set(ax, top + PORCH_COL_H + ARCH_H / 2 + rise(ax, z), z);
      addPiece('p-zoforo', a, COST.architrave, mark('EPISTYL P'),
        `architrave ${end > 0 ? 'del pronao' : "dell'opistodomo"}`, 6, g);
    }
    const ne = 5, el = PW / ne;
    for (let i = 0; i < ne; i++) {
      const x = -PW / 2 + el * (i + .5);
      const scn = end < 0 ? 'cavalieri' : ['fanciulle', 'dei', 'peplo', 'dei', 'fanciulle'][i];
      /* a ovest verso nord (sinistra di chi guarda); a est verso il centro */
      const mirror = end < 0 ? true : x > 0;
      const m = slab(el, 'x', end, scn, mirror);
      m.position.set(x, top + FRIEZE_Y + FH / 2 + rise(x, z), z);
      addPiece('p-zoforo', m, COST.ionicFrieze, mark('ZWFOROS P'),
        `fregio ${end > 0 ? 'est' : 'ovest'} - ${scn}`, 6, g);
    }
  });
}
