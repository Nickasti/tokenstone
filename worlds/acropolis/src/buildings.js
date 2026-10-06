import * as THREE from 'three';
import { M } from './materials.js';
import { SITE, PARTHENON as P, PROPYLAEA as PR, NIKE as NK, ERECHTHEION as ER, COST, REFINEMENTS as RF } from './config.js';
import { krepis, colonnade, entablature, walls, gable, statue, caryatid, mk, box, G,
         makeCurve, axisPositions } from './kit.js';
import { addPiece, mark } from '/engine/pieces.js';
import { outcrops, plantings, northWall, sacredWay, greatAltar,
         sanctuaries, votives } from './site.js';

const PI = Math.PI;

function siteGroup(scene, key) {
  const s = SITE[key];
  const g = new THREE.Group();
  g.position.set(s.x, s.base, s.z);
  g.rotation.y = s.rot;
  scene.add(g);
  return g;
}

/* ══════════ ATHENA PROMACHOS - c. 456 a.C. ══════════ */
function promachos(scene) {
  const g = siteGroup(scene, 'promachos');
  const base = mk(box(4.6, 1.6, 4.6), M.calcare); base.position.y = .8;
  addPiece('promachos', base, COST.statueBase, 'BAQRON', 'basamento della statua', 6, g);

  const f = statue(8.6, 'standing', M.bronzo, M.bronzo, { monument: 'promachos' });
  f.position.y = 1.6;
  const spear = mk(new THREE.CylinderGeometry(.09, .09, 9.4, 10), M.bronzo);
  spear.position.set(1.5, 4.6, 0); spear.rotation.z = .06; f.add(spear);
  const shield = mk(new THREE.CylinderGeometry(1.5, 1.5, .2, 24), M.bronzo);
  shield.rotation.x = PI / 2; shield.position.set(-1.5, 3.6, .2); f.add(shield);
  f.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  addPiece('promachos', f, COST.promachos, 'AQHNA PROMAXOS', 'bronzo di Fidia - visibile dal mare', 16, g);
}

/* ══════════ PARTENONE - 447-432 a.C. ══════════ */
function parthenon(scene) {
  const g = siteGroup(scene, 'parthenon');

  /* Nessuna linea del Partenone e davvero retta: lo stilobate si inarca,
     le colonne pendono verso l interno, quelle d angolo sono piu grosse e
     i due intercolumni d angolo sono contratti. Sono correzioni ottiche,
     non imprecisioni: i valori stanno in REFINEMENTS. */
  const cur = RF.on ? makeCurve({ w: P.stylobateW, l: P.stylobateL,
                                  front: RF.curveFront, flank: RF.curveFlank }) : null;
  /* I fianchi opposti, prolungati, si incontrerebbero 2,4 km piu in alto:
     e da li che si ricava la pendenza, uguale per tutte le colonne di una
     faccia. Le colonne d angolo appartengono a due facce e pendono in
     diagonale. */
  const sx = P.stylobateW - P.colAxisInset * 2, sz = P.stylobateL - P.colAxisInset * 2;
  const incline = RF.on ? (sx / 2) / RF.convergence : 0;

  const top = krepis({ g, w: P.stylobateW, l: P.stylobateL, steps: P.steps, sh: P.stepH,
    inset: P.stepInset, y0: 0, phase: 'p-krepis', tag: 'KRHPIS', slices: 12,
    slicesX: cur ? 3 : 1, curve: cur });

  /* peristasi: 8 x 17, angoli condivisi -> 46 colonne */
  const ctr = RF.on ? RF.contract : 0;
  const X = axisPositions(sx, P.colsFront, ctr), Z = axisPositions(sz, P.colsFlank, ctr);
  const pos = [];
  for (let i = 0; i < P.colsFront; i++)
    for (let j = 0; j < P.colsFlank; j++) {
      const ei = i === 0 || i === P.colsFront - 1, ej = j === 0 || j === P.colsFlank - 1;
      if (ei || ej) pos.push([X[i], Z[j], { corner: ei && ej,
        leanX: ei ? Math.sign(X[i]) : 0, leanZ: ej ? Math.sign(Z[j]) : 0 }]);
    }
  pos.sort((a, b) => Math.atan2(a[0], a[1]) - Math.atan2(b[0], b[1]));   // posa lungo il perimetro
  colonnade({ g, pos, y0: top, h: P.colH, rb: P.rBot, rt: P.rTop, drums: P.drums,
    order: 'doric', phase: 'p-perist', tag: 'KIWN', flutes: 20, fdepth: .05,
    curve: cur, incline, cornerSwell: RF.on ? RF.cornerSwell : 1 });

  walls({ g, w: P.cellaW, l: P.cellaL, h: P.cellaH, courses: 8, th: 1.2,
    y0: top, phase: 'p-sekos', tag: 'TOIXOS', curve: cur });
  [1, -1].forEach(side => {
    const p = [];
    for (let i = 0; i < 6; i++)
      p.push([-8.2 + 16.4 * i / 5, side * (P.cellaL / 2 + 3.1), { leanZ: side }]);
    colonnade({ g, pos: p, y0: top, h: 8.0, rb: .66, rt: .55, drums: 7, order: 'doric',
      phase: 'p-sekos', tag: side > 0 ? 'PRONAOS' : 'OPISQOD', flutes: 20, fdepth: .05,
      curve: cur, incline });
  });

  const entTop = entablature({ g, w: P.stylobateW, l: P.stylobateL, depth: P.entDepth,
    y0: top + P.colH, archH: P.architraveH, frzH: P.friezeH, geiH: P.geisonH,
    doric: true, phase: 'p-trab', nx: 7, nz: 16,
    tx: P.triglyphsFront, tz: P.triglyphsFlank, curve: cur });

  gable({ g, w: P.stylobateW, l: P.stylobateL, y0: entTop, pedH: P.pedimentH,
    depth: .95, phase: 'p-front', figs: 6, slabs: 5, roofRows: 11, curve: cur });

  /* Athena Parthenos */
  const a = new THREE.Group();
  const b = mk(box(6.2, 1, 3.4), M.marmo2); b.position.y = .5; a.add(b);
  const f = statue(11.4, 'standing', M.oro, M.avorio, { monument: 'parthenos' });
  f.position.y = 1; a.add(f);
  const sh = mk(new THREE.CylinderGeometry(1.85, 1.85, .24, 26), M.oro);
  sh.rotation.x = PI / 2; sh.rotation.z = .1; sh.position.set(-2.1, 5.4, .3); a.add(sh);
  a.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  a.position.set(0, top + (cur ? cur(0, 9.5) : 0), 9.5);
  addPiece('p-athena', a, COST.athenaParthenos, 'AQHNA PARQENOS', 'oro e avorio - Fidia, 438 a.C.', 20, g);
}

/* ══════════ PROPILEI - 437-432 a.C., mai completati ══════════ */
function propylaea(scene) {
  const g = siteGroup(scene, 'propylaea');
  const top = krepis({ g, w: PR.w, l: PR.l, steps: 4, sh: .42, inset: .5, y0: 0,
    phase: 'prop', tag: 'KRHPIS P', slices: 6 });

  [[-1, PR.colWestH, PR.westFloorDrop], [1, PR.colEastH, 0]].forEach(([side, ch, dy]) => {
    const p = [];
    for (let i = 0; i < 6; i++) p.push([-9.4 + 18.8 * i / 5, side * (PR.l / 2 - 1.5)]);
    colonnade({ g, pos: p, y0: top + dy, h: ch, rb: .79, rt: .63, drums: 9, order: 'doric',
      phase: 'prop', tag: side < 0 ? 'DYT KIWN' : 'ANAT KIWN', flutes: 20, fdepth: .05 });
  });

  /* colonnata ionica interna che fiancheggia la rampa */
  [-1, 1].forEach(s => {
    const p = [];
    for (let i = 0; i < 3; i++) p.push([s * 4.3, -4.6 + 9.2 * i / 2]);
    colonnade({ g, pos: p, y0: top - 1, h: PR.ionicH, rb: .55, rt: .46, drums: 7,
      order: 'ionic', phase: 'prop', tag: 'IWN KIWN', flutes: 24, fdepth: .06, capRot: PI / 2 });
  });

  walls({ g, w: PR.w - 2.2, l: PR.l - 1, h: 9.2, courses: 6, th: 1.1, y0: top,
    phase: 'prop', tag: 'TOIXOS P' });
  const et = entablature({ g, w: PR.w, l: PR.l, depth: 1.3, y0: top + 8.9,
    archH: 1.1, frzH: 1.1, geiH: .52, doric: true, phase: 'prop',
    nx: 6, nz: 6, tx: 13, tz: 13 });
  gable({ g, w: PR.w, l: PR.l, y0: et, pedH: 2.9, depth: .8, phase: 'prop',
    figs: 0, slabs: 4, roofRows: 7 });

  /* ala nord-ovest: la Pinacoteca, l'unica portata a termine */
  const nw = new THREE.Group(); nw.position.set(-16.5, 0, -9.5); g.add(nw);
  walls({ g: nw, w: 10.8, l: 9, h: 5.6, courses: 5, th: .9, y0: top, phase: 'prop', tag: 'PINAKOQ' });
  const np = [];
  for (let i = 0; i < 3; i++) np.push([-3.4 + 6.8 * i / 2, 4.6]);
  colonnade({ g: nw, pos: np, y0: top, h: 5.2, rb: .5, rt: .42, drums: 6, order: 'doric',
    phase: 'prop', tag: 'PIN KIWN', flutes: 20, fdepth: .05 });
  for (let i = 0; i < 6; i++) {
    const m = mk(box(10.8 / 2 * .98, .42, 9 / 3 * .98), M.marmo2);
    m.position.set(-10.8 / 4 + (i % 2) * 10.8 / 2, top + 5.6 + .21, -9 / 3 + Math.floor(i / 2) * 9 / 3);
    addPiece('prop', m, COST.roof, mark('STEGH P'), 'copertura della Pinacoteca', 9, nw);
  }

  /* ala sud-ovest: interrotta dalla guerra del Peloponneso.
     I blocchi conservano le bugne di sollevamento, mai asportate:
     e cosi che si riconosce un cantiere greco fermato a meta. */
  const sw = new THREE.Group(); sw.position.set(-15.2, 0, 9.2); g.add(sw);
  for (let i = 0; i < 6; i++) {
    const m = mk(box(9 / 3 * .98, .5, 7 / 2 * .98), M.calcare);
    m.position.set(-9 / 3 + (i % 3) * 9 / 3, top + .25, -7 / 4 + Math.floor(i / 3) * 7 / 2);
    addPiece('prop', m, COST.foundation, mark('QEMELION'), 'fondazione dell ala sud, mai rialzata', 7, sw);
  }
  for (let c = 0; c < 2; c++) for (let i = 0; i < 5; i++) {
    const grp = new THREE.Group();
    grp.add(mk(box(9 / 5 * .98, .72, 1), M.grezzo));
    const bo = mk(box(.34, .2, .28), M.grezzo); bo.position.set(0, 0, .62); grp.add(bo);
    grp.position.set(-4.5 + 9 / 5 * (i + .5), top + .86 + c * .72, -3.2);
    addPiece('prop', grp, COST.rough, mark('ATELHS'), 'blocco grezzo - bugna non asportata', 7, sw);
  }
}

/* ══════════ TEMPIO DI ATENA NIKE - 427-424 a.C. ══════════ */
function nike(scene) {
  const g = siteGroup(scene, 'nike');
  const { bastionH: BH, bastionW: BW, bastionL: BL } = NK;
  for (let c = 0; c < 6; c++) for (let i = 0; i < 6; i++) {
    const s = 1 - c * .012;   // le assise rientrano leggermente salendo
    const m = mk(box(BW / 3 * .99 * s, BH / 6, BL / 2 * .99 * s), c % 2 ? M.calcare : M.marmo3);
    m.position.set(-BW / 2 + BW / 3 * (i % 3 + .5), BH / 6 * (c + .5),
                   -BL / 2 + BL / 2 * (Math.floor(i / 3) + .5));
    addPiece('nike', m, COST.bastion, mark('PYRGOS'), `bastione - corso ${c + 1}`, 9, g);
  }
  const top = krepis({ g, w: NK.w, l: NK.l, steps: 3, sh: .28, inset: .34, y0: BH,
    phase: 'nike', tag: 'KRHPIS N', slices: 4 });
  [1, -1].forEach(side => {
    const p = [];
    for (let i = 0; i < 4; i++) p.push([-1.85 + 3.7 * i / 3, side * 3.3]);
    colonnade({ g, pos: p, y0: top, h: NK.colH, rb: NK.rBot, rt: NK.rTop, drums: 6,
      order: 'ionic', phase: 'nike', tag: side > 0 ? 'ANAT NIK' : 'DYT NIK',
      flutes: 24, fdepth: .06 });
  });
  walls({ g, w: 4.2, l: 3.9, h: 3.5, courses: 5, th: .44, y0: top, phase: 'nike', tag: 'SHKOS N' });
  const et = entablature({ g, w: NK.w, l: NK.l, depth: .62, y0: top + NK.colH,
    archH: .44, frzH: .45, geiH: .24, doric: false, phase: 'nike', nx: 4, nz: 6 });
  gable({ g, w: NK.w, l: NK.l, y0: et, pedH: 1.05, depth: .42, phase: 'nike',
    figs: 0, slabs: 3, roofRows: 5 });
}

/* ══════════ ERETTEO - 421-406 a.C. ══════════ */
function erechtheion(scene) {
  const g = siteGroup(scene, 'erechtheion');
  const top = krepis({ g, w: ER.w, l: ER.l, steps: 3, sh: .34, inset: .4, y0: 0,
    phase: 'erech', tag: 'KRHPIS E', slices: 6 });
  walls({ g, w: ER.w, l: ER.l, h: ER.wallH, courses: 8, th: .9, y0: top,
    phase: 'erech', tag: 'TOIXOS E' });

  const pe = [];
  for (let i = 0; i < 6; i++) pe.push([-4.6 + 9.2 * i / 5, ER.l / 2 + 1.9]);
  colonnade({ g, pos: pe, y0: top, h: ER.eastColH, rb: .41, rt: .35, drums: 7,
    order: 'ionic', phase: 'erech', tag: 'ANAT ER', flutes: 24, fdepth: .06 });

  /* portico nord: 3,2 m piu in basso, colonne piu alte.
     I dislivelli dell'Eretteo servono a non spostare i culti preesistenti. */
  const pn = new THREE.Group();
  pn.position.set(-ER.w / 2 - 3, ER.northFloorDrop, ER.l / 2 - 5.6);
  g.add(pn);
  for (let i = 0; i < 6; i++) {
    const m = mk(box(6.4 / 2 * .98, .4, 10.4 / 3 * .98), M.marmo2);
    m.position.set(-6.4 / 4 + (i % 2) * 6.4 / 2, .2, -10.4 / 3 + Math.floor(i / 2) * 10.4 / 3);
    addPiece('erech', m, COST.wall, mark('DAPEDON'), 'pavimento del portico nord', 7, pn);
  }
  const pnp = [];
  for (let i = 0; i < 4; i++) pnp.push([-2.6 + 5.2 * i / 3, 4.4]);
  pnp.push([-2.6, .4], [2.6, .4]);
  colonnade({ g: pn, pos: pnp, y0: .4, h: ER.northColH, rb: .43, rt: .36, drums: 8,
    order: 'ionic', phase: 'erech', tag: 'BOR ER', flutes: 24, fdepth: .06 });
  const ent = entablature({ g: pn, w: 6.6, l: 10.6, depth: .72, y0: .4 + ER.northColH,
    archH: .56, frzH: .62, geiH: .28, doric: false, phase: 'erech', nx: 4, nz: 5 });
  for (let i = 0; i < 6; i++) {
    const m = mk(box(6.9 / 3 * .98, .3, 10.9 / 2 * .98), M.marmo2);
    m.position.set(-6.9 / 3 + (i % 3) * 6.9 / 3, ent + .15, -10.9 / 4 + Math.floor(i / 3) * 10.9 / 2);
    addPiece('erech', m, COST.roof, mark('STEGH B'), 'copertura del portico nord', 9, pn);
  }

  /* loggia delle Cariatidi */
  const kp = new THREE.Group(); kp.position.set(ER.w / 2 + 1.5, 0, ER.l / 2 - 7.4); g.add(kp);
  for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) {
    const m = mk(box(3.6 / 3 * .98, 1.78 / 3, 5.4 * .98), c % 2 ? M.marmo : M.marmo2);
    m.position.set(-3.6 / 3 + i * 3.6 / 3, top + 1.78 / 3 * (c + .5), 0);
    addPiece('erech', m, COST.wall, mark('QRIGKOS'), `parapetto della loggia - corso ${c + 1}`, 7, kp);
  }
  const KY = top + 1.78;
  [[-1.35, -1.75], [0, -1.75], [1.35, -1.75], [-1.35, 1.75], [0, 1.75], [1.35, 1.75]]
    .forEach((p, i) => {
      const k = caryatid(ER.caryatidH);
      k.position.set(p[0], KY, p[1]);
      k.rotation.y = p[1] < 0 ? PI : 0;
      addPiece('erech', k, COST.caryatid, `KORH-${String(i + 1).padStart(2, '0')}`,
        `cariatide ${i + 1} di ${ER.caryatids}`, 9, kp);
    });
  for (let i = 0; i < 4; i++) {
    const m = mk(box(3.9 / 2 * .98, .72, 5.9 / 2 * .98), M.marmo);
    m.position.set(-3.9 / 4 + (i % 2) * 3.9 / 2, KY + ER.caryatidH + .36,
                   -5.9 / 4 + Math.floor(i / 2) * 5.9 / 2);
    addPiece('erech', m, COST.capital, mark('OROFH K'), 'soffitto della loggia', 9, kp);
  }

  /* il fregio dell Eretteo non era dipinto: lastre di calcare grigio di
     Eleusi con le figure di marmo bianco fissate sopra a parte */
  const et = entablature({ g, w: ER.w, l: ER.l, depth: .86, y0: top + ER.wallH,
    archH: .62, frzH: .68, geiH: .3, doric: false, phase: 'erech', nx: 4, nz: 8,
    friezeMat: M.eleusi });
  gable({ g, w: ER.w, l: ER.l, y0: et, pedH: 2.2, depth: .66, phase: 'erech',
    figs: 0, slabs: 4, roofRows: 7 });
}

/* L'ordine di chiamata determina l'ordine di posa: e la cronologia reale.
   Gli edifici sono meta del recinto; l'altra meta e la strada, l'altare,
   i due santuari del lato sud, le offerte votive e il verde. */
export function buildAll(scene) {
  outcrops(scene);      // la roccia c'era gia: non e un pezzo e non si paga
  plantings(scene);     // 479 - l'ulivo di Atena ributta dal ceppo bruciato
  northWall(scene);     // 465 - i rocchi del Partenone arcaico nel muro nord
  sacredWay(scene);     // 460 - la via Panatenaica
  promachos(scene);     // 456
  parthenon(scene);     // 447-432
  greatAltar(scene);    // 440 - l'altare di Atena Polias
  propylaea(scene);     // 437-432
  sanctuaries(scene);   // 430-425 - Brauronion e Calcoteca
  nike(scene);          // 427-424
  erechtheion(scene);   // 421-406
  votives(scene);       // continuo - gli anathemata
}
