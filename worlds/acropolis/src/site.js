import * as THREE from 'three';
import { M } from './materials.js';
import { COST, PLATEAU } from './config.js';
import { G, box, mk, statue, walls, colonnade } from './kit.js';
import { addPiece, mark } from '/engine/pieces.js';
import { seeded } from '/engine/random.js';
import { terrainH, rimShape, wallTop } from './terrain.js';

const PI = Math.PI;

/* ══════════════ IL PIANORO ══════════════
   L Acropoli non erano cinque edifici su una spianata vuota. Era un
   recinto affollato: una strada lastricata, un altare grande quanto una
   casa, due santuari minori addossati al muro sud e qualche centinaio di
   offerte votive piantate ovunque restasse spazio. Pausania, che ci
   cammina sei secoli dopo, elenca ancora le statue una per una e si
   stanca prima di finirle.

   La roccia affiorante non sta qui: quella c era gia, ed e in terrain.js.
   Qui c e solo cio che e stato portato su e messo in opera, e quindi
   costa token come ogni altro blocco. */

/* Il generatore deterministico e del motore, engine/random.js: la
   disposizione deve essere identica a ogni ricarica, perche il cantiere e
   "i primi N pezzi dell'elenco". */

/* ---------- appoggio al suolo ----------
   Il pianoro ondula di circa un metro: un pezzo posato a quota fissa
   galleggia o affonda. Ogni cosa prende la quota locale e la pendenza.
   L'orientamento (yaw) entra qui, non dopo: la pendenza va misurata lungo
   gli assi del pezzo gia girato, e l'ordine YXZ prima gira e poi inclina.
   Con la rotazione aggiunta dopo, un pezzo girato si inclinava sulla
   pendenza sbagliata, e un bordo affondava nel terreno. */
function layOnGround(obj, x, z, lift, yaw = 0) {
  const e = .8, h = terrainH(x, z);
  const slope = (ux, uz) => (terrainH(x + ux * e, z + uz * e) - terrainH(x - ux * e, z - uz * e)) / (2 * e);
  obj.position.set(x, h + (lift || 0), z);
  obj.rotation.order = 'YXZ';
  obj.rotation.y = yaw;
  /* l'asse x del pezzo, girato di yaw, punta a (cos, -sin); l'asse z a (sin, cos) */
  obj.rotation.z = Math.atan(slope(Math.cos(yaw), -Math.sin(yaw)));
  obj.rotation.x = -Math.atan(slope(Math.sin(yaw), Math.cos(yaw)));
  return h;
}

/* ---------- dove non si puo mettere niente ----------
   Ingombri dei monumenti, con un margine di rispetto. */
const KEEP_OUT = [
  [ -46,  46, -25,  25],   // Partenone
  [ -64, -20, -41, -10],   // Eretteo
  [-178,-116, -27,  27],   // Propilei, Pinacoteca, ala sud
  [-184,-148,   1,  33],   // bastione di Atena Nike
  [ -96, -72, -26,  -2],   // Athena Promachos
  [ -34,   2, -37, -17],   // altare di Atena Polias
  [-152,-104,  19,  43],   // Brauronion
  [-110, -60,  21,  47]    // Calcoteca
];
const inBuilding = (x, z) => KEEP_OUT.some(r => x > r[0] && x < r[1] && z > r[2] && z < r[3]);

/* Raggio normalizzato sul pianoro: 1 e il ciglio, oltre si precipita. */
function plateauR(x, z) {
  const dx = (x - PLATEAU.cx) / PLATEAU.a, dz = (z - PLATEAU.cz) / PLATEAU.b;
  return Math.hypot(dx, dz) / rimShape(Math.atan2(dz, dx));
}

/* ══════════════ LA VIA PANATENAICA ══════════════
   Sale dall Agora, attraversa i Propilei ed e l unica strada del recinto.
   Passa a sud dell Athena Promachos, gira attorno alla fronte occidentale
   del Partenone, ne costeggia il fianco e finisce dove finiva la
   processione: davanti all altare, non dentro il tempio. Nei templi greci
   non entrava nessuno se non i sacerdoti. */
const WAY = [
  [-136, -2], [-120, 0], [-104, 2], [-88, 0], [-72, 6], [-58, 14], [-44, 20],
  [-26, 23], [-6, 24], [14, 23], [30, 20], [42, 12], [48, 2], [44, -8],
  [30, -16], [10, -22], [-8, -25]
];

/* Catmull-Rom scritto a mano: serve una curva sola e non vale la pena
   tirarsi dietro mezza libreria di three per averla. */
function spline(pts, t) {
  const n = pts.length - 1, i = Math.min(n - 1, Math.floor(t * n)), u = t * n - i;
  const p = k => pts[Math.max(0, Math.min(n, k))];
  const [x0, z0] = p(i - 1), [x1, z1] = p(i), [x2, z2] = p(i + 1), [x3, z3] = p(i + 2);
  const u2 = u * u, u3 = u2 * u;
  const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * u +
    (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  return [f(x0, x1, x2, x3), f(z0, z1, z2, z3)];
}

/* Distanza approssimata dalla strada: serve alle offerte votive per non
   piantarsi in mezzo al passaggio della processione. */
const WAY_SAMPLES = [];
for (let i = 0; i <= 300; i++) WAY_SAMPLES.push(spline(WAY, i / 300));
function distToWay(x, z) {
  let best = 1e9;
  for (const [wx, wz] of WAY_SAMPLES) {
    const d = (x - wx) * (x - wx) + (z - wz) * (z - wz);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export function sacredWay(scene) {
  const rnd = seeded(20440);
  const STEP = 2.6, HALF = 2.8;
  /* lunghezza effettiva della curva, per spaziare le file in modo uniforme */
  let len = 0;
  for (let i = 1; i < WAY_SAMPLES.length; i++)
    len += Math.hypot(WAY_SAMPLES[i][0] - WAY_SAMPLES[i - 1][0],
                      WAY_SAMPLES[i][1] - WAY_SAMPLES[i - 1][1]);
  const rows = Math.floor(len / STEP);

  for (let r = 0; r < rows; r++) {
    const t = r / rows;
    const [x, z] = spline(WAY, t);
    const [xa, za] = spline(WAY, Math.min(1, t + .004));
    const ang = Math.atan2(za - z, xa - x);
    /* tre lastre per fila, di larghezza diseguale: il basolato greco non
       era un pavimento, erano pietre accostate. */
    let off = -HALF;
    for (let k = 0; k < 3; k++) {
      const w = (2 * HALF / 3) * (.82 + rnd() * .36);
      const cx = x + Math.cos(ang + PI / 2) * (off + w / 2);
      const cz = z + Math.sin(ang + PI / 2) * (off + w / 2);
      off += w;
      /* le lastre si sovrappongono appena: accostate esatte, sul terreno
         ondulato si aprirebbero fessure a ogni dosso */
      const m = mk(box(STEP * (.98 + rnd() * .14), .26, w * 1.02),
                   rnd() < .35 ? M.calcare : M.basolato);
      /* ang e misurato con z verso sud, la rotazione di three gira al
         contrario: il lato lungo della lastra segue la strada con -ang. Prima
         era +ang, e sulle curve le lastre andavano a zig-zag lasciando
         scoperta la sabbia. Spessore .26: il centro sta .09 sopra il suolo,
         cosi la lastra sporge di 22 cm e il terreno non la copre. */
      layOnGround(m, cx, cz, .09, -ang + (rnd() - .5) * .09);
      addPiece('odos', m, COST.slab, mark('ODOS'),
        `via Panatenaica - lastra, fila ${r + 1}`, 4, scene);
    }
  }
}

/* ══════════════ IL MURO NORD ══════════════
   Quando i Persiani bruciano l Acropoli nel 480 trovano il Partenone
   precedente ancora in cantiere. I rocchi gia squadrati restano a terra;
   Temistocle li fa murare nel lato nord, allineati e visibili dalla citta.
   Non e riuso per risparmiare: e un memoriale, si vedono da sotto. */
export function northWall(scene) {
  const rnd = seeded(4801);
  const A0 = -PI / 2 - .30 * PI, A1 = -PI / 2 + .22 * PI;   // arco del lato nord

  /* Punto sul ciglio a una data frazione del raggio. `rr` sotto 1 rientra
     verso l'interno del muro: e cosi che un rocchio resta murato per meta
     invece di posarsi sopra. */
  const rim = (a, rr) => {
    const r = rimShape(a) * rr;
    return [PLATEAU.cx + Math.cos(a) * PLATEAU.a * r,
            PLATEAU.cz + Math.sin(a) * PLATEAU.b * r];
  };

  /* L'angolo non e proporzionale alla distanza percorsa su un'ellisse:
     senza una tabella di lunghezze d'arco i rocchi verrebbero fitti alle
     estremita e radi al centro, e la fila non si leggerebbe. */
  const S = 500, cum = [0], ang = [A0];
  let prev = rim(A0, .99);
  for (let i = 1; i <= S; i++) {
    const a = A0 + (A1 - A0) * i / S, p = rim(a, .99);
    cum.push(cum[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]));
    ang.push(a); prev = p;
  }
  const total = cum[S];
  const angleAt = d => {
    let i = 1; while (i < S && cum[i] < d) i++;
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return ang[i - 1] + (ang[i] - ang[i - 1]) * t;
  };

  /* I rocchi, coricati e a contatto, in un corso continuo dentro la faccia. */
  const DL = 1.74, N = Math.floor(total / DL);
  for (let i = 0; i < N; i++) {
    const a = angleAt((i + .5) * DL);
    const [x, z] = rim(a, .990);
    const d = mk(G('wd' + (i % 3), () => new THREE.CylinderGeometry(.90, .93, 1.66, 22)),
                 i % 2 ? M.marmo3 : M.calcare);
    d.position.set(x, -1.05 + (rnd() - .5) * .12, z);
    d.rotation.z = PI / 2;                                   // coricati, come in opera
    d.rotation.y = Math.atan2(Math.sin(a) * PLATEAU.b, Math.cos(a) * PLATEAU.a);
    addPiece('mura', d, COST.reusedDrum, mark('KIWN PALAI'),
      'rocchio del Partenone arcaico murato nel lato nord', 5, scene);
  }

  /* Sopra i rocchi il coronamento, appoggiato alla quota vera del muro. */
  const BL = 2.6, NB = Math.floor(total / BL);
  for (let i = 0; i < NB; i++) {
    const a = angleAt((i + .5) * BL);
    const [x, z] = rim(a, .975);
    const m = mk(box(BL * .97, .8, 1.6), i % 2 ? M.calcare : M.marmo3);
    m.position.set(x, wallTop(x, z) - .18, z);
    m.rotation.y = Math.atan2(Math.sin(a) * PLATEAU.b, Math.cos(a) * PLATEAU.a);
    addPiece('mura', m, COST.wall, mark('QWRAKION'), 'coronamento del muro nord', 4, scene);
  }
}

/* ══════════════ L ALTARE DI ATENA POLIAS ══════════════
   Il vero centro del culto: qui finiva la processione e qui si
   sacrificavano le cento vacche dell ecatombe. Il tempio custodiva la
   statua, l altare riceveva il sangue. */
export function greatAltar(scene) {
  const g = new THREE.Group();
  g.position.set(-16, 0, -27);
  scene.add(g);
  const L = 21, W = 8.4, base = terrainH(-16, -27);

  for (let c = 0; c < 3; c++) {
    const inset = (2 - c) * .5, w = W + inset * 2, l = L + inset * 2;
    for (let i = 0; i < 8; i++) {
      const m = mk(box(l / 8 * .99, .46, w), c === 2 ? M.marmo : M.calcare);
      m.position.set(-l / 2 + l / 8 * (i + .5), base + .46 * (c + .5), 0);
      addPiece('bomos', m, COST.step, mark('KRHPIS B'), `altare - corso ${c + 1}`, 6, g);
    }
  }
  const top = base + 1.38;
  /* il piano del fuoco, e attorno il parapetto che lo racchiude su tre lati */
  for (let i = 0; i < 6; i++) {
    const m = mk(box(L / 3 * .99, .34, W / 2 * .99), M.marmo2);
    m.position.set(-L / 2 + L / 3 * (i % 3 + .5), top + .17, -W / 4 + W / 2 * Math.floor(i / 3));
    addPiece('bomos', m, COST.wall, mark('ESXARA'), 'piano del fuoco', 6, g);
  }
  [[0, -W / 2 + .5, L, 1], [0, W / 2 - .5, L, 1], [-L / 2 + .5, 0, 1, W]]
    .forEach((r, k) => {
      const n = k < 2 ? 7 : 3;
      for (let i = 0; i < n; i++) {
        const m = mk(box(r[2] / n * .98, 1.15, r[3] * .98), i % 2 ? M.marmo : M.marmo2);
        m.position.set(k < 2 ? -r[2] / 2 + r[2] / n * (i + .5) : r[0],
                       top + .34 + .575,
                       k < 2 ? r[1] : -r[3] / 2 + r[3] / n * (i + .5));
        addPiece('bomos', m, COST.wall, mark('QRIGKOS B'), 'parapetto dell altare', 7, g);
      }
    });
  /* rampa a est: le vittime salivano, non venivano issate */
  for (let i = 0; i < 4; i++) {
    const m = mk(box(1.5, .30 + i * .28, W * .62), M.calcare);
    m.position.set(L / 2 + 3.2 - i * 1.5, base + (.30 + i * .28) / 2, 0);
    addPiece('bomos', m, COST.step, mark('ANABASIS'), 'rampa dell altare', 6, g);
  }
}

/* ══════════════ I SANTUARI MINORI DEL LATO SUD ══════════════
   Brauronion e Calcoteca stanno addossati al muro meridionale, fra i
   Propilei e il Partenone. Nessuno dei due e un tempio: il primo e un
   recinto con due portici per i doni ad Artemide, il secondo e un
   magazzino, la stanza dove si tenevano i bronzi votivi quando non
   c era piu posto per esporli. */
export function sanctuaries(scene) {
  /* -- Brauronion: santuario di Artemide Brauronia -- */
  const b = new THREE.Group();
  b.position.set(-128, terrainH(-128, 31), 31);
  scene.add(b);
  const bp = [];
  for (let i = 0; i < 9; i++) bp.push([-15 + 30 * i / 8, -3.4]);
  colonnade({ g: b, pos: bp, y0: .62, h: 4.35, rb: .34, rt: .29, drums: 5,
    order: 'doric', phase: 'temene', tag: 'BRAYR KIWN', flutes: 20, fdepth: .05 });
  for (let i = 0; i < 12; i++) {
    const m = mk(box(32 / 6 * .99, .62, 8 / 2 * .99), M.calcare);
    m.position.set(-16 + 32 / 6 * (i % 6 + .5), .31, -4 + 8 / 2 * Math.floor(i / 6));
    addPiece('temene', m, COST.foundation, mark('BRAYR'), 'stilobate del Brauronion', 6, b);
  }
  walls({ g: b, w: 31, l: 7.4, h: 3.9, courses: 5, th: .72, y0: .62,
    phase: 'temene', tag: 'BRAYR TOIX' });
  for (let i = 0; i < 10; i++) {
    const m = mk(box(32 / 5 * .98, .34, 8.4 / 2 * .98), M.marmo2);
    m.position.set(-16 + 32 / 5 * (i % 5 + .5), 4.7, -4.2 + 8.4 / 2 * Math.floor(i / 5));
    addPiece('temene', m, COST.roof, mark('STEGH BR'), 'copertura del Brauronion', 8, b);
  }

  /* -- Calcoteca: il deposito dei bronzi -- */
  const c = new THREE.Group();
  c.position.set(-85, terrainH(-85, 34), 34);
  scene.add(c);
  for (let i = 0; i < 12; i++) {
    const m = mk(box(36 / 6 * .99, .55, 15 / 2 * .99), M.calcare);
    m.position.set(-18 + 36 / 6 * (i % 6 + .5), .275, -7.5 + 15 / 2 * Math.floor(i / 6));
    addPiece('temene', m, COST.foundation, mark('XALK'), 'fondazione della Calcoteca', 6, c);
  }
  walls({ g: c, w: 35, l: 14, h: 5.6, courses: 6, th: .85, y0: .55,
    phase: 'temene', tag: 'XALK TOIX' });
  const cp = [];
  for (let i = 0; i < 10; i++) cp.push([-16.4 + 32.8 * i / 9, -6.8]);
  colonnade({ g: c, pos: cp, y0: .55, h: 5.1, rb: .38, rt: .32, drums: 6,
    order: 'doric', phase: 'temene', tag: 'XALK KIWN', flutes: 20, fdepth: .05 });
  for (let i = 0; i < 12; i++) {
    const m = mk(box(36 / 4 * .98, .4, 15.4 / 3 * .98), M.marmo2);
    m.position.set(-18 + 36 / 4 * (i % 4 + .5), 6.4, -7.7 + 15.4 / 3 * Math.floor(i / 4));
    addPiece('temene', m, COST.roof, mark('STEGH XA'), 'copertura della Calcoteca', 9, c);
  }
}

/* ══════════════ LE OFFERTE VOTIVE ══════════════
   La ragione per cui l Acropoli era affollata. Chi vinceva una gara, una
   causa o una guerra lasciava un anathema, e non lo si poteva rimuovere
   perche apparteneva alla dea. Nei tre secoli prima di Pericle il recinto
   si riempie di korai, tripodi, erme e stele finche non resta spazio. */

function kore(h) {
  const g = new THREE.Group();
  const base = mk(box(.62, .26, .62), M.marmo2); base.position.y = .13;
  const col = mk(G('kco', () => new THREE.CylinderGeometry(.19, .22, 2.15, 18)), M.marmo);
  col.position.y = .26 + 1.075;
  const cap = mk(box(.52, .16, .52), M.marmo2); cap.position.y = 2.49;
  const f = statue(h, 'standing', M.marmo, M.marmo2, { votive: true });
  f.position.y = 2.57;
  g.add(base, col, cap, f);
  return g;
}

function tripod() {
  const g = new THREE.Group();
  const base = mk(G('trb', () => new THREE.CylinderGeometry(.72, .82, .34, 16)), M.calcare);
  base.position.y = .17;
  g.add(base);
  const leg = G('trl', () => new THREE.CylinderGeometry(.045, .06, 1.72, 8));
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * 2 * PI;
    const l = mk(leg, M.bronzo);
    l.position.set(Math.cos(a) * .42, .34 + .86, Math.sin(a) * .42);
    l.rotation.z = -Math.cos(a) * .13; l.rotation.x = Math.sin(a) * .13;
    g.add(l);
  }
  const bowl = mk(G('trw', () => new THREE.CylinderGeometry(.62, .40, .46, 18)), M.bronzo);
  bowl.position.y = 2.4; g.add(bowl);
  const ring = mk(G('trr', () => new THREE.TorusGeometry(.60, .055, 8, 20)), M.bronzo);
  ring.rotation.x = PI / 2; ring.position.y = 2.6; g.add(ring);
  return g;
}

function herm() {
  const g = new THREE.Group();
  const sh = mk(box(.36, 1.72, .30), M.marmo); sh.position.y = .86;
  const head = mk(G('hh', () => new THREE.SphereGeometry(.16, 12, 9)), M.marmo);
  head.position.y = 1.86;
  const beard = mk(G('hb', () => new THREE.ConeGeometry(.13, .30, 10)), M.marmo2);
  beard.position.set(0, 1.76, .11); beard.rotation.x = .35;
  g.add(sh, head, beard);
  return g;
}

function stele() {
  const g = new THREE.Group();
  const base = mk(box(.86, .22, .48), M.calcare); base.position.y = .11;
  const sl = mk(box(.66, 1.55, .17), M.marmo); sl.position.y = .22 + .775;
  const top = mk(G('stt', () => new THREE.CylinderGeometry(.33, .33, .17, 14, 1, false, 0, PI)), M.marmo);
  top.rotation.z = -PI / 2; top.rotation.y = PI / 2; top.position.y = 1.77;
  g.add(base, sl, top);
  return g;
}

function basin() {
  const g = new THREE.Group();
  const foot = mk(G('pf', () => new THREE.CylinderGeometry(.30, .44, .22, 16)), M.marmo2);
  foot.position.y = .11;
  const stem = mk(G('ps', () => new THREE.CylinderGeometry(.17, .21, .84, 14)), M.marmo);
  stem.position.y = .64;
  const bowl = mk(G('pb', () => new THREE.CylinderGeometry(.66, .30, .34, 20)), M.marmo);
  bowl.position.y = 1.23;
  g.add(foot, stem, bowl);
  return g;
}

export function votives(scene) {
  const rnd = seeded(776);
  const KINDS = [
    { k: 'kore',   n: 18, cost: COST.kore,   tag: 'KORH',      d: 'kore votiva su colonnetta' },
    { k: 'tripod', n: 15, cost: COST.tripod, tag: 'TRIPOYS',   d: 'tripode bronzeo di vittoria' },
    { k: 'herm',   n: 14, cost: COST.herm,   tag: 'ERMHS',     d: 'erma di confine' },
    { k: 'stele',  n: 18, cost: COST.stele,  tag: 'STHLH',     d: 'stele iscritta' },
    { k: 'basin',  n: 9,  cost: COST.basin,  tag: 'PERIRRANT', d: 'perirranterio per l acqua lustrale' }
  ];
  const placed = [];
  const make = { kore: () => kore(1.35 + rnd() * .3), tripod, herm, stele, basin };

  KINDS.forEach(K => {
    let done = 0, guard = 0;
    while (done < K.n && guard++ < 4000) {
      const x = PLATEAU.cx + (rnd() - .5) * PLATEAU.a * 1.76;
      const z = PLATEAU.cz + (rnd() - .5) * PLATEAU.b * 1.76;
      if (plateauR(x, z) > .88 || inBuilding(x, z)) continue;
      if (distToWay(x, z) < 4.6) continue;                       // la processione deve passare
      if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 5.2)) continue;
      placed.push([x, z]);
      const o = make[K.k]();
      layOnGround(o, x, z, 0, rnd() * 2 * PI);
      o.traverse(q => { if (q.isMesh) q.castShadow = q.receiveShadow = true; });
      addPiece('anathemata', o, K.cost, mark(K.tag), K.d, 7, scene);
      done++;
    }
  });
}

/* ══════════════ LA VEGETAZIONE ══════════════
   L Acropoli era una roccia, non un parco: qui non si va per l ombra.
   Il verde sta dove le fonti lo mettono - l ulivo di Atena nel
   Pandroseion, qualche albero nei recinti sacri, macchia bassa lungo le
   mura dove la terra si e accumulata. */

function olive(h, big) {
  const g = new THREE.Group();
  const rnd = seeded(Math.round(h * 1000));
  /* il tronco dell olivo non e un cilindro: si attorciglia e si svuota */
  let y = 0, r = h * .085, tilt = 0;
  for (let i = 0; i < 4; i++) {
    const sh = h * (.09 + rnd() * .05);
    const seg = mk(new THREE.CylinderGeometry(r * .84, r, sh, 9), M.corteccia);
    tilt += (rnd() - .5) * .30;
    seg.position.set(Math.sin(tilt) * sh * .4, y + sh / 2, Math.cos(tilt) * sh * .12);
    seg.rotation.z = tilt * .6; seg.rotation.x = (rnd() - .5) * .2;
    g.add(seg);
    y += sh * .92; r *= .84;
  }
  /* rami e chioma: sfere schiacciate, argentate sotto come le foglie vere */
  const nb = big ? 7 : 5;
  for (let i = 0; i < nb; i++) {
    const a = i / nb * 2 * PI + rnd(), rad = h * (.17 + rnd() * .13);
    const c = mk(new THREE.SphereGeometry(rad, 9, 7), i % 3 === 0 ? M.frondaChiara : M.fronda);
    c.position.set(Math.cos(a) * h * (.11 + rnd() * .13),
                   y + h * (.10 + rnd() * .22),
                   Math.sin(a) * h * (.11 + rnd() * .13));
    c.scale.set(1, .68, 1);
    g.add(c);
  }
  return g;
}

function shrub(h) {
  const g = new THREE.Group();
  const rnd = seeded(Math.round(h * 7919));
  for (let i = 0; i < 3; i++) {
    const c = mk(new THREE.SphereGeometry(h * (.42 + rnd() * .24), 8, 6), M.alloro);
    c.position.set((rnd() - .5) * h * .7, h * (.32 + rnd() * .2), (rnd() - .5) * h * .7);
    c.scale.set(1, .74, 1);
    g.add(c);
  }
  return g;
}

export function plantings(scene) {
  const rnd = seeded(4790);

  /* L ulivo di Atena. Erodoto racconta che i Persiani lo bruciarono e che
     il giorno dopo il ceppo aveva gia rimesso un getto lungo un cubito.
     E il primo pezzo del cantiere: l Acropoli riparte da qui. */
  const moria = olive(7.4, true);
  layOnGround(moria, -60, -25, 0);
  moria.traverse(q => { if (q.isMesh) q.castShadow = q.receiveShadow = true; });
  addPiece('fyta', moria, COST.sacredOlive, 'ELAIA MORIA',
    'l ulivo di Atena nel Pandroseion - ributtato dal ceppo bruciato', 3, scene);

  /* Il resto della piantumazione, addossata alle mura e ai recinti. */
  const placed = [[-60, -25]];
  let done = 0, guard = 0;
  while (done < 26 && guard++ < 5000) {
    const a = rnd() * 2 * PI, rr = .58 + rnd() * .28;
    const x = PLATEAU.cx + Math.cos(a) * PLATEAU.a * rr * rimShape(a);
    const z = PLATEAU.cz + Math.sin(a) * PLATEAU.b * rr * rimShape(a);
    if (plateauR(x, z) > .87 || inBuilding(x, z)) continue;
    if (distToWay(x, z) < 6.5) continue;
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 11)) continue;
    placed.push([x, z]);
    const h = 4.2 + rnd() * 2.4;
    const t = olive(h, false);
    layOnGround(t, x, z, 0, rnd() * 2 * PI);
    t.traverse(q => { if (q.isMesh) q.castShadow = q.receiveShadow = true; });
    addPiece('fyta', t, COST.tree, mark('ELAIA'), `ulivo - altezza ${h.toFixed(1)} m`, 3, scene);
    done++;
  }

  /* macchia bassa: mirto e alloro dove si e fermata la terra */
  done = 0; guard = 0;
  while (done < 22 && guard++ < 5000) {
    const a = rnd() * 2 * PI, rr = .70 + rnd() * .16;
    const x = PLATEAU.cx + Math.cos(a) * PLATEAU.a * rr * rimShape(a);
    const z = PLATEAU.cz + Math.sin(a) * PLATEAU.b * rr * rimShape(a);
    if (plateauR(x, z) > .89 || inBuilding(x, z)) continue;
    if (distToWay(x, z) < 4) continue;
    if (placed.some(p => Math.hypot(p[0] - x, p[1] - z) < 6)) continue;
    placed.push([x, z]);
    const s = shrub(1.1 + rnd() * .8);
    layOnGround(s, x, z, 0, rnd() * 2 * PI);
    s.traverse(q => { if (q.isMesh) q.castShadow = q.receiveShadow = true; });
    addPiece('fyta', s, COST.shrub, mark('MYRTOS'), 'macchia di mirto', 2, scene);
    done++;
  }
}

/* ══════════════ LA ROCCIA AFFIORANTE ══════════════
   Il calcare del pianoro spunta ovunque il terreno non sia stato
   spianato, e sull Acropoli non lo era quasi mai: i gradini erano
   tagliati nella roccia viva e i templi poggiano direttamente su di essa.

   Questi affioramenti non passano da addPiece e non hanno un costo. E
   una distinzione voluta: tutto cio che si vede sull Acropoli e stato
   portato su a spalla e si paga, tranne la roccia, che c era prima. */
export function outcrops(scene) {
  const rnd = seeded(31337);
  let done = 0, guard = 0;
  while (done < 54 && guard++ < 6000) {
    const a = rnd() * 2 * PI, rr = .16 + rnd() * .70;
    const x = PLATEAU.cx + Math.cos(a) * PLATEAU.a * rr * rimShape(a);
    const z = PLATEAU.cz + Math.sin(a) * PLATEAU.b * rr * rimShape(a);
    if (plateauR(x, z) > .90 || inBuilding(x, z)) continue;
    if (distToWay(x, z) < 3.2) continue;
    const r = .9 + rnd() * 2.6;
    const m = mk(new THREE.SphereGeometry(r, 6, 4), M.roccia);
    m.scale.set(1 + rnd() * .7, .22 + rnd() * .20, 1 + rnd() * .7);
    layOnGround(m, x, z, -r * .16, rnd() * 2 * PI);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    done++;
  }
}
