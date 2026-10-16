/* L'Acropoli come mondo: quello che la rende se stessa. Il resto - cielo,
   luce, camera, credito, posa - e del motore, in engine/scene.js. */

import { startWorld } from '/engine/scene.js';
import { SITE, FOCUS, PHASES } from './config.js';
import { buildTerrain } from './terrain.js';
import { buildAll } from './buildings.js';

const meta = await (await fetch(new URL('../world.json', import.meta.url))).json();

/* ─────────── INNESTO: sculture fotogrammetrate ───────────
   Togli i commenti dopo aver messo i GLB in assets/models/.
   Il resto del sistema - costi, marche, animazione, fusione -
   continua a funzionare senza modifiche. Va fatto prima di startWorld,
   perche le sculture nascono mentre il mondo si costruisce.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { setSculptureProvider } from './kit.js';

const loader = new GLTFLoader();
const bank = {};
for (const [pose, file] of Object.entries({
  standing:  'kore_standing.glb',
  seated:    'demeter_seated.glb',
  reclining: 'dionysos_reclining.glb',
  caryatid:  'karyatid.glb'
})) {
  try { bank[pose] = (await loader.loadAsync(`/assets/models/${file}`)).scene; }
  catch (e) { console.warn('modello mancante:', file); }
}
setSculptureProvider((pose, h) => {
  const src = bank[pose];
  if (!src) return null;
  const o = src.clone(true);
  const bb = new THREE.Box3().setFromObject(o);
  o.scale.setScalar(h / (bb.max.y - bb.min.y));   // normalizza all'altezza richiesta
  return o;
});
*/

const world = await startWorld({
  meta,
  build(scene) {
    buildTerrain(scene);
    buildAll(scene);
  },
  phases: PHASES,
  completion: { mark: 'TELOS', text: 'Il programma di Pericle è compiuto - 406 a.C.' },
  view: { az: .62, pol: 1.19, dist: 210, target: [-60, 10, 0] },
  sun: {
    center: [-70, 0, 0],
    shadow: { left: -190, right: 110, top: 120, bottom: -120, near: 60, far: 640 }
  },
  fog: 0x9AA8AE,
  hour: 8.4,
  // l'immagine della scheda nella pagina iniziale: il recinto intero, a luce calda
  snapshot: { hour: 16.4, view: { az: .62, pol: .98, dist: 205, target: [-60, 4, 6] } },
  // "vola al cantiere": il monumento della fase in corso, o il Partenone
  focus(phase) {
    const k = FOCUS[phase || 'p-krepis'];
    const s = SITE[k] || SITE.parthenon;
    return { x: s.x, z: s.z, dist: k === 'nike' ? 46 : k === 'promachos' ? 52 : 96 };
  },
  // le versioni di prima, quando l'Acropoli era l'unico mondo
  legacy: {
    hourKeys: ['acropoli:ora', 'acropoli:stato'],
    dropKeys: ['acropoli:credito-te', 'acropoli:credito', 'acropoli:dev-credito']
  }
});

/* ─────────── INNESTO: HDRI ───────────
   await world.sky.useHDRI('/assets/hdri/athens_morning_4k.hdr');
*/
