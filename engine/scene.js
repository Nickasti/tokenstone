import * as THREE from 'three';
import { WEEKLY_TE, GIFT_WEIGHT, GRANT_WEIGHT } from './config.js';
import { Sky, solarPosition, skySample, sunAtten } from './sky.js';
import { initPieces, pieces, setGhost, bakePhase, unbakeAll, priceInTe } from './pieces.js';
import { CreditSource } from './credit.js';
import { UI } from './ui.js';

/* Il motore di un mondo: scena, cielo, luce, camera, credito, posa.

   Un mondo gli passa quello che lo rende se stesso, e il resto e uguale per
   tutti:
     meta        il suo world.json: id, nome, durata in settimane, sole
     build(scene)  costruisce terreno e pezzi, in ordine di posa
     phases      le fasi del cantiere, per il pannello
     completion  { mark, text }: cosa si legge a cantiere compiuto
     view        { az, pol, dist, target }: l'inquadratura iniziale
     sun         { center, shadow }: dove guarda il sole, e quanto copre l'ombra
     fog         il colore della foschia
     hour        l'ora del giorno all'apertura
     focus(k)    { x, z, dist }: dove vola la camera per la fase k
     legacy      { hourKeys, dropKeys }: chiavi del browser di versioni vecchie */
export function startWorld(world) {
  const { meta } = world;
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
  const fog = new THREE.FogExp2(world.fog, .0016);
  scene.fog = fog;

  /* ─────────── cielo, luci, il mondo ─────────── */
  const sky = new Sky(scene, renderer);

  const hemi = new THREE.HemisphereLight(0x9EC0D6, 0x6B5F4A, .55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xFFE6BE, 2);
  sun.castShadow = true;
  const SM = Math.min(4096, renderer.capabilities.maxTextureSize || 2048);
  sun.shadow.mapSize.set(SM, SM);
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.05;
  Object.assign(sun.shadow.camera, world.sun.shadow);
  sun.target.position.set(...world.sun.center);
  scene.add(sun, sun.target);

  initPieces(scene);
  world.build(scene);

  /* ─────────── prezzi ───────────
     Il budget del mondo e la sua durata per quanto vale una settimana: si
     ripartisce sui pesi dei pezzi, e da li vengono anche il dono iniziale e
     il credito regalato di ?dev. */
  const TOTAL = pieces.length;
  const TE_PER_WEIGHT = priceInTe(WEEKLY_TE * meta.weeks);
  const TOTAL_COST = pieces.reduce((s, p) => s + p.cost, 0);
  const START_TE = Math.round(GIFT_WEIGHT * TE_PER_WEIGHT);
  const GRANT_TE = Math.round(GRANT_WEIGHT * TE_PER_WEIGHT);

  /* ─────────── due modi di stare davanti alla scena ───────────
     Normalmente il cantiere avanza da solo, al ritmo con cui arrivano i token:
     non c'e niente da cliccare, si guarda crescere. Con ?dev nell'indirizzo
     tornano i comandi manuali - posa singola, cantiere continuo, credito
     regalato - che servono a chi lavora al codice, non a chi visita. */
  const DEV = new URLSearchParams(location.search).has('dev');
  document.body.classList.toggle('dev', DEV);

  /* ─────────── il cantiere si calcola dal credito ───────────
     I blocchi posati non si salvano: dato il credito del mondo, quanti se ne
     possono pagare e un conto, lo stesso in ogni browser. COST_UP_TO[k] e
     quanto costano i primi k pezzi, in ordine. */
  const COST_UP_TO = [0];
  for (const p of pieces) COST_UP_TO.push(COST_UP_TO[COST_UP_TO.length - 1] + p.cost);

  /** Quanti pezzi, dall'inizio, si pagano con un credito: ricerca binaria. */
  function affordable(credit) {
    let lo = 0, hi = TOTAL;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (COST_UP_TO[mid] <= credit) lo = mid; else hi = mid - 1;
    }
    return lo;
  }

  /* Il credito regalato di ?dev vive solo in questo browser e non arriva mai
     al registro: serve a provare il codice, non a costruire. */
  const DEV_KEY = meta.id + ':dev-credit';
  let devBonus = 0;
  if (DEV) {
    try { devBonus = Number(localStorage.getItem(DEV_KEY)) || 0; } catch (e) { /* niente */ }
  }

  const credit = new CreditSource(meta.id);
  const totalCredit = () => START_TE + credit.credit + devBonus;
  /* fin dove puo arrivare il cantiere: quanto si paga, e mai meno del punto
     gia raggiunto, cosi un ricalcolo dei prezzi non disfa niente */
  const goal = () => Math.max(Math.min(credit.placedMax, TOTAL), affordable(totalCredit()));

  let placed = 0, autoOn = !DEV, hour = world.hour, synced = false;
  const flying = [];

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
    if (placed >= goal()) return false;
    const p = pieces[placed];
    place(placed, true);
    placed++;
    const next = placed < TOTAL ? pieces[placed].phase : null;
    if (next !== p.phase) setTimeout(() => bakePhase(p.phase), 700);
    refresh();
    reportSoon();
    return true;
  }

  /** Posa subito, senza animazione, i primi n pezzi: quello che c'era gia. */
  function placeAtOnce(n) {
    for (let i = placed; i < n; i++) place(i, false);
    placed = Math.max(placed, n);
    world.phases.forEach(ph => {
      const idxs = pieces.map((p, i) => p.phase === ph.k ? i : -1).filter(i => i >= 0);
      if (idxs.length && idxs.every(i => i < placed)) bakePhase(ph.k);
    });
  }

  /* Al server si dice com'e fatto il mondo e fin dove e arrivato, non piu di
     una volta ogni due secondi: mentre smaltisce una coda il cantiere posa un
     pezzo ogni pochi centesimi di secondo. Con ?dev si dice solo la forma: il
     credito regalato non deve alzare il punto raggiunto per davvero. */
  let pendingReport = null;
  function report() {
    pendingReport = null;
    const data = { pieces: TOTAL, cost_te: TOTAL_COST, gift_te: START_TE };
    if (!DEV) data.placed = placed;
    credit.report(data);
  }
  function reportSoon() {
    if (!pendingReport) pendingReport = setTimeout(report, 2000);
  }

  /* ─────────── sole ─────────── */
  let iblTimer = 0;
  function applySun(h) {
    const s = solarPosition(h, meta.solar);
    sky.setSun(s.dir);
    const [cx, cy, cz] = world.sun.center;
    sun.position.set(cx + s.dir[0] * 400, cy + s.dir[1] * 400, cz + s.dir[2] * 400);

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
  let { az, pol, dist } = world.view;
  let tDist = dist;
  const target = new THREE.Vector3(...world.view.target), tTarget = target.clone();
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
    grant: () => {
      devBonus += GRANT_TE;
      try { localStorage.setItem(DEV_KEY, String(devBonus)); } catch (e) { /* niente */ }
      refresh();
    },
    setHour: h => { hour = h; applySun(h); save(); },
    /* Riparti non cancella niente: il cantiere e un conto sul credito, e il
       credito resta. Si rivede la costruzione dall'inizio, accelerata finche
       non raggiunge di nuovo il punto a cui era. Con ?dev torna anche al
       credito vero, senza quello regalato. */
    reset: () => {
      unbakeAll();
      pieces.forEach(p => { p.obj.visible = false; setGhost(p.obj, false); p.obj.position.y = p.y; });
      flying.length = 0;
      placed = 0;
      if (DEV) {
        devBonus = 0;
        try { localStorage.removeItem(DEV_KEY); } catch (e) { /* niente */ }
      }
      autoOn = !DEV;   // senza comandi manuali il cantiere deve ripartire da solo
      ui.setAuto(autoOn);
      renderer.shadowMap.needsUpdate = true;
      refresh();
    },
    fly: () => {
      const f = world.focus(placed < TOTAL ? pieces[placed].phase : null);
      goTo(f.x, f.z, f.dist);
    }
  }, world);

  function refresh() {
    ui.render({
      tokens: totalCredit() - COST_UP_TO[placed], placed, total: TOTAL,
      totalCost: TOTAL_COST, source: credit.info,
      warn: credit.priceWarning
    });
  }
  ui.setGrant(GRANT_TE);

  /* Alla prima risposta del server si posa subito quello che era gia stato
     costruito - anche da un altro browser - e si dice al registro com'e fatto
     il mondo. Il resto arriva con l'animazione. */
  credit.onChange(() => {
    if (!synced && credit.loaded) {
      synced = true;
      placeAtOnce(Math.min(credit.placedMax, TOTAL));
      report();
    }
    refresh();
  });

  /* ─────────── preferenze ───────────
     Nel browser resta solo l'ora del sole: l'avanzamento e un conto sul
     credito, e il credito sta nel registro. */
  const HOUR_KEY = meta.id + ':hour';
  const legacy = world.legacy || {};
  function save() {
    try { localStorage.setItem(HOUR_KEY, String(hour)); } catch (e) { /* modalita privata */ }
  }
  function load() {
    try {
      let h = Number(localStorage.getItem(HOUR_KEY));
      // le versioni di prima tenevano l'ora sotto altri nomi
      for (const k of legacy.hourKeys || []) {
        if (h) break;
        const v = localStorage.getItem(k);
        const parsed = v && v.trim().startsWith('{') ? JSON.parse(v).hour : Number(v);
        if (parsed) h = Number(parsed);
      }
      for (const k of (legacy.hourKeys || []).concat(legacy.dropKeys || [])) localStorage.removeItem(k);
      if (h) { hour = h; ui.el.hour.value = hour; save(); }
    } catch (e) { /* si parte dall'ora predefinita */ }
  }

  /* ─────────── loop ─────────── */
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;

    // si comincia dopo la prima risposta del server, che sa da dove ripartire
    if (autoOn && synced) {
      /* Un blocco alla volta, con la calma di chi lo guarda salire. Se pero' il
         credito arretrato e molto - una settimana di lavoro, un cantiere appena
         riavviato - si accelera, altrimenti si starebbe mezz'ora a smaltire
         la coda. */
      const pace = goal() - placed > 20 ? .06 : .45;
      acc += dt;
      while (acc > pace) {
        acc -= pace;
        if (!step()) {
          if (placed >= TOTAL) { autoOn = false; ui.setAuto(false); }
          // in attesa di credito il tempo non si accumula: niente raffiche all'arrivo
          acc = 0;
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
  load();
  applySun(hour);
  refresh();
  updateCam();
  credit.probe();
  requestAnimationFrame(frame);

  return { scene, renderer, camera, sky };
}
