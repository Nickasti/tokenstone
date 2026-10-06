import * as THREE from 'three';

/* Il marmo del Pentelico contiene ossido di ferro: invecchiando vira
   al miele. Le tre varianti rompono l'uniformita fra corsi contigui. */
export const M = {
  marmo   : new THREE.MeshStandardMaterial({ color:0xDCCDA9, roughness:.83, metalness:0 }),
  marmo2  : new THREE.MeshStandardMaterial({ color:0xCEBC96, roughness:.88, metalness:0 }),
  marmo3  : new THREE.MeshStandardMaterial({ color:0xC4B18B, roughness:.90, metalness:0 }),

  /* blocchi mai rifiniti, con le bugne di sollevamento ancora attaccate */
  grezzo  : new THREE.MeshStandardMaterial({ color:0xA79C82, roughness:.99, metalness:0, flatShading:true }),
  calcare : new THREE.MeshStandardMaterial({ color:0x9C917A, roughness:.97, metalness:0 }),

  /* Policromia. Il marmo bianco e un equivoco moderno: le tracce di
     pigmento attestano triglifi e fondi in blu egizio, metope su fondo
     rosso, anuli e taenia in minio. Il fregio dell Eretteo non era
     dipinto ma intarsiato: figure di marmo bianco su lastre di calcare
     grigio di Eleusi. */
  blu     : new THREE.MeshStandardMaterial({ color:0x2C588A, roughness:.80, metalness:0 }),
  minio   : new THREE.MeshStandardMaterial({ color:0xA6432D, roughness:.84, metalness:0 }),
  rosso   : new THREE.MeshStandardMaterial({ color:0x8E3B2A, roughness:.86, metalness:0 }),
  eleusi  : new THREE.MeshStandardMaterial({ color:0x39383C, roughness:.92, metalness:0 }),

  /* Il pianoro: roccia viva, basolato della via, corteccia e fronde.
     L olivo ha la foglia verde sopra e argentata sotto, ed e per questo
     che al vento un uliveto cambia colore. */
  roccia      : new THREE.MeshStandardMaterial({ color:0x6E6656, roughness:1, metalness:0, flatShading:true }),
  basolato    : new THREE.MeshStandardMaterial({ color:0xA39C8B, roughness:.96, metalness:0 }),
  corteccia   : new THREE.MeshStandardMaterial({ color:0x6A5D4C, roughness:.99, metalness:0, flatShading:true }),
  fronda      : new THREE.MeshStandardMaterial({ color:0x74805E, roughness:.94, metalness:0, flatShading:true }),
  frondaChiara: new THREE.MeshStandardMaterial({ color:0x8C9678, roughness:.92, metalness:0, flatShading:true }),
  alloro      : new THREE.MeshStandardMaterial({ color:0x4E5B3B, roughness:.95, metalness:0, flatShading:true }),

  oro     : new THREE.MeshStandardMaterial({ color:0xC8A04E, roughness:.30, metalness:.85 }),
  bronzo  : new THREE.MeshStandardMaterial({ color:0x6E7F55, roughness:.42, metalness:.90 }),
  avorio  : new THREE.MeshStandardMaterial({ color:0xEDE3CE, roughness:.55, metalness:0 })
  // il blocco in volo, verderame, e del motore: engine/pieces.js
};
