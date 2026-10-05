import * as THREE from 'three';
import { M } from './materials.js';

/* Registro globale dei pezzi. Ogni blocco e un'entita indipendente
   con costo, marca da cantiere e fase storica. */

export const pieces = [];
let scene = null;
const counters = {};

export function initPieces(s) { scene = s; }

/* Le marche da cantiere non sono decorazione: gli scalpellini greci
   marcavano davvero i blocchi per l'assemblaggio. */
export function mark(prefix) {
  counters[prefix] = (counters[prefix] || 0) + 1;
  return `${prefix}-${String(counters[prefix]).padStart(2, '0')}`;
}

export function addPiece(phase, obj, cost, id, desc, drop, parent) {
  obj.visible = false;
  (parent || scene).add(obj);
  pieces.push({ phase, obj, cost, id, desc, y: obj.position.y, drop: drop || 7, parent: parent || scene });
}

/* I pezzi nascono con un peso relativo; qui diventano prezzi in TE, una volta
   sola e dopo che il registro e' completo. Restituisce quanti TE vale
   un'unita di peso, che serve a tradurre anche le altre quantita del gioco. */
export function priceInTe(budgetTe) {
  const weights = pieces.reduce((s, p) => s + p.cost, 0);
  const tePerWeight = budgetTe / weights;
  pieces.forEach(p => {
    p.weight = p.cost;
    p.cost = Math.max(1, Math.round(p.cost * tePerWeight));
  });
  return tePerWeight;
}

export function setGhost(obj, on) {
  obj.traverse(o => {
    if (!o.isMesh) return;
    if (on) { o.userData._m = o.userData._m || o.material; o.material = M.ghost; }
    else if (o.userData._m) o.material = o.userData._m;
  });
}

/* ══════════════ FUSIONE DELLE MESH POSATE ══════════════
   A cantiere completo la scena ha circa 2.500 mesh. Quando una fase
   si chiude le sue mesh vengono fuse in una geometria per materiale:
   le draw call scendono da qualche migliaio a poche decine. */

function mergeList(list) {
  let total = 0;
  const parts = list.map(([g, m]) => {
    const ng = g.index ? g.toNonIndexed() : g;
    total += ng.attributes.position.count;
    return [ng, m];
  });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let o = 0;
  parts.forEach(([g, m]) => {
    nm.getNormalMatrix(m);
    const gp = g.attributes.position, gn = g.attributes.normal;
    for (let i = 0; i < gp.count; i++) {
      v.fromBufferAttribute(gp, i).applyMatrix4(m);
      pos[o * 3] = v.x; pos[o * 3 + 1] = v.y; pos[o * 3 + 2] = v.z;
      if (gn) {
        n.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize();
        nor[o * 3] = n.x; nor[o * 3 + 1] = n.y; nor[o * 3 + 2] = n.z;
      }
      o++;
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return out;
}

export const mergedByPhase = {};

export function bakePhase(key) {
  try {
    const list = pieces.filter(p => p.phase === key);
    if (!list.length || mergedByPhase[key]) return;
    const byMat = new Map();
    list.forEach(p => {
      p.obj.updateWorldMatrix(true, false);
      p.obj.traverse(o => {
        if (!o.isMesh) return;
        const mat = o.userData._m || o.material;
        if (!byMat.has(mat)) byMat.set(mat, []);
        o.updateWorldMatrix(true, false);
        byMat.get(mat).push([o.geometry, o.matrixWorld.clone()]);
      });
    });
    const out = [];
    byMat.forEach((l, mat) => {
      const mesh = new THREE.Mesh(mergeList(l), mat);
      mesh.castShadow = mesh.receiveShadow = true;
      scene.add(mesh);
      out.push(mesh);
    });
    mergedByPhase[key] = out;
    list.forEach(p => { p.obj.visible = false; p.baked = true; });
  } catch (e) {
    console.warn('bakePhase non riuscita, la scena resta non fusa:', e);
  }
}

export function unbakeAll() {
  Object.keys(mergedByPhase).forEach(k => {
    mergedByPhase[k].forEach(m => { scene.remove(m); m.geometry.dispose(); });
    delete mergedByPhase[k];
  });
  pieces.forEach(p => { p.baked = false; });
}
