import * as THREE from 'three';
import { SITE, FOCUS, PHASES, CANTIERE } from './config.js';
import { M } from './materials.js';
import { Sky, solarPosition, skySample, sunAtten } from './sky.js';
import { buildTerrain } from './terrain.js';
import { initPieces, pieces, setGhost, bakePhase, unbakeAll, priceInTe } from './pieces.js';
import { buildAll } from './buildings.js';
import { TokenSource } from './tokens.js';
import { UI } from './ui.js';

const PI = Math.PI;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────── renderer ─────────── */
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;          // si aggiorna solo quando un pezzo si posa
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, .6, 2200);
const fog = new THREE.FogExp2(0x9AA8AE, .0016);
scene.fog = fog;

/* ─────────── cielo, luci, terreno, monumenti ─────────── */
const sky = new Sky(scene, renderer);

const hemi = new THREE.HemisphereLight(0x9EC0D6, 0x6B5F4A, .55);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xFFE6BE, 2);
sun.castShadow = true;
const SM = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);
sun.shadow.mapSize.set(SM, SM);
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.05;
Object.assign(sun.shadow.camera, { left: -190, right: 110, top: 120, bottom: -120, near: 60, far: 640 });
sun.target.position.set(-70, 0, 0);
scene.add(sun, sun.target);

buildTerrain(scene);
initPieces(scene);
buildAll(scene);

/* ─────────── INNESTO: sculture fotogrammetrate ───────────
   Togli i commenti dopo aver messo i GLB in assets/models/.
   Il resto del sistema - costi, marche, animazione, fusione -
   continua a funzionare senza modifiche.

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
  try { bank[pose] = (await loader.loadAsync(`assets/models/${file}`)).scene; }
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

/* ─────────── INNESTO: HDRI ───────────
   await sky.useHDRI('assets/hdri/athens_morning_4k.hdr');
*/

/* ─────────── stato ─────────── */
const TOTAL = pieces.length;
/* Da qui in poi ogni costo e ogni saldo e' in TE. Il credito iniziale e il
   pulsante della simulazione restano quelli di prima in proporzione al
   cantiere: 300 e 1000 unita di peso, qualche pezzo e qualche fase. */
const TE_PER_WEIGHT = priceInTe(CANTIERE.weeklyTe * CANTIERE.weeks);
const TOTAL_COST = pieces.reduce((s, p) => s + p.cost, 0);
const START_TE = Math.round(300 * TE_PER_WEIGHT);
const GRANT_TE = Math.round(1000 * TE_PER_WEIGHT);
/* ─────────── due modi di stare davanti alla scena ───────────
   Normalmente il cantiere avanza da solo, al ritmo con cui arrivano i token:
   non c'e niente da cliccare, si guarda crescere. Con ?dev nell'indirizzo
   tornano i comandi manuali - posa singola, cantiere continuo, credito
   regalato - che servono a chi lavora al codice, non a chi visita. */
const DEV = new URLSearchParams(location.search).has('dev');
document.body.classList.toggle('dev', DEV);

let placed = 0, autoOn = !DEV, hour = 8.4;
const flying = [];
const tokenSource = new TokenSource(START_TE);

function place(i, animate) {
  const p = pieces[i];
  p.obj.visible = true;
  if (animate && !RM) {
    p.obj.position.y = p.y + p.drop;
    setGhost(p.obj, true);
    flying.push({ p, t: 0 });
  } else p.obj.position.y = p.y;
  renderer.shadowMap.needsUpdate = true;
}

function step() {
  if (placed >= TOTAL) return false;
  const p = pieces[placed];
  if (!tokenSource.spend(p.cost)) return false;
  place(placed, true);
  placed++;
  const next = placed < TOTAL ? pieces[placed].phase : null;
  if (next !== p.phase) setTimeout(() => bakePhase(p.phase), 700);
  refresh();
  save();
  return true;
}

/* ─────────── sole ─────────── */
function applySun(h) {
  const s = solarPosition(h);
  sky.setSun(s.dir);
  sun.position.set(-70 + s.dir[0] * 400, s.dir[1] * 400, s.dir[2] * 400);

  const att = sunAtten(s.dir);
  const lum = Math.max(0, Math.sin(Math.max(s.alt, -.09)));
  const mx = Math.max(...att) || 1;
  sun.color.setRGB(att[0] / mx, att[1] / mx, att[2] / mx);
  sun.intensity = 2.35 * Math.pow(lum, .42);

  const zen = skySample([0, 1, 0], s.dir);
  const hor = skySample([Math.cos(s.az + PI), .06, -Math.sin(s.az + PI)], s.dir);
  const n = v => Math.min(1, Math.max(.02, v));
  hemi.color.setRGB(n(zen[0] * 1.7), n(zen[1] * 1.7), n(zen[2] * 1.7));
  hemi.groundColor.setRGB(n(hor[0] * .7 + .10), n(hor[1] * .62 + .085), n(hor[2] * .5 + .062));
  hemi.intensity = .30 + .55 * lum;

  fog.color.setRGB(n(hor[0] * 1.25), n(hor[1] * 1.25), n(hor[2] * 1.25));
  fog.density = .0013 + .0012 * (1 - lum);

  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  ui.setSolar(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}` +
    `  -  altezza ${(s.alt * 180 / PI).toFixed(1)}deg  -  azimut ${(s.az * 180 / PI).toFixed(0)}deg`);
  iblTimer = 0;
  renderer.shadowMap.needsUpdate = true;
}

/* ─────────── camera ─────────── */
let az = .62, pol = 1.19, dist = 210, tDist = 210;
const target = new THREE.Vector3(-60, 10, 0), tTarget = target.clone();
let idle = 0, drag = false, lx = 0, ly = 0, pinch = 0;

function goTo(x, z, d) { tTarget.set(x, 10, z); tDist = d; idle = 0; }
function updateCam() {
  target.lerp(tTarget, .045);
  dist += (tDist - dist) * .045;
  camera.position.set(
    target.x + dist * Math.sin(pol) * Math.sin(az),
    target.y + dist * Math.cos(pol),
    target.z + dist * Math.sin(pol) * Math.cos(az));
  camera.lookAt(target);
}
canvas.addEventListener('pointerdown', e => { drag = true; idle = 0; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  az -= (e.clientX - lx) * .0048;
  pol = Math.max(.14, Math.min(1.50, pol - (e.clientY - ly) * .0048));
  lx = e.clientX; ly = e.clientY; idle = 0;
});
canvas.addEventListener('pointerup', () => drag = false);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  tDist = Math.max(22, Math.min(460, tDist + e.deltaY * .2));
  idle = 0;
}, { passive: false });
canvas.addEventListener('touchmove', e => {
  if (e.touches.length !== 2) return;
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                       e.touches[0].clientY - e.touches[1].clientY);
  if (pinch) tDist = Math.max(22, Math.min(460, tDist + (pinch - d) * .6));
  pinch = d; idle = 0;
}, { passive: true });
canvas.addEventListener('touchend', () => pinch = 0);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.shadowMap.needsUpdate = true;
}
addEventListener('resize', resize);

/* ─────────── interfaccia ─────────── */
const ui = new UI({
  build: () => step(),
  toggleAuto: () => { autoOn = !autoOn; ui.setAuto(autoOn); },
  grant: () => { tokenSource.grant(GRANT_TE); refresh(); save(); },
  setHour: h => { hour = h; applySun(h); save(); },
  reset: () => {
    unbakeAll();
    pieces.forEach(p => { p.obj.visible = false; setGhost(p.obj, false); p.obj.position.y = p.y; });
    flying.length = 0;
    placed = 0;
    tokenSource.balance = START_TE;
    tokenSource.resetCredit();
    if (tokenSource.live) tokenSource.fetchOnce();
    autoOn = !DEV;   // senza comandi manuali il cantiere deve ripartire da solo
    ui.setAuto(autoOn);
    renderer.shadowMap.needsUpdate = true;
    refresh(); save();
  },
  fly: () => {
    const k = FOCUS[placed < TOTAL ? pieces[placed].phase : 'p-krepis'];
    const s = SITE[k] || SITE.parthenon;
    goTo(s.x, s.z, k === 'nike' ? 46 : k === 'promachos' ? 52 : 96);
  }
});

function refresh() {
  ui.render({
    tokens: tokenSource.balance, placed, total: TOTAL,
    totalCost: TOTAL_COST, source: tokenSource.info,
    warn: tokenSource.priceWarning
  });
}
ui.setGrant(GRANT_TE);
/* Il credito arriva da solo, fuori da ogni gesto dell'utente: se non lo si
   salva subito, il contatore lo segna come gia consegnato e una ricarica
   della pagina lo fa sparire. */
tokenSource.onChange(() => { refresh(); save(); });

/* ─────────── persistenza ─────────── */
const KEY = 'acropoli:stato';
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ placed, te: tokenSource.balance, hour }));
  } catch (e) { /* modalita privata: si continua senza salvare */ }
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s) return;
    /* i salvataggi di prima contavano in unita di peso, non in TE */
    if (typeof s.te === 'number') tokenSource.balance = s.te;
    else if (typeof s.tokens === 'number') tokenSource.balance = Math.round(s.tokens * TE_PER_WEIGHT);
    if (s.hour) { hour = s.hour; ui.el.hour.value = hour; }
    for (let i = 0; i < s.placed; i++) place(i, false);
    placed = s.placed;
    const complete = {};
    PHASES.forEach(ph => {
      const idxs = pieces.map((p, i) => p.phase === ph.k ? i : -1).filter(i => i >= 0);
      if (idxs.length && idxs.every(i => i < placed)) complete[ph.k] = true;
    });
    Object.keys(complete).forEach(bakePhase);
  } catch (e) { /* stato corrotto: si riparte da zero */ }
}

/* ─────────── loop ─────────── */
let last = performance.now(), acc = 0, iblTimer = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, .05);
  last = now;

  if (autoOn) {
    /* Un blocco alla volta, con la calma di chi lo guarda salire. Se pero' il
       credito arretrato e molto - una settimana di lavoro, un cantiere appena
       riavviato - si accelera, altrimenti si starebbe mezz'ora a smaltire
       la coda. */
    const p = placed < TOTAL ? pieces[placed] : null;
    const passo = p && tokenSource.balance > p.cost * 20 ? .06 : .45;
    acc += dt;
    while (acc > passo) {
      acc -= passo;
      if (!step()) {
        if (placed >= TOTAL) { autoOn = false; ui.setAuto(false); }
        break;
      }
    }
  }

  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    f.t += dt / .40;
    if (f.t >= 1) {
      f.p.obj.position.y = f.p.y;
      setGhost(f.p.obj, false);
      flying.splice(i, 1);
      renderer.shadowMap.needsUpdate = true;
    } else {
      f.p.obj.position.y = f.p.y + f.p.drop * Math.pow(1 - f.t, 3);
    }
  }

  if (iblTimer < 2) {
    iblTimer += dt;
    if (iblTimer >= .25 && iblTimer < 2) { sky.bakeIBL(); iblTimer = 2; }
  }

  idle += dt;
  if (idle > 5 && !drag) az += dt * .028;
  sky.follow(camera);
  updateCam();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

resize();
applySun(hour);
load();
refresh();
updateCam();
tokenSource.probe();
requestAnimationFrame(frame);
