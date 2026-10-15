import * as THREE from 'three';
import { M } from './materials.js';
import { ORN, faceStrip, strip } from './ornaments.js';
import { COST, FLUTE_SEGMENTS, POLYCHROMY as PC } from './config.js';
import { addPiece, mark } from '/engine/pieces.js';

const PI = Math.PI;

/* ---------- cache delle geometrie ----------
   Gli undici rocchi del Partenone sono undici geometrie, non 506:
   tutte le 46 colonne condividono le stesse istanze. */
const cache = new Map();
export function G(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }
export const box = (w, h, d) => G(`b${w.toFixed(3)}${h.toFixed(3)}${d.toFixed(3)}`, () => new THREE.BoxGeometry(w, h, d));
export function mk(g, m) { const o = new THREE.Mesh(g, m); o.castShadow = o.receiveShadow = true; return o; }

const YAXIS = new THREE.Vector3(0, 1, 0);

/* ---------- curvatura dello stilobate ----------
   Il piano su cui poggia il tempio non e orizzontale: si inarca verso
   l alto, di piu sui lati lunghi. La superficie e la somma di due archi,
   uno per asse: massima al centro, nulla agli angoli, dove i due
   contributi si annullano insieme.
   `front` e l innalzamento a meta delle fronti, `flank` a meta dei fianchi. */
export function makeCurve({ w, l, front = 0, flank = 0 }) {
  if (!front && !flank) return null;
  const f = (x, z) => {
    const u = Math.min(1, Math.abs(2 * x / w)), v = Math.min(1, Math.abs(2 * z / l));
    return front * (1 - u * u) + flank * (1 - v * v);
  };
  /* pendenza locale: serve a inclinare ogni blocco invece di lasciarlo
     orizzontale su un piano che non lo e piu. */
  f.slope = (x, z) => [
    Math.abs(2 * x / w) > 1 ? 0 : -8 * front * x / (w * w),
    Math.abs(2 * z / l) > 1 ? 0 : -8 * flank * z / (l * l)
  ];
  return f;
}

const rise = (curve, x, z) => curve ? curve(x, z) : 0;

function tiltToSlope(obj, curve, x, z) {
  if (!curve) return;
  const [sx, sz] = curve.slope(x, z);
  obj.rotation.z += sx;
  obj.rotation.x -= sz;
}

/* Assi delle colonne su un lato. Con `contract` > 0 i due intercolumni
   d angolo sono piu stretti degli altri: e la contrazione angolare, che
   serve a far cadere il triglifo sullo spigolo della trabeazione senza
   lasciare la metopa d angolo mutila. Le colonne d angolo restano ferme,
   sono quelle interne a spostarsi verso l esterno. */
export function axisPositions(span, n, contract = 0) {
  const gaps = n - 1;
  if (!contract || gaps < 3)
    return Array.from({ length: n }, (_, i) => -span / 2 + span * i / gaps);
  const g = (span + 2 * contract) / gaps;
  const out = [-span / 2];
  for (let i = 1; i < n; i++)
    out.push(out[i - 1] + (i === 1 || i === gaps ? g - contract : g));
  return out;
}

/* ---------- fusto scanalato ----------
   Le scanalature sono scavate nei vertici deformando il cilindro
   radialmente, non simulate con una normal map. */
export function fluted(rb, rt, h, n, depth, seg) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg || FLUTE_SEGMENTS, 1, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const f = 1 - depth * (.5 + .5 * Math.cos(n * Math.atan2(z, x)));
    p.setX(i, x * f); p.setZ(i, z * f);
  }
  g.computeVertexNormals();
  return g;
}

/* Stessa deformazione applicata a un profilo di rivoluzione:
   diventa il panneggio del chitone. */
export function drapedLathe(pts, folds, depth) {
  const g = new THREE.LatheGeometry(pts, 26);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < 1e-4) continue;
    const f = 1 - depth * (.5 + .5 * Math.cos(folds * Math.atan2(z, x)));
    p.setX(i, x * f); p.setZ(i, z * f);
  }
  g.computeVertexNormals();
  return g;
}

/* ---------- capitelli ---------- */
export function doricCapital(r) {
  const g = new THREE.Group(), k = r.toFixed(2);
  /* gli anuli sotto l echino portavano una fascia di minio */
  const a = mk(G('dan' + k, () => new THREE.CylinderGeometry(r * 1.04, r * 1.04, .11, 26)), PC.on ? M.minio : M.marmo); a.position.y = .055;
  const e = mk(G('dec' + k, () => new THREE.CylinderGeometry(r * 1.44, r * 1.02, r * .60, 32)), M.marmo); e.position.y = .11 + r * .30;
  const b = mk(box(r * 2.96, r * .49, r * 2.96), M.marmo2); b.position.y = .11 + r * .60 + r * .245;
  g.add(a, e, b);
  g.userData.h = .11 + r * .60 + r * .49;
  return g;
}
export function ionicBase(r) {
  const g = new THREE.Group(), k = r.toFixed(2);
  const pl = mk(box(r * 2.5, r * .18, r * 2.5), M.marmo2); pl.position.y = r * .09;
  const t1 = mk(G('it1' + k, () => new THREE.CylinderGeometry(r * 1.22, r * 1.16, r * .20, 26)), M.marmo); t1.position.y = r * .28;
  const sc = mk(G('isc' + k, () => new THREE.CylinderGeometry(r * 1.10, r * 1.10, r * .20, 26)), M.marmo3); sc.position.y = r * .48;
  const t2 = mk(G('it2' + k, () => new THREE.CylinderGeometry(r * 1.06, r * 1.18, r * .18, 26)), M.marmo); t2.position.y = r * .67;
  g.add(pl, t1, sc, t2);
  g.userData.h = r * .76;
  return g;
}
export function ionicCapital(r) {
  const g = new THREE.Group(), k = r.toFixed(2);
  /* l'echino porta l'ovolo dipinto, che gli gira attorno */
  const e = mk(G('iec' + k, () => new THREE.CylinderGeometry(r * 1.12, r, r * .26, 26)), PC.on ? ORN.echinus : M.marmo); e.position.y = r * .13;
  const cu = mk(box(r * 2.5, r * .30, r * 1.5), M.marmo); cu.position.y = r * .42;
  [-1, 1].forEach(s => {
    const v = mk(G('ivo' + k, () => new THREE.TorusGeometry(r * .44, r * .17, 8, 18)), M.marmo);
    v.rotation.y = PI / 2; v.position.set(s * r, r * .42, 0); g.add(v);
  });
  const ab = mk(box(r * 2.66, r * .20, r * 1.9), M.marmo2); ab.position.y = r * .68;
  g.add(e, cu, ab);
  g.userData.h = r * .78;
  return g;
}

/* ---------- scultura ----------
   INNESTO: registra un provider per sostituire queste figure procedurali
   con i modelli fotogrammetrati del Museo dell'Acropoli.
   Se il provider restituisce null si ricade sulla generazione locale. */
let sculptureProvider = null;
export function setSculptureProvider(fn) { sculptureProvider = fn; }

export function statue(h, pose, cloth, skin, context) {
  if (sculptureProvider) {
    const custom = sculptureProvider(pose, h, context || {});
    if (custom) {
      custom.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
      return custom;
    }
  }
  const g = new THREE.Group();
  const prof = [[.170, 0], [.180, .06], [.155, .22], [.128, .42],
                [.118, .56], [.132, .66], [.126, .74], [.088, .79]];
  const P = prof.map(q => new THREE.Vector2(q[0] * h, q[1] * h));
  const body = mk(G('st' + h.toFixed(2), () => drapedLathe(P, 22, .055)), cloth);
  const neck = mk(G('sn' + h.toFixed(2), () => new THREE.CylinderGeometry(h * .036, h * .046, h * .06, 10)), skin); neck.position.y = h * .80;
  const head = mk(G('sh' + h.toFixed(2), () => new THREE.SphereGeometry(h * .076, 14, 10)), skin); head.position.y = h * .855;
  g.add(body, neck, head);

  const armG = G('sa' + h.toFixed(2), () => new THREE.CylinderGeometry(h * .031, h * .036, h * .40, 10));
  const a1 = mk(armG, skin); a1.position.set(h * .135, h * .60, h * .02); a1.rotation.z = .38;
  const a2 = mk(armG, skin); a2.position.set(-h * .135, h * .60, h * .02); a2.rotation.z = -.55; a2.rotation.x = .3;
  g.add(a1, a2);

  if (pose === 'seated') {
    const th = mk(G('sth' + h.toFixed(2), () => new THREE.CylinderGeometry(h * .10, h * .11, h * .42, 12)), cloth);
    th.rotation.x = PI / 2; th.position.set(0, h * .20, h * .20); g.add(th);
    g.scale.set(1, .72, 1); g.position.y = -h * .02;
  } else if (pose === 'reclining') {
    g.rotation.z = -1.18; g.rotation.y = .3;
    const sup = mk(G('ssu' + h.toFixed(2), () => new THREE.CylinderGeometry(h * .055, h * .055, h * .36, 10)), skin);
    sup.position.set(h * .30, h * .10, 0); sup.rotation.z = .25; g.add(sup);
    g.position.y = h * .30;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}

export function caryatid(h) {
  if (sculptureProvider) {
    const c = sculptureProvider('caryatid', h, {});
    if (c) { c.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); return c; }
  }
  const g = new THREE.Group();
  const P = [[.150, 0], [.158, .05], [.140, .24], [.122, .45],
             [.114, .58], [.128, .68], [.120, .76], [.086, .81]]
    .map(q => new THREE.Vector2(q[0] * h, q[1] * h));
  const body = mk(G('cy' + h.toFixed(2), () => drapedLathe(P, 26, .075)), M.marmo);
  const hair = mk(G('cyr' + h.toFixed(2), () => new THREE.CylinderGeometry(h * .082, h * .070, h * .13, 14)), M.marmo2); hair.position.y = h * .845;
  const head = mk(G('cyh' + h.toFixed(2), () => new THREE.SphereGeometry(h * .072, 14, 10)), M.marmo); head.position.y = h * .865;
  const polos = mk(G('cyp' + h.toFixed(2), () => new THREE.CylinderGeometry(h * .115, h * .098, h * .10, 18)), M.marmo2); polos.position.y = h * .955;
  const ab = mk(box(h * .26, h * .045, h * .26), M.marmo2); ab.position.y = h * 1.02;
  g.add(body, hair, head, polos, ab);
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}

/* ══════════════ KIT MODULARE ══════════════
   Le cinque funzioni con cui sono costruiti tutti i monumenti. */

/** Gradinata. Restituisce la quota nominale dello stilobate: chi ci
    costruisce sopra deve aggiungere da se la curvatura nel proprio punto,
    perche il piano vero non e orizzontale. Con `curve` conviene alzare
    `slicesX`, altrimenti un blocco largo quanto il tempio non puo seguire
    l arco trasversale. */
export function krepis({ g, w, l, steps, sh, inset, y0, phase, tag, cost, slices, slicesX, curve }) {
  const n = slices || 10, nx = slicesX || 1;
  for (let s = 0; s < steps; s++) {
    const off = (steps - 1 - s) * inset;
    const W = w + off * 2, L = l + off * 2, dz = L / n, dx = W / nx;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < nx; k++) {
        const cx = -W / 2 + dx * (k + .5), cz = -L / 2 + dz * (i + .5);
        const m = mk(box(dx * (nx > 1 ? .99 : 1), sh, dz * .985), s === steps - 1 ? M.marmo : M.calcare);
        m.position.set(cx, y0 + s * sh + sh / 2 + rise(curve, cx, cz), cz);
        tiltToSlope(m, curve, cx, cz);
        addPiece(phase, m, cost || COST.step, mark(tag),
          nx > 1 ? `gradino ${s + 1} - blocco ${i + 1}.${k + 1}` : `gradino ${s + 1} - blocco ${i + 1}`, 6, g);
      }
    }
  }
  return y0 + steps * sh;
}

/** Colonnato dorico o ionico su posizioni date.
    Ogni posizione e `[x, z]`, oppure `[x, z, opt]` con:
      corner  colonna d angolo, da ingrossare: stagliandosi contro il cielo
              invece che contro il muro della cella sembrerebbe piu magra
      leanX   -1, 0 o +1: verso in cui la colonna pende lungo x
      leanZ   idem lungo z. Le colonne d angolo pendono in diagonale.

    `curve`   la superficie di posa, se non e orizzontale
    `incline` pendenza verso l interno, in radianti: e costante per faccia,
              non proporzionale alla distanza dal centro
    `cornerSwell` fattore di ingrossamento delle colonne d angolo */
export function colonnade({ g, pos, y0, h, rb, rt, drums, order, phase, tag,
                            flutes, fdepth, capRot, curve, incline, cornerSwell }) {
  const letters = 'abgdezhqiklmnxo';
  pos.forEach((p, n) => {
    const num = String(n + 1).padStart(2, '0');
    const px = p[0], pz = p[1], opt = p[2] || {};
    const sw = (opt.corner && cornerSwell) ? cornerSwell : 1;
    const RB = rb * sw, RT = rt * sw;
    const tx = (incline || 0) * (opt.leanX || 0), tz = (incline || 0) * (opt.leanZ || 0);
    const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-tz, 0, tx, 'XYZ'));
    const y00 = y0 + rise(curve, px, pz);

    /* Ogni pezzo resta un blocco indipendente, quindi l inclinazione va
       applicata pezzo per pezzo: la quota locale sposta il centro verso
       l interno, il quaternione lo ruota. Lo spin attorno all asse del
       fusto viene prima, cosi non trascina con se la pendenza. */
    const place = (o, yl, spin) => {
      o.position.set(px - tx * yl, y00 + yl, pz - tz * yl);
      o.quaternion.copy(tilt).multiply(new THREE.Quaternion().setFromAxisAngle(YAXIS, spin || 0));
    };

    let yl = 0, baseH = 0;
    if (order === 'ionic') {
      const b = ionicBase(RB); place(b, yl, 0);
      addPiece(phase, b, COST.ionicBase, `${tag} ${num}/BAS`, 'base ionica', 5, g);
      baseH = b.userData.h; yl += baseH;
    }
    const cap = order === 'ionic' ? ionicCapital(RT) : doricCapital(RT);
    const shaft = h - baseH - cap.userData.h, dh = shaft / drums;
    for (let d = 0; d < drums; d++) {
      const t0 = d / drums, t1 = (d + 1) / drums;
      /* entasi: interpolazione lineare piu un rigonfiamento sinusoidale */
      const ent = order === 'doric' ? .024 * sw : 0;
      const r0 = RB + (RT - RB) * t0 + ent * Math.sin(PI * t0);
      const r1 = RB + (RT - RB) * t1 + ent * Math.sin(PI * t1);
      const key = `${tag}${order}${drums}${d}${RB.toFixed(3)}${RT.toFixed(3)}${dh.toFixed(3)}`;
      const m = mk(G(key, () => fluted(r0, r1, dh, flutes || 20, fdepth || .05)), d % 2 ? M.marmo : M.marmo2);
      place(m, yl + dh * (d + .5), n * .31 + d * .19);
      addPiece(phase, m, COST.drum, `${tag} ${num}/${letters[d % 15]}`,
        opt.corner ? `rocchio ${d + 1} di ${drums} - colonna d angolo` : `rocchio ${d + 1} di ${drums}`, 5, g);
    }
    place(cap, yl + shaft, capRot || 0);
    addPiece(phase, cap, COST.capital, `${tag} ${num}/KEF`,
      order === 'ionic' ? 'capitello ionico' : 'capitello dorico', 5, g);
  });
}

/** Anelli della trabeazione. Restituisce la quota del piano del geison. */
export function entablature({ g, w, l, depth, y0, archH, frzH, geiH, doric, phase, nx, nz, tx, tz, curve, friezeMat }) {
  const runs = [
    { ax:'x', len:w,             cx:0,                cz: l/2 - depth/2 },
    { ax:'x', len:w,             cx:0,                cz:-l/2 + depth/2 },
    { ax:'z', len:l - depth*2,   cx: w/2 - depth/2,   cz:0 },
    { ax:'z', len:l - depth*2,   cx:-w/2 + depth/2,   cz:0 }
  ];
  runs.forEach(r => {
    const n = r.ax === 'x' ? (nx || 5) : (nz || 10), seg = r.len / n;
    for (let i = 0; i < n; i++) {
      const grp = new THREE.Group();
      grp.add(mk(box(r.ax === 'x' ? seg * .995 : depth, archH, r.ax === 'x' ? depth : seg * .995), M.marmo));
      if (doric) {
        const t = mk(box(r.ax === 'x' ? seg * .995 : depth + .07, .11, r.ax === 'x' ? depth + .07 : seg * .995), M.minio);
        t.position.y = archH / 2 + .055; grp.add(t);
      }
      if (!doric && PC.on) {
        /* il coronamento dell'architrave ionico: l'ovolo, sulla faccia esterna */
        const oh = archH * .2;
        faceStrip(grp, r.ax, Math.sign(r.ax === 'x' ? r.cz : r.cx), depth / 2,
                  seg * .995, oh, archH / 2 - oh / 2, ORN.ovoli, oh);
      }
      const off = -r.len / 2 + seg * (i + .5);
      const ax = r.ax === 'x' ? off : r.cx, az = r.ax === 'x' ? r.cz : off;
      grp.position.set(ax, y0 + archH / 2 + rise(curve, ax, az), az);
      tiltToSlope(grp, curve, ax, az);
      addPiece(phase, grp, COST.architrave, mark('EPISTYL'), 'architrave', 7, g);
    }
  });

  const fy = y0 + archH;
  if (doric) {
    const TW = depth * .545;
    runs.forEach(r => {
      const nT = r.ax === 'x' ? (tx || 9) : (tz || 21), nM = nT - 1;
      const MW = (r.len - nT * TW) / nM;
      let cur = -r.len / 2;
      for (let i = 0; i < nT + nM; i++) {
        const isT = i % 2 === 0, w2 = isT ? TW : MW, c = cur + w2 / 2;
        let m;
        if (isT) {
          m = mk(box(r.ax === 'x' ? w2 * .99 : depth, frzH, r.ax === 'x' ? depth : w2 * .99), M.blu);
        } else {
          /* la metopa e arretrata rispetto alla faccia dei triglifi e il
             suo fondo e rosso: le figure scolpite, lasciate in marmo,
             si staccano dal fondo invece di annegarci. */
          m = new THREE.Group();
          const dd = depth * .90, ax = r.ax === 'x';
          m.add(mk(box(ax ? w2 * .99 : dd, frzH, ax ? dd : w2 * .99), M.marmo));
          if (PC.on) {
            const sg = Math.sign(ax ? r.cz : r.cx), t = .05, off = dd / 2 + t / 2;
            const fondo = mk(box(ax ? w2 * .86 : t, frzH * .86, ax ? t : w2 * .86), M.rosso);
            fondo.position.set(ax ? 0 : sg * off, 0, ax ? sg * off : 0);
            m.add(fondo);
          }
        }
        const fx = r.ax === 'x' ? c : r.cx, fz = r.ax === 'x' ? r.cz : c;
        m.position.set(fx, fy + frzH / 2 + rise(curve, fx, fz), fz);
        tiltToSlope(m, curve, fx, fz);
        addPiece(phase, m, isT ? COST.triglyph : COST.metope,
          isT ? mark('TRIGLYF') : mark('METOPH'),
          isT ? 'triglifo - blu egizio' : 'metopa scolpita', 7, g);
        cur += w2;
      }
    });
  } else {
    runs.forEach(r => {
      const n = r.ax === 'x' ? (nx || 5) : (nz || 10), seg = r.len / n;
      for (let i = 0; i < n; i++) {
        const off = -r.len / 2 + seg * (i + .5);
        const m = mk(box(r.ax === 'x' ? seg * .995 : depth * .94, frzH, r.ax === 'x' ? depth * .94 : seg * .995),
                     (PC.on && friezeMat) ? friezeMat : M.marmo);
        const fx = r.ax === 'x' ? off : r.cx, fz = r.ax === 'x' ? r.cz : off;
        m.position.set(fx, fy + frzH / 2 + rise(curve, fx, fz), fz);
        tiltToSlope(m, curve, fx, fz);
        addPiece(phase, m, COST.ionicFrieze, mark('ZWFOROS'), 'fregio continuo ionico', 7, g);
      }
    });
  }

  const gy = fy + frzH, D = depth * 1.4;
  runs.forEach(r => {
    const n = r.ax === 'x' ? (nx || 5) : (nz || 10), seg = r.len / n;
    for (let i = 0; i < n; i++) {
      const off = -r.len / 2 + seg * (i + .5);
      const bw = r.ax === 'x' ? seg * .995 : D, bd = r.ax === 'x' ? D : seg * .995;
      let m = mk(box(bw, geiH, bd), M.marmo2);
      if (PC.on) {
        /* il soffitto del geison, l unica superficie dipinta che si vede
           camminando sotto il colonnato */
        const grp = new THREE.Group(); grp.add(m);
        const sof = mk(box(bw * .88, .05, bd * .88), M.blu);
        sof.position.y = -geiH / 2 - .025; grp.add(sof);
        /* sulla fronte: in alto la foglia d'acqua, sotto il meandro */
        const sg = Math.sign(r.ax === 'x' ? r.cz : r.cx), len = r.ax === 'x' ? bw : bd;
        const kh = geiH * .36, mh = geiH * .40;
        faceStrip(grp, r.ax, sg, D / 2, len, kh, geiH / 2 - kh / 2, ORN.kyma, kh * 1.3);
        faceStrip(grp, r.ax, sg, D / 2, len, mh, -geiH / 2 + geiH * .1 + mh / 2, ORN.meander, mh);
        m = grp;
      }
      const px = r.ax === 'z' ? Math.sign(r.cx) * depth * .2 : 0;
      const pz = r.ax === 'x' ? Math.sign(r.cz) * depth * .2 : 0;
      const gx = r.ax === 'x' ? off : r.cx + px, gz = r.ax === 'x' ? r.cz + pz : off;
      m.position.set(gx, gy + geiH / 2 + rise(curve, gx, gz), gz);
      tiltToSlope(m, curve, gx, gz);
      addPiece(phase, m, COST.geison, mark('GEISON'), 'geison', 7, g);
    }
  });
  return gy + geiH;
}

/** Muri a corsi alternati. */
export function walls({ g, w, l, h, courses, th, y0, phase, tag, mat, cost, curve }) {
  const ch = h / courses;
  for (let c = 0; c < courses; c++) {
    const y = y0 + ch * (c + .5);
    [{ w, d: th, x: 0, z: l / 2 - th / 2, n: 2 },
     { w, d: th, x: 0, z: -l / 2 + th / 2, n: 2 },
     { w: th, d: l - th * 2, x: w / 2 - th / 2, z: 0, n: 3 },
     { w: th, d: l - th * 2, x: -w / 2 + th / 2, z: 0, n: 3 }].forEach(r => {
      for (let i = 0; i < r.n; i++) {
        const long = r.w > r.d, seg = long ? r.w / r.n : r.d / r.n;
        const m = mk(box(long ? seg * .99 : r.w, ch * .985, long ? r.d : seg * .99),
                     mat || (c % 2 ? M.marmo : M.marmo2));
        const wx = long ? r.x - r.w / 2 + seg * (i + .5) : r.x;
        const wz = long ? r.z : r.z - r.d / 2 + seg * (i + .5);
        m.position.set(wx, y + rise(curve, wx, wz), wz);
        tiltToSlope(m, curve, wx, wz);
        addPiece(phase, m, cost || COST.wall, mark(tag), `muro - corso ${c + 1}`, 6, g);
      }
    });
  }
  return y0 + h;
}

/** Frontoni e falde. Le pose seguono la composizione reale:
    stanti al centro, sedute a meta pendenza, distese negli angoli. */
export function gable({ g, w, l, y0, pedH, depth, phase, figs, slabs, roofRows, curve }) {
  const N = slabs || 4, D = depth || .9;
  const poses = ['reclining', 'seated', 'standing', 'standing', 'seated', 'reclining'];

  [1, -1].forEach(side => {
    const z = side * (l / 2 - D / 2), face = side > 0 ? 'est' : 'ovest';
    for (let i = 0; i < N; i++) {
      const x0 = -w / 2 + w * i / N, x1 = -w / 2 + w * (i + 1) / N;
      const hf = x => Math.max(.03, pedH * (1 - Math.abs(x) / (w / 2)));
      const sh = new THREE.Shape();
      sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.lineTo(x1, hf(x1)); sh.lineTo(x0, hf(x0)); sh.closePath();
      /* il fondo del timpano era blu: e cosi che le figure, lasciate
         in marmo, si leggono da terra a venti metri di altezza */
      const m = mk(new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false }), PC.on ? M.blu : M.marmo);
      /* la lastra porta le x nella geometria: la quota va presa al suo centro */
      m.position.set(0, y0 + rise(curve, (x0 + x1) / 2, z), z - D / 2);
      addPiece(phase, m, COST.tympanum, mark('AETWMA'), `timpano ${face} - lastra ${i + 1}`, 9, g);
    }
    [1, -1].forEach(s2 => {
      const len = Math.hypot(w / 2, pedH);
      const m = mk(box(len, pedH * .13, D * 1.5), M.marmo2);
      m.position.set(s2 * w / 4, y0 + pedH / 2 + rise(curve, s2 * w / 4, z), z - D / 2 + D * .2);
      m.rotation.z = -s2 * Math.atan2(pedH, w / 2);
      if (PC.on) {
        const kh = pedH * .13 * .55;
        faceStrip(m, 'x', side, D * .75, len, kh, pedH * .13 / 2 - kh / 2, ORN.kyma, kh * 1.3);
      }
      addPiece(phase, m, COST.rakingCornice, mark('GEISON L'), 'cornice rampante', 9, g);
    });
    for (let i = 0; i < (figs || 0); i++) {
      const t = (i + .5) / figs, x = (t - .5) * w * .88;
      const room = pedH * (1 - Math.abs(x) / (w / 2));
      const pose = poses[Math.round(t * (poses.length - 1))];
      const fh = Math.max(1.1, Math.min(room * .92, pedH * .78));
      const f = statue(pose === 'reclining' ? fh * 1.5 : fh, pose, M.marmo, M.marmo2,
                       { pediment: face, index: i });
      f.position.set(x, y0 + pedH * .06 + rise(curve, x, z), z - D / 2);
      f.rotation.y += side > 0 ? 0 : PI;
      const label = pose === 'reclining' ? 'distesa' : pose === 'seated' ? 'seduta' : 'stante';
      addPiece(phase, f, COST.sculpture, mark('AGALMA'),
        `frontone ${face} - figura ${i + 1} (${label})`, 10, g);
    }
  });

  const eaveX = w / 2 + w * .03, ridgeY = y0 + pedH, slope = Math.atan2(pedH, eaveX);
  const runLen = Math.hypot(eaveX, pedH), rows = roofRows || 8, rl = l * 1.02;
  [1, -1].forEach(side => {
    for (let i = 0; i < rows; i++) {
      const t = (i + .5) / rows;
      const rw = runLen / rows * .99, rh = Math.max(.16, pedH * .06);
      const m = new THREE.Group();
      const tiles = mk(box(rw, rh, rl), M.marmo2);
      /* la fila scende verso la gronda: dal lato +x l'asse locale deve
         puntare in basso e in fuori, quindi la rotazione e -side. Con +side,
         come prima, ogni fila pendeva al contrario e il tetto sembrava una
         serie di listelli con le fessure in mezzo. */
      tiles.rotation.z = -side * slope;
      m.add(tiles);
      if (i === 0 && PC.on) {
        /* le antefisse: una palmetta in testa a ogni fila di coppi, lungo la gronda */
        const ah = Math.max(.35, pedH * .1);
        const a = strip(rl, ah, ORN.palmette, ah * .9);
        a.position.set(side * Math.cos(slope) * rw / 2, -Math.sin(slope) * rw / 2 + ah * .42, 0);
        a.rotation.y = side * PI / 2;
        m.add(a);
      }
      /* la falda e rigida e non puo inarcarsi lungo i 69 m del fianco:
         la si alza del massimo, l aggetto delle tegole copre lo scarto */
      const rx = side * eaveX * (1 - t);
      m.position.set(rx, y0 + pedH * t + rise(curve, rx, 0), 0);
      addPiece(phase, m, COST.roof, mark('KERAMOS'), `fila di tegole ${i + 1}`, 11, g);
    }
  });
  const rid = mk(box(w * .05, pedH * .11, rl * .99), M.marmo);
  rid.position.set(0, ridgeY + pedH * .03 + rise(curve, 0, 0), 0);
  if (PC.on) {
    /* gli acroteri: una grande palmetta in cima a ciascun frontone */
    const ac = pedH * .55;
    [1, -1].forEach(e => {
      const a = strip(ac, ac, ORN.palmette, ac);
      a.position.set(0, ac / 2, e * rl * .495);
      a.rotation.y = e > 0 ? 0 : PI;
      rid.add(a);
    });
  }
  addPiece(phase, rid, COST.roof, mark('KORYFH'), 'colmo', 11, g);
}
