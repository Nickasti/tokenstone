/**
 * Il registro dei cantieri: quale mondo riceve i token, e quanto credito ha
 * ciascuno.
 *
 * Il contatore conosce un numero solo, il totale dei TE consumati da quando
 * il progetto e installato. Il registro divide quel totale fra i mondi in
 * tratti (segments): dal momento in cui un mondo diventa attivo a quello in
 * cui lo si mette in pausa, i TE sono suoi. Un tratto e un intervallo del
 * totale, [from_te, to_te), e un mondo puo averne quanti ne vuole: pausa e
 * ripresa.
 *
 * I blocchi posati non stanno qui. Ogni mondo conosce il costo dei suoi pezzi
 * in ordine, e dato il credito sa quanti ne puo pagare: e un conto, uguale in
 * ogni browser. Qui si ricorda solo il punto piu alto raggiunto, perche il
 * cantiere non si disfi se i prezzi cambiano, e quanto costa ogni mondo,
 * perche quando uno e completato si sappia quanto credito avanza.
 *
 * Decisioni del 6 ottobre 2026: un mondo si puo mettere in pausa per
 * cominciarne un altro; il credito che avanza a mondo completato passa al
 * mondo scelto dopo; ogni mondo ha la sua durata.
 *
 * Il registro ricorda anche il piano di Claude di chi usa il progetto (Pro,
 * Max 5x, Max 20x): decide quanto vale una settimana, e quindi i prezzi. I
 * piani stanno in engine/plans.json. Decisione del 16 ottobre 2026.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const counter = require('./token-counter/counter.js');

const ROOT = path.resolve(__dirname, '..');
const WORLDS_DIR = path.join(ROOT, 'worlds');
const REGISTRY_PATH = process.env.ACROPOLI_REGISTRY ||
  path.join(path.dirname(counter.STATE_PATH), 'registry.json');
const BACKUP_PATH = path.join(path.dirname(REGISTRY_PATH), '.registry.bak');

const VERSION = 2;

/* I piani, uguali per server e scena: engine/plans.json */
const PLANS = JSON.parse(fs.readFileSync(path.join(ROOT, 'engine', 'plans.json'), 'utf8'));
const planById = (id) => PLANS.plans.find((p) => p.id === id) || null;
// i nomi dei mondi prima che i nomi del codice passassero all'inglese
const LEGACY_IDS = { acropoli: 'acropolis' };

class Refusal extends Error {}

/**
 * I mondi che esistono: uno per ogni worlds/<id>/world.json. Solo quelli
 * "available" si possono scegliere; gli altri, per esempio "coming", la
 * pagina iniziale li mostra come in arrivo.
 */
function loadWorlds() {
  const out = {};
  let dirs = [];
  try { dirs = fs.readdirSync(WORLDS_DIR, { withFileTypes: true }); } catch (_) { return out; }
  for (const d of dirs) {
    if (!d.isDirectory() || d.name.startsWith('_') || d.name.startsWith('.')) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(WORLDS_DIR, d.name, 'world.json'), 'utf8'));
      if (meta.id !== d.name) continue;   // il nome della cartella e l'id: devono coincidere
      out[meta.id] = { status: meta.status || 'available' };
    } catch (_) { /* cartella senza world.json valido: non e un mondo */ }
  }
  return out;
}
const WORLDS = loadWorlds();

/** I world.json completi, in ordine: quello che la pagina iniziale mostra. */
function listWorlds() {
  const out = [];
  for (const id of Object.keys(loadWorlds())) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(WORLDS_DIR, id, 'world.json'), 'utf8'));
      meta.has_page = fs.existsSync(path.join(WORLDS_DIR, id, 'index.html'));
      out.push(meta);
    } catch (_) { /* sparito nel frattempo */ }
  }
  return out.sort((x, y) => (x.order || 99) - (y.order || 99) || x.id.localeCompare(y.id));
}

// ----------------------------------------------------------------- calcoli

/* Al primo avvio nessun mondo e attivo: lo sceglie chi usa il progetto,
   dalla pagina iniziale. Intanto i TE si accumulano, e il primo tratto del
   mondo scelto parte da zero: riceve tutto il consumo dall'installazione. */
function newRegistry(nowIso) {
  return {
    version: VERSION,
    created_at: nowIso,
    active: null,
    plan: null,          // lo sceglie chi usa il progetto, al primo avvio
    segments: [],
    transfers: [],
    worlds: {},
  };
}

/**
 * Il credito di un mondo, senza il dono iniziale (che dipende dai prezzi del
 * mondo e lo aggiunge la scena): i TE dei suoi tratti, meno l'avanzo che ha
 * passato ad altri, piu quello che ha ricevuto.
 *
 * Il totale puo anche scendere - un listino corretto ricalcola tutto - e un
 * tratto non vale mai meno di zero.
 */
function creditOf(reg, id, total) {
  let te = 0;
  for (const s of reg.segments) {
    if (s.world !== id) continue;
    const end = s.to_te === null ? total : Math.min(s.to_te, total);
    te += Math.max(0, end - s.from_te);
  }
  for (const t of reg.transfers) {
    if (t.from === id) te -= t.te;
    if (t.to === id) te += t.te;
  }
  return te;
}

function completed(reg, id) {
  const w = reg.worlds[id];
  return !!(w && w.pieces > 0 && w.placed_max >= w.pieces);
}

/** Quanto credito ha in piu un mondo completato: e quello che passa al prossimo. */
function surplusOf(reg, id, total) {
  const w = reg.worlds[id];
  if (!completed(reg, id)) return 0;
  return Math.max(0, (w.gift_te || 0) + creditOf(reg, id, total) - w.cost_te);
}

function number(v, name) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new Refusal(name + ' non valido');
  return v;
}

function knownWorld(id) {
  if (typeof id !== 'string' || !WORLDS[id]) throw new Refusal('mondo sconosciuto: ' + id);
  return id;
}

/**
 * Un mondo racconta com'e fatto e fin dove e arrivato. Il punto piu alto
 * raggiunto puo solo salire: un ricalcolo dei prezzi non toglie blocchi gia
 * posati. placed e facoltativo, perche la modalita ?dev, che regala credito
 * finto, riferisce la forma del mondo ma non il suo avanzamento.
 */
function report(reg, data, total, nowIso) {
  const id = knownWorld(data.world);
  const pieces = Math.floor(number(data.pieces, 'pieces'));
  if (pieces < 1) throw new Refusal('pieces non valido');
  const before = reg.worlds[id] || { placed_max: 0 };
  const w = {
    pieces,
    cost_te: number(data.cost_te, 'cost_te'),
    gift_te: number(data.gift_te, 'gift_te'),
    placed_max: Math.min(pieces, before.placed_max || 0),
  };
  if (data.placed !== undefined) {
    w.placed_max = Math.min(pieces, Math.max(w.placed_max, Math.floor(number(data.placed, 'placed'))));
  }
  // un mondo completato che riceve pezzi nuovi - le rifiniture - torna in corso
  w.completed_at = w.placed_max >= pieces ? (before.completed_at || nowIso) : null;
  reg.worlds[id] = w;
  return reg;
}

/**
 * Cambia il mondo che riceve i token. Il tratto del mondo attivo si chiude
 * adesso; se quel mondo era completato, il suo avanzo passa al nuovo. Un
 * mondo lasciato a meta resta in pausa con il suo credito, e lo ritrova
 * quando torna attivo.
 */
function choose(reg, id, total) {
  knownWorld(id);
  if (reg.active === id) return reg;
  if (WORLDS[id].status !== 'available') throw new Refusal(id + ' non e ancora disponibile');
  if (completed(reg, id)) throw new Refusal(id + ' e gia compiuto: si visita, non si costruisce');

  let start = 0;
  for (const s of reg.segments) if (s.to_te !== null) start = Math.max(start, s.to_te);

  if (reg.active) {
    const prev = reg.active;
    const open = reg.segments.find((s) => s.world === prev && s.to_te === null);
    if (open) open.to_te = total;
    const surplus = surplusOf(reg, prev, total);
    if (surplus > 0) reg.transfers.push({ from: prev, to: id, te: surplus });
    start = total;
  }
  // senza un mondo attivo, i TE arrivati nel frattempo vanno al prossimo
  reg.segments.push({ world: id, from_te: start, to_te: null });
  reg.active = id;
  return reg;
}

/**
 * Il piano di Claude di chi usa il progetto. Cambiarlo cambia il valore della
 * settimana, quindi i prezzi di tutti i mondi; i blocchi gia posati restano,
 * come quando cambia il listino.
 */
function setPlan(reg, id) {
  if (typeof id !== 'string' || !planById(id)) throw new Refusal('piano sconosciuto: ' + id);
  reg.plan = id;
  return reg;
}

function unassigned(reg, total) {
  let end = 0;
  for (const s of reg.segments) if (s.to_te !== null) end = Math.max(end, s.to_te);
  return Math.max(0, total - end);
}

/** Quello che serve alla scena e alla pagina iniziale. */
function view(reg, total) {
  const worlds = {};
  for (const id of Object.keys(WORLDS)) {
    const w = reg.worlds[id] || {};
    worlds[id] = {
      status: WORLDS[id].status,
      active: reg.active === id,
      credit_te: creditOf(reg, id, total),
      placed_max: w.placed_max || 0,
      pieces: w.pieces || null,
      cost_te: w.cost_te || null,
      completed: completed(reg, id),
    };
  }
  const plan = planById(reg.plan);
  return {
    active: reg.active,
    /* null finche non lo si sceglie: la pagina iniziale lo chiede, e intanto
       la scena usa il piano predefinito */
    plan: plan ? { id: plan.id, name: plan.name, weekly_te: plan.weekly_te } : null,
    plans: PLANS.plans.map((p) => ({ id: p.id, name: p.name, weekly_te: p.weekly_te, basis: p.basis })),
    default_plan: PLANS.default,
    worlds,
    /* il credito che aspetta un mondo: l'avanzo di un mondo completato e
       ancora attivo, oppure, senza nessun mondo attivo, i TE arrivati da
       quando l'ultimo tratto si e chiuso - al primo avvio, tutti */
    waiting_te: reg.active ? surplusOf(reg, reg.active, total) : unassigned(reg, total),
  };
}

// --------------------------------------------------------------- versioni

const legacyId = (id) => LEGACY_IDS[id] || id;

/** Il registro della fase 1 aveva i campi in italiano: si converte una volta. */
function upgrade(old) {
  if (old.version === VERSION) return old;
  const mondi = old.mondi || {};
  const worlds = {};
  for (const [id, m] of Object.entries(mondi)) {
    worlds[legacyId(id)] = {
      pieces: m.pezzi, cost_te: m.costo_te, gift_te: m.dono_te,
      placed_max: m.posati_max || 0, completed_at: m.completato_at || null,
    };
  }
  return {
    version: VERSION,
    created_at: old.creato_at || old.created_at || new Date().toISOString(),
    active: old.attivo ? legacyId(old.attivo) : null,
    segments: (old.tratti || []).map((t) => ({ world: legacyId(t.mondo), from_te: t.da_te, to_te: t.a_te })),
    transfers: (old.avanzi || []).map((a) => ({ from: legacyId(a.da), to: legacyId(a.a), te: a.te })),
    worlds,
  };
}

// --------------------------------------------------------------- su disco

function valid(reg) {
  return reg && typeof reg === 'object' && Array.isArray(reg.segments) &&
    Array.isArray(reg.transfers) && reg.worlds && typeof reg.worlds === 'object';
}

function parse(file) {
  const reg = upgrade(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (!valid(reg)) throw new Error('forma non valida');
  return reg;
}

// come lo stato del contatore: assente vuol dire primo avvio, illeggibile
// vuol dire incidente, e si torna all'ultima copia buona. dirty dice che va
// riscritto: nuovo, recuperato, o convertito da una versione vecchia.
function read(nowIso) {
  try {
    const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const reg = parse(REGISTRY_PATH);
    return { reg, dirty: raw.version !== VERSION };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { reg: newRegistry(nowIso), dirty: true };
    try {
      return { reg: parse(BACKUP_PATH), dirty: true };
    } catch (_) {
      return { reg: newRegistry(nowIso), dirty: true };
    }
  }
}

function writeAtomic(target, text) {
  const tmp = target + '.' + process.pid + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, target);
}

function write(reg) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  const text = JSON.stringify(reg, null, 2) + '\n';
  writeAtomic(REGISTRY_PATH, text);
  try { writeAtomic(BACKUP_PATH, text); } catch (_) { /* il registro c'e gia */ }
}

module.exports = {
  REGISTRY_PATH, WORLDS, PLANS, Refusal, listWorlds,
  newRegistry, creditOf, surplusOf, completed, report, choose, setPlan, view, upgrade, read, write,
};
