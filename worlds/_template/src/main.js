/* Il modello di un mondo: una torre a gradoni su una piazza lastricata, con
   qualche albero. E il minimo che serve per vedere come funziona un mondo, e
   il punto da cui partire per scriverne uno vero: docs/creare-un-mondo.md.

   Un mondo e due cose.
   1. world.json: nome, luogo, epoca, durata, sole. Lo leggono il motore, il
      registro e la pagina iniziale.
   2. Questo file: costruisce i pezzi e passa al motore quello che rende il
      mondo se stesso. Cielo, luce, camera, credito, posa, pannello: e tutto
      del motore, in engine/. */

import * as THREE from 'three';
import { startWorld } from '/engine/scene.js';
import { addPiece, mark } from '/engine/pieces.js';

const meta = await (await fetch(new URL('../world.json', import.meta.url))).json();

/* ─────────── materiali ───────────
   Ogni mondo ha i suoi. Il verderame del blocco in volo e del motore. */
const M = {
  pietra: new THREE.MeshStandardMaterial({ color: 0xC9BFA6, roughness: .9 }),
  pietra2: new THREE.MeshStandardMaterial({ color: 0xB7AC92, roughness: .92 }),
  lastra: new THREE.MeshStandardMaterial({ color: 0xA59D8A, roughness: .96 }),
  terra: new THREE.MeshStandardMaterial({ color: 0x7A715E, roughness: 1 }),
  tronco: new THREE.MeshStandardMaterial({ color: 0x6A5D4C, roughness: 1, flatShading: true }),
  fronda: new THREE.MeshStandardMaterial({ color: 0x74805E, roughness: .95, flatShading: true }),
};

function mesh(geometry, material) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/* ─────────── pesi ───────────
   Non sono prezzi: dicono quanto vale un pezzo rispetto agli altri. Il motore
   ripartisce sui pesi il budget del mondo - la quota settimanale per le
   settimane di world.json - e da li viene il costo in TE di ogni pezzo. */
const COST = { slab: 2, block: 4, crown: 30, tree: 8 };

/* ─────────── fasi ───────────
   L'ordine del cantiere, per il pannello. k e la chiave usata da addPiece,
   b l'edificio, y l'anno o il periodo, n il nome, t il testo che si legge
   mentre la fase e in corso. */
const PHASES = [
  { k: 'piazza', b: 'Piazza', y: 'I', n: 'Il lastricato', t: 'Prima il suolo: le lastre della piazza, una per una.' },
  { k: 'torre', b: 'Torre', y: 'II', n: 'I gradoni', t: 'Cinque gradoni, ognuno piu stretto di quello sotto.' },
  { k: 'verde', b: 'Giardino', y: 'III', n: 'Gli alberi', t: 'Per ultimi gli alberi, attorno alla piazza.' },
];

/* ─────────── costruzione ───────────
   L'ordine delle chiamate ad addPiece e l'ordine di posa: il cantiere e "i
   primi N pezzi dell'elenco", e il registro ricorda N. Una volta pubblicato
   un mondo, l'ordine non si cambia piu: N indicherebbe altri pezzi.

   addPiece(fase, oggetto, peso, marca, descrizione, caduta)
   - oggetto: un Object3D nella sua posizione finale
   - marca: l'identificativo del pezzo; mark('PREFISSO') lo numera da se
   - caduta: da quanti metri scende il blocco quando si posa */
function build(scene) {
  // Il terreno non e un pezzo e non si paga: c'era prima.
  const ground = mesh(new THREE.CircleGeometry(90, 48), M.terra);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // 1. la piazza: 7 x 7 lastre di 4 metri
  for (let i = -3; i <= 3; i++) {
    for (let j = -3; j <= 3; j++) {
      const s = mesh(new THREE.BoxGeometry(3.9, .3, 3.9), M.lastra);
      s.position.set(i * 4, .15, j * 4);
      addPiece('piazza', s, COST.slab, mark('LASTRA'), 'lastra della piazza', 4);
    }
  }

  // 2. la torre: cinque gradoni di blocchi, dal basso
  let y = .3;
  for (let level = 0; level < 5; level++) {
    const side = 5 - level;            // blocchi per lato
    const size = 2.4;
    for (let i = 0; i < side; i++) {
      for (let j = 0; j < side; j++) {
        const b = mesh(new THREE.BoxGeometry(size - .06, 1.6, size - .06), level % 2 ? M.pietra2 : M.pietra);
        b.position.set((i - (side - 1) / 2) * size, y + .8, (j - (side - 1) / 2) * size);
        addPiece('torre', b, COST.block, mark('GRADONE ' + (level + 1)), 'blocco del gradone ' + (level + 1), 8);
      }
    }
    y += 1.6;
  }
  const crown = mesh(new THREE.ConeGeometry(1.4, 2.4, 4), M.pietra);
  crown.position.set(0, y + 1.2, 0);
  crown.rotation.y = Math.PI / 4;
  addPiece('torre', crown, COST.crown, 'CORONA', 'la corona della torre', 10);

  // 3. il verde: un anello di alberi attorno alla piazza
  for (let a = 0; a < 10; a++) {
    const angle = a / 10 * Math.PI * 2;
    const tree = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(.18, .26, 2.2, 6), M.tronco);
    trunk.position.y = 1.1;
    const crownT = mesh(new THREE.IcosahedronGeometry(1.5, 0), M.fronda);
    crownT.position.y = 3;
    tree.add(trunk, crownT);
    tree.position.set(Math.cos(angle) * 22, 0, Math.sin(angle) * 22);
    addPiece('verde', tree, COST.tree, mark('ALBERO'), 'albero', 5);
  }
}

/* ─────────── il mondo, al motore ─────────── */
startWorld({
  meta,
  build,
  phases: PHASES,
  completion: { mark: 'FINE', text: 'Il mondo di prova è compiuto.' },
  // l'inquadratura: angolo orizzontale, angolo dal verticale, distanza, punto guardato
  view: { az: .7, pol: 1.1, dist: 70, target: [0, 4, 0] },
  // dove guarda il sole, e quanto copre la sua ombra (in metri attorno al centro)
  sun: { center: [0, 0, 0], shadow: { left: -60, right: 60, top: 60, bottom: -60, near: 60, far: 640 } },
  fog: 0x9AA8AE,
  hour: 9,
  // l'immagine della scheda nella pagina iniziale: npm run previews
  snapshot: { hour: 16.5, view: { az: .7, pol: 1.0, dist: 62, target: [0, 3, 0] } },
  // "vola al cantiere": dove va la camera per la fase in corso
  focus(phase) {
    return phase === 'verde' ? { x: 0, z: 0, dist: 70 } : { x: 0, z: 0, dist: 40 };
  },
});
