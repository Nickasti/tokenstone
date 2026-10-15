import * as THREE from 'three';
import { PLATEAU, PADS, ROCK_STEP } from './config.js';
import { M } from './materials.js';

const PI = Math.PI;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/* Il ciglio del pianoro non e un'ellisse: e un'ellisse perturbata da
   quattro armoniche, che e il modo piu economico di ottenere un profilo
   irregolare ma controllabile. */
export function rimShape(a) {
  return 1 + .062 * Math.sin(a * 3 + .7) + .046 * Math.sin(a * 5 - 1.2)
           + .028 * Math.sin(a * 8 + 2.1) + .019 * Math.sin(a * 13 - .4);
}

/* Quota del coronamento delle mura di cinta. Sta qui perche la usano in
   due: l'estrusione delle mura e i rocchi murati nel lato nord, che
   devono cadere nella faccia del muro e non a mezz'aria sopra il pendio. */
export function wallTop(x, z) {
  return .9 + Math.sin(x * .09) * .32 + Math.sin(z * .13) * .24;
}

/* Il pianoro com'e in natura, prima che qualcuno ci costruisca sopra. */
function naturalH(x, z) {
  const dx = (x - PLATEAU.cx) / PLATEAU.a, dz = (z - PLATEAU.cz) / PLATEAU.b;
  const ang = Math.atan2(dz, dx);
  const r = Math.hypot(dx, dz) / rimShape(ang);
  const top = 1 - smoothstep(.93, 1.0, r);
  const undul = Math.sin(x * .048) * Math.cos(z * .061) * .75 + Math.sin(x * .11 + z * .08) * .35;
  const cliff = Math.sin(ang * 19) * 1.5 + Math.sin(ang * 37 + 1.3) * .85 + Math.sin(ang * 61) * .4;
  const drop = -58 * Math.pow(Math.max(0, r - .96), 1.28) - 26 * Math.pow(Math.max(0, r - 1.55), 1.1);
  return top * undul + drop + (1 - top) * cliff * Math.min(1, (r - .9) * 4);
}

/* La quota di ogni piano spianato: quella data, o il terreno al centro. */
const LEVELS = PADS.map(p => p.quota ?? naturalH(p.x, p.z));

/* Il terreno vero: il pianoro naturale, spianato sotto gli edifici (PADS in
   config.js). Lo usano la mesh del terreno e tutto cio che si posa al suolo,
   cosi strada, votivi e alberi seguono gli stessi piani. */
export function terrainH(x, z) {
  let h = naturalH(x, z);
  PADS.forEach((p, i) => {
    const ox = Math.max(0, Math.abs(x - p.x) - p.hx), oz = Math.max(0, Math.abs(z - p.z) - p.hz);
    const w = 1 - smoothstep(0, p.blend, Math.hypot(ox, oz));
    if (w > 0) h += (LEVELS[i] - h) * w;
  });
  return h;
}

export function buildTerrain(scene) {
  const S = 760, N = 200;
  const g = new THREE.PlaneGeometry(S, S, N, N);
  g.rotateX(-PI / 2);
  g.translate(PLATEAU.cx, 0, PLATEAU.cz);

  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const cTop = new THREE.Color(0x8C8168), cRock = new THREE.Color(0x6B6252),
        cDeep = new THREE.Color(0x4E4A42), cFar = new THREE.Color(0x5E6656);
  const c = new THREE.Color();

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const y = terrainH(x, z);
    p.setY(i, y);
    c.copy(cTop).lerp(cRock, smoothstep(-2, -26, y)).lerp(cDeep, smoothstep(-30, -62, y));
    c.lerp(cFar, smoothstep(150, 330, Math.hypot(x - PLATEAU.cx, z - PLATEAU.cz)) * .8);
    const n = .86 + .28 * Math.sin(x * .7) * Math.cos(z * .63);
    col[i * 3] = c.r * n; col[i * 3 + 1] = c.g * n; col[i * 3 + 2] = c.b * n;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();

  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0, flatShading: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);

  /* Il gradino di roccia a nord dell'Eretteo: la mesh del terreno ha maglie
     di quasi quattro metri e non sa fare un salto netto di tre, quindi la
     parete e un blocco a parte. Il terrazzo spianato sotto (PADS) la tocca
     al piede. */
  const { y0, y1, boxes } = ROCK_STEP;
  /* lo stesso colore del pianoro, non quello scuro delle rupi: e la stessa
     roccia, appena tagliata */
  const rock = new THREE.MeshStandardMaterial({ color: 0x8A7F66, roughness: 1, metalness: 0, flatShading: true });
  for (const [x0, x1, z0, z1] of boxes) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), rock);
    r.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    r.castShadow = r.receiveShadow = true;
    scene.add(r);
  }

  /* Mura di cinta lungo il ciglio, in un'unica geometria estrusa:
     il profilo del pianoro visto da Atene e fatto da queste, non dai templi. */
  const outer = [], inner = [];
  for (let i = 0; i < 180; i++) {
    const a = i / 180 * 2 * PI, r = rimShape(a);
    outer.push(new THREE.Vector2(PLATEAU.cx + Math.cos(a) * PLATEAU.a * r * .995,
                               -(PLATEAU.cz + Math.sin(a) * PLATEAU.b * r * .995)));
    inner.push(new THREE.Vector2(PLATEAU.cx + Math.cos(a) * PLATEAU.a * r * .955,
                               -(PLATEAU.cz + Math.sin(a) * PLATEAU.b * r * .955)));
  }
  const shape = new THREE.Shape(outer);
  shape.holes.push(new THREE.Path(inner.slice().reverse()));
  const wg = new THREE.ExtrudeGeometry(shape, { depth: 5.4, bevelEnabled: false });
  wg.rotateX(-PI / 2);
  const wp = wg.attributes.position;
  for (let i = 0; i < wp.count; i++) {
    const x = wp.getX(i), z = wp.getZ(i);
    wp.setY(i, wp.getY(i) < .01 ? -4.5 : wallTop(x, z));
  }
  wg.computeVertexNormals();
  const wall = new THREE.Mesh(wg, M.calcare);
  wall.castShadow = wall.receiveShadow = true;
  scene.add(wall);

  return { mesh, wall };
}
