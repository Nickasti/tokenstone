#!/usr/bin/env node
/**
 * Contatore di token del cantiere.
 *
 * Claude Code scrive da solo il transcript di ogni sessione in
 * ~/.claude/projects/<progetto>/<sessione>.jsonl. Il contatore legge quei
 * file, pesa il consumo sul prezzo di listino e riscrive
 * world/world-state.json. Il mondo legge quel file e cresce.
 *
 * Non serve nessun hook e nessuna configurazione: basta che giri sulla stessa
 * macchina dove si usa Claude Code, in qualunque forma (terminale, estensione,
 * app desktop). Il server della scena lo avvia da solo.
 *
 * Conta solo quello che succede dopo il primo avvio. La prima scansione fissa
 * installed_at, e tutto quello che c'era prima resta fuori: il cantiere parte
 * da quando hai scaricato il progetto, non dalla tua storia.
 *
 * Ricalcola sempre da zero e non somma mai: due scansioni sullo stesso disco
 * danno lo stesso numero.
 *
 * Dai transcript legge solo i contatori in message.usage, il modello,
 * l'orario e la cartella di lavoro, per sapere da quale progetto arriva una
 * sessione. Il testo dei messaggi non viene mai guardato.
 *
 * Uso:
 *   node counter.js                    una scansione, poi esce
 *   node counter.js --watch            scansione continua, ogni 5 secondi
 *   node counter.js --watch --interval 10
 *   node counter.js --print            stampa il riepilogo su stdout
 *   node counter.js --dry-run --pricing nuovo.json
 *                                      prova un listino senza scrivere niente
 *   node counter.js --dry-run --since 2026-09-28T19:05
 *                                      quanto e stato consumato da una data in poi
 *
 * Il server della scena (tools/server.js) lo carica come modulo e chiama
 * startWatching(): stesso processo, nessun programma da sorvegliare.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT_DIR = __dirname;
const APP_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

// Gli override servono ai test, per non sporcare lo stato vero.
const PRICING_PATH = process.env.ACROPOLI_PRICING || path.join(SCRIPT_DIR, 'pricing.json');
const LOG_PATH = process.env.ACROPOLI_LOG || path.join(SCRIPT_DIR, 'counter.log');
const STATE_PATH = process.env.ACROPOLI_STATE || path.join(APP_ROOT, 'world', 'world-state.json');
const STATE_DIR = path.dirname(STATE_PATH);
const LOCK_PATH = path.join(STATE_DIR, '.world-state.lock');
const BACKUP_PATH = path.join(STATE_DIR, '.world-state.bak');

// Dove Claude Code tiene i transcript. CLAUDE_CONFIG_DIR e' la stessa
// variabile che usa Claude Code per spostare la sua cartella.
const TRANSCRIPTS_ROOT = process.env.ACROPOLI_TRANSCRIPTS || path.join(
  process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');

const DEFAULT_INTERVAL_S = 5;
const LOCK_WAIT_MS = 3000;
const LOCK_STALE_MS = 30000;
const LOG_MAX_BYTES = 512 * 1024;
const WALK_MAX_DEPTH = 4;

// --------------------------------------------------------------- diagnostica

function log(msg) {
  try {
    let stat = null;
    try { stat = fs.statSync(LOG_PATH); } catch (_) { /* non esiste ancora */ }
    if (stat && stat.size > LOG_MAX_BYTES) {
      fs.writeFileSync(LOG_PATH, new Date().toISOString() + '  --- log troncato ---\n');
    }
    fs.appendFileSync(LOG_PATH, new Date().toISOString() + '  ' + msg + '\n');
  } catch (_) {
    // il log non ha il diritto di far fallire il contatore
  }
}

function parseArgs(argv) {
  const out = { watch: false, interval: DEFAULT_INTERVAL_S, print: false, dryRun: false, pricing: null, since: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--watch') out.watch = true;
    else if (a === '--print') out.print = true;
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--pricing') out.pricing = argv[++i] || null;
    else if (a === '--since') out.since = argv[++i] || null;
    else if (a === '--interval') {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) out.interval = n;
    }
  }
  return out;
}

// -------------------------------------------------------------------- prezzi

const PRICE_FIELDS = ['input', 'cache_write_5m', 'cache_write_1h', 'cache_read', 'output'];

/**
 * Tutto quello che non va in un listino, come elenco di frasi. Vuoto vuol
 * dire buono. Controlla la forma, non i valori: le proporzioni fra le voci
 * cambiano da un modello all'altro (la lettura di cache vale un decimo
 * dell'input su Opus 5, un ventesimo su Opus 5.5), e una regola fissa
 * rifiuterebbe proprio i prezzi giusti.
 */
function validatePricing(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return ['il listino non è un oggetto JSON'];
  const tePerUsd = Number(raw.te_per_usd);
  if (!Number.isFinite(tePerUsd) || tePerUsd <= 0) errors.push('te_per_usd non valido');
  if (!raw.models || typeof raw.models !== 'object' || !Object.keys(raw.models).length) {
    errors.push('nessun modello in "models"');
    return errors;
  }
  if (!raw.models[raw.default_model]) {
    errors.push('default_model "' + raw.default_model + '" non è in models');
  }
  for (const [id, p] of Object.entries(raw.models)) {
    if (!p || typeof p !== 'object') { errors.push(id + ': non è un oggetto'); continue; }
    for (const f of PRICE_FIELDS) {
      const v = p[f];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) errors.push(id + '.' + f + ' manca o non è un numero');
    }
    if (p.input === 0 || p.output === 0) errors.push(id + ': input e output non possono valere zero');
    if ('fast_multiplier' in p) {
      const m = p.fast_multiplier;
      if (typeof m !== 'number' || !Number.isFinite(m) || m < 1) errors.push(id + '.fast_multiplier deve essere un numero >= 1');
    }
  }
  return errors;
}

function loadPricing(file) {
  const raw = JSON.parse(fs.readFileSync(file || PRICING_PATH, 'utf8'));
  const errors = validatePricing(raw);
  if (errors.length) throw new Error('listino non valido: ' + errors.join('; '));
  return { models: raw.models, tePerUsd: Number(raw.te_per_usd), fallbackKey: raw.default_model };
}

const DATED = /^-\d{8}$/;

/**
 * Risolve il modello del messaggio.
 *
 * Esatto, o la stessa voce con una data in coda (claude-sonnet-5-20260101):
 * prezzo certo. Altrimenti si prende la voce piu lunga che ne e prefisso
 * (claude-opus-5-5 -> claude-opus-5), o il default se non ce n'e nessuna, e
 * il modello finisce fra gli sconosciuti: il prezzo e una stima, e
 * pricing.json va aggiornato. Vince sempre la voce piu specifica, non la
 * prima trovata.
 */
function resolveModel(modelId, pricing) {
  const id = typeof modelId === 'string' ? modelId.trim() : '';
  if (id && pricing.models[id]) {
    return { key: id, prices: pricing.models[id], known: true };
  }
  let best = null;
  if (id) {
    for (const key of Object.keys(pricing.models)) {
      if (!id.startsWith(key + '-')) continue;
      if (!best || key.length > best.length) best = key;
    }
  }
  if (best && DATED.test(id.slice(best.length))) {
    return { key: best, prices: pricing.models[best], known: true };
  }
  const key = best || pricing.fallbackKey;
  return { key, prices: pricing.models[key], known: false, reported: id };
}

function costUsd(u, p) {
  return (
    (u.input / 1e6) * p.input +
    (u.cw5m / 1e6) * p.cache_write_5m +
    (u.cw1h / 1e6) * p.cache_write_1h +
    (u.cache_read / 1e6) * p.cache_read +
    (u.output / 1e6) * p.output
  );
}

// ---------------------------------------------------------------- transcript

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Estrae i cinque contatori che pesano. Quando `cache_creation` porta il
 * dettaglio 5m/1h si usa quello e si ignora `cache_creation_input_tokens`,
 * che è la loro somma: contarli entrambi raddoppierebbe la scrittura di cache.
 */
function usageOf(usage) {
  const cc = usage.cache_creation;
  let cw5m = 0;
  let cw1h = 0;
  const hasDetail = cc && typeof cc === 'object' &&
    ('ephemeral_5m_input_tokens' in cc || 'ephemeral_1h_input_tokens' in cc);
  if (hasDetail) {
    cw5m = num(cc.ephemeral_5m_input_tokens);
    cw1h = num(cc.ephemeral_1h_input_tokens);
  } else {
    // senza dettaglio la scrittura di cache vale come quella a 5 minuti
    cw5m = num(usage.cache_creation_input_tokens);
  }
  return {
    input: num(usage.input_tokens),
    cw5m,
    cw1h,
    cache_read: num(usage.cache_read_input_tokens),
    output: num(usage.output_tokens),
  };
}

function walkJsonl(dir, depth, out) {
  if (depth > WALK_MAX_DEPTH) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkJsonl(full, depth + 1, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

/**
 * Elenca le sessioni sul disco. Claude Code scrive <progetto>/<sessione>.jsonl;
 * i subagenti possono finire in una cartella con il nome della sessione
 * (<sessione>/subagents/*.jsonl) o in file affiancati (<sessione>-agent-x.jsonl).
 * Tutto quello che appartiene a una sessione viene raggruppato sotto di lei.
 * Le cartelle senza transcript, come memory/, non producono niente.
 */
function discover(root) {
  const sessions = new Map();
  let projectDirs;
  try {
    projectDirs = fs.readdirSync(root, { withFileTypes: true });
  } catch (err) {
    return { ok: false, error: err, sessions };
  }

  const add = (id, projectDir, file) => {
    if (!sessions.has(id)) sessions.set(id, { id, projectDir, files: [] });
    sessions.get(id).files.push(file);
  };

  for (const pd of projectDirs) {
    if (!pd.isDirectory()) continue;
    const dir = path.join(root, pd.name);
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }

    const tops = entries
      .filter((e) => e.isFile() && e.name.endsWith('.jsonl'))
      .map((e) => e.name.slice(0, -'.jsonl'.length));
    const ids = new Set(tops);

    for (const name of tops) {
      let owner = name;
      for (const id of ids) {
        if (id !== name && (name.startsWith(id + '-') || name.startsWith(id + '.'))) { owner = id; break; }
      }
      add(owner, pd.name, path.join(dir, name + '.jsonl'));
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      for (const f of walkJsonl(path.join(dir, e.name), 1, [])) add(e.name, pd.name, f);
    }
  }
  return { ok: true, sessions };
}

function emptyStats() {
  return { lines: 0, malformed: 0, noTimestamp: 0, beforeInstall: 0 };
}

function addStats(a, b) {
  a.lines += b.lines;
  a.malformed += b.malformed;
  a.noTimestamp += b.noTimestamp;
  a.beforeInstall += b.beforeInstall;
}

/*
 * Memoria dei file gia letti. I transcript crescono solo in coda, quindi a
 * ogni giro si legge soltanto quello che e stato aggiunto: la sessione in
 * corso costa qualche riga, le altre niente. Se un file si accorcia vuol dire
 * che e stato riscritto, e lo si rilegge da capo.
 *
 * In una scansione singola la memoria e vuota e si legge tutto.
 */
const fileCache = new Map();
let cacheInstalledAtMs = null;

function freshEntry() {
  return { size: 0, mtimeMs: 0, offset: 0, cwd: '', msgs: new Map(), stats: emptyStats() };
}

function ingestLine(c, line, where, installedAtMs) {
  const text = line.trim();
  if (!text) return;
  c.stats.lines++;
  let entry;
  try {
    entry = JSON.parse(text);
  } catch (_) {
    c.stats.malformed++;
    return;
  }
  if (!entry || typeof entry !== 'object') return;
  if (!c.cwd && typeof entry.cwd === 'string' && entry.cwd) c.cwd = entry.cwd;

  if (entry.type !== 'assistant') return;
  const msg = entry.message;
  if (!msg || typeof msg !== 'object') return;
  if (!msg.usage || typeof msg.usage !== 'object') return;
  // messaggi che Claude Code scrive da se, senza nessun modello dietro
  if (msg.model === '<synthetic>') return;

  const ts = Date.parse(entry.timestamp);
  if (!Number.isFinite(ts)) { c.stats.noTimestamp++; return; }
  if (ts < installedAtMs) { c.stats.beforeInstall++; return; }

  // Il transcript riscrive lo stesso messaggio a ogni passo dello streaming:
  // vale l'occorrenza con piu output, perche solo l'ultima e completa.
  const key = (typeof msg.id === 'string' && msg.id) ? msg.id : '__senza-id:' + where;
  const usage = usageOf(msg.usage);
  const model = typeof msg.model === 'string' ? msg.model : '';
  // la modalita veloce costa un multiplo del prezzo normale
  const fast = msg.usage.speed === 'fast';
  const prev = c.msgs.get(key);
  if (!prev) {
    c.msgs.set(key, { usage, model, fast, ts });
  } else {
    if (usage.output > prev.usage.output) { prev.usage = usage; prev.model = model; prev.fast = fast; }
    if (ts < prev.ts) prev.ts = ts;
  }
}

function readTranscript(file, installedAtMs) {
  let st;
  try {
    st = fs.statSync(file);
  } catch (_) {
    fileCache.delete(file);
    return null;
  }

  let c = fileCache.get(file);
  if (c && c.size === st.size && c.mtimeMs === st.mtimeMs) return c;
  if (!c || st.size < c.offset) c = freshEntry();

  // non toccato da quando il cantiere esiste: non puo contenere niente che conti
  if (st.mtimeMs < installedAtMs) {
    c.size = st.size;
    c.mtimeMs = st.mtimeMs;
    c.offset = st.size;
    fileCache.set(file, c);
    return c;
  }

  const len = st.size - c.offset;
  if (len > 0) {
    const buf = Buffer.alloc(len);
    let fd = null;
    try {
      fd = fs.openSync(file, 'r');
      fs.readSync(fd, buf, 0, len, c.offset);
    } catch (err) {
      log('transcript illeggibile ' + file + ': ' + err.message);
      return fileCache.get(file) || null;
    } finally {
      if (fd !== null) try { fs.closeSync(fd); } catch (_) { /* niente */ }
    }

    // Si consumano solo le righe complete. L'ultima, se manca l'a capo, puo
    // essere a meta scrittura: la si prende solo se e gia JSON valido,
    // altrimenti la si riprova al giro dopo.
    let consumed = 0;
    let start = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] !== 0x0a) continue;
      ingestLine(c, buf.toString('utf8', start, i), file + ':' + (c.offset + start), installedAtMs);
      start = i + 1;
      consumed = start;
    }
    if (start < buf.length) {
      const tail = buf.toString('utf8', start);
      let complete = false;
      try { JSON.parse(tail); complete = true; } catch (_) { /* a meta */ }
      if (complete) {
        ingestLine(c, tail, file + ':' + (c.offset + start), installedAtMs);
        consumed = buf.length;
      }
    }
    c.offset += consumed;
  }

  c.size = st.size;
  c.mtimeMs = st.mtimeMs;
  fileCache.set(file, c);
  return c;
}

/**
 * Raccoglie tutti i messaggi del disco in un solo elenco, una voce per
 * message.id. Lo stesso messaggio puo comparire in piu file - una sessione
 * ripresa puo ricopiare la conversazione precedente - e contarlo due volte
 * gonfierebbe il cantiere. Ogni messaggio appartiene alla sessione in cui e
 * comparso per primo.
 */
function collect(found, installedAtMs) {
  const global = new Map();
  const info = new Map();

  for (const s of found.sessions.values()) {
    const si = { project: '', files: 0, stats: emptyStats() };
    for (const file of s.files) {
      const c = readTranscript(file, installedAtMs);
      if (!c) continue;
      si.files++;
      addStats(si.stats, c.stats);
      if (!si.project && c.cwd) si.project = c.cwd.split(/[\\/]/).filter(Boolean).pop() || '';
      for (const [key, m] of c.msgs) {
        const g = global.get(key);
        if (!g) {
          global.set(key, { usage: m.usage, model: m.model, fast: m.fast, ts: m.ts, session: s.id });
          continue;
        }
        if (m.usage.output > g.usage.output) { g.usage = m.usage; g.model = m.model; g.fast = m.fast; }
        if (m.ts < g.ts || (m.ts === g.ts && s.id < g.session)) { g.ts = m.ts; g.session = s.id; }
      }
    }
    if (!si.project) si.project = s.projectDir;
    info.set(s.id, si);
  }

  const bySession = new Map();
  for (const m of global.values()) {
    if (!bySession.has(m.session)) bySession.set(m.session, []);
    bySession.get(m.session).push(m);
  }
  return { info, bySession, all: Array.from(global.values()) };
}

function aggregate(messages, pricing) {
  const tokens = { input: 0, cw5m: 0, cw1h: 0, cache_read: 0, output: 0 };
  const unknown = new Set();
  const fallbacks = {};
  const costByModel = new Map();
  let usd = 0;

  for (const item of messages) {
    const resolved = resolveModel(item.model, pricing);
    if (!resolved.known && resolved.reported) {
      unknown.add(resolved.reported);
      fallbacks[resolved.reported] = resolved.key;
    }
    let cost = costUsd(item.usage, resolved.prices);
    if (item.fast) {
      const mult = resolved.prices.fast_multiplier;
      if (mult) {
        cost *= mult;
      } else {
        // modalita veloce senza maggiorazione nel listino: il conto resta al
        // prezzo normale, cioe troppo basso, e lo si dice
        const label = (resolved.reported || resolved.key) + ' (fast)';
        unknown.add(label);
        fallbacks[label] = resolved.key + ' a prezzo normale';
      }
    }
    usd += cost;
    tokens.input += item.usage.input;
    tokens.cw5m += item.usage.cw5m;
    tokens.cw1h += item.usage.cw1h;
    tokens.cache_read += item.usage.cache_read;
    tokens.output += item.usage.output;
    const label = resolved.known ? resolved.key : (resolved.reported || resolved.key);
    costByModel.set(label, (costByModel.get(label) || 0) + cost);
  }

  // il modello della sessione è quello che ha pesato di più sul conto
  let model = '';
  let best = -1;
  for (const entry of costByModel) {
    if (entry[1] > best) { best = entry[1]; model = entry[0]; }
  }

  return {
    tokens,
    usd: Math.round(usd * 1e6) / 1e6,
    te: Math.round(usd * pricing.tePerUsd),
    model,
    unknown: Array.from(unknown).sort(),
    fallbacks,
  };
}

// --------------------------------------------------------------------- stato

function emptyState(nowIso) {
  return {
    installed_at: nowIso,
    updated_at: nowIso,
    total_te: 0,
    total_usd: 0,
    sessions: {},
    unknown_models: [],
    model_fallbacks: {},
  };
}

function parseState(file, nowIso) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object') throw new Error('lo stato non è un oggetto');
  const state = emptyState(nowIso);
  if (typeof parsed.installed_at === 'string' && Number.isFinite(Date.parse(parsed.installed_at))) {
    state.installed_at = parsed.installed_at;
  }
  if (typeof parsed.updated_at === 'string') state.updated_at = parsed.updated_at;
  if (parsed.sessions && typeof parsed.sessions === 'object') state.sessions = parsed.sessions;
  if (Array.isArray(parsed.unknown_models)) state.unknown_models = parsed.unknown_models;
  if (parsed.model_fallbacks && typeof parsed.model_fallbacks === 'object') {
    state.model_fallbacks = parsed.model_fallbacks;
  }
  return state;
}

// Stato assente e stato illeggibile non sono la stessa cosa. Assente vuol dire
// prima installazione, o reset voluto: si parte da zero. Illeggibile vuol dire
// un incidente, e ripartire da zero costerebbe installed_at e ogni altra
// sessione: si torna all'ultima copia buona.
function readState(nowIso) {
  try {
    return { state: parseState(STATE_PATH, nowIso), fresh: false };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { state: emptyState(nowIso), fresh: true };
    try {
      const state = parseState(BACKUP_PATH, nowIso);
      log('stato illeggibile (' + err.message + '), riparto dalla copia di riserva');
      return { state, fresh: false, recovered: true };
    } catch (errBak) {
      log('stato illeggibile (' + err.message + ') e nessuna copia di riserva usabile, ricomincio da zero');
      return { state: emptyState(nowIso), fresh: true };
    }
  }
}

function sleepSync(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (_) { /* pazienza */ }
}

// Una scansione manuale puo incrociarsi con quella del server: una directory
// è la primitiva di lock atomica che si comporta uguale su Windows e su Unix.
function acquireLock() {
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      fs.mkdirSync(LOCK_PATH, { recursive: false });
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        // la cartella dello stato non esiste ancora
        try { fs.mkdirSync(STATE_DIR, { recursive: true }); continue; } catch (_) { return false; }
      }
      if (err.code !== 'EEXIST') return false;
      try {
        if (Date.now() - fs.statSync(LOCK_PATH).mtimeMs > LOCK_STALE_MS) {
          fs.rmdirSync(LOCK_PATH);
          continue;
        }
      } catch (_) { /* è sparito da solo */ }
      if (Date.now() > deadline) {
        log('lock occupato oltre il tempo di attesa, scrivo lo stesso');
        return false;
      }
      sleepSync(50);
    }
  }
}

function releaseLock(held) {
  if (!held) return;
  try { fs.rmdirSync(LOCK_PATH); } catch (_) { /* già rimosso */ }
}

// Scrittura atomica: il mondo non deve mai leggere un file a metà.
function writeAtomic(target, text) {
  const tmp = path.join(STATE_DIR, '.world-state.' + process.pid + '.' + Date.now() + '.tmp');
  fs.writeFileSync(tmp, text);
  try {
    fs.renameSync(tmp, target);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (_) { /* niente */ }
    throw err;
  }
}

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const text = JSON.stringify(state, null, 2) + '\n';
  writeAtomic(STATE_PATH, text);
  // la copia di riserva segue lo stato buono; se non riesce, lo stato c'è già
  try {
    writeAtomic(BACKUP_PATH, text);
  } catch (err) {
    log('copia di riserva non scritta: ' + err.message);
  }
}

function recomputeTotals(state) {
  let te = 0;
  let usd = 0;
  for (const s of Object.values(state.sessions)) {
    te += Number(s && s.te) || 0;
    usd += Number(s && s.usd) || 0;
  }
  state.total_te = Math.round(te);
  state.total_usd = Math.round(usd * 1e6) / 1e6;
}

function fingerprint(state) {
  return JSON.stringify([state.installed_at, state.sessions, state.unknown_models, state.model_fallbacks]);
}

/**
 * Porta nello stato il risultato della scansione.
 *
 * Le sessioni trovate sul disco vengono ricalcolate e sovrascritte. Quelle
 * che non ci sono piu restano com'erano, segnate come archiviate: Claude Code
 * cancella da solo i transcript vecchi, ma il consumo c'e stato e il
 * cantiere non deve perdere i blocchi che ha gia pagato.
 */
function applyScan(state, scan, pricing, nowIso) {
  for (const [id, si] of scan.info) {
    const msgs = scan.bySession.get(id) || [];
    if (!msgs.length) {
      delete state.sessions[id];
      continue;
    }
    const agg = aggregate(msgs, pricing);
    const prev = state.sessions[id];
    const entry = {
      te: agg.te,
      usd: agg.usd,
      model: agg.model,
      project: si.project,
      messages: msgs.length,
      tokens: agg.tokens,
    };
    const same = prev && !prev.archived && prev.te === entry.te && prev.messages === entry.messages &&
      prev.project === entry.project && prev.model === entry.model;
    entry.updated_at = same && prev.updated_at ? prev.updated_at : nowIso;
    state.sessions[id] = entry;
  }

  for (const id of Object.keys(state.sessions)) {
    if (!scan.info.has(id) && !state.sessions[id].archived) {
      state.sessions[id].archived = true;
      log('sessione ' + id + ' non piu sul disco: la tengo, archiviata');
    }
  }

  const all = aggregate(scan.all, pricing);
  state.unknown_models = all.unknown;
  state.model_fallbacks = all.fallbacks;
  recomputeTotals(state);
}

// ------------------------------------------------------------- orchestrazione

/** Quanto pesa ogni modello sul conto: serve a vedere l'effetto di un listino. */
function byModel(messages, pricing) {
  const groups = new Map();
  for (const m of messages) {
    const r = resolveModel(m.model, pricing);
    const label = (r.known ? r.key : (r.reported || r.key)) + (m.fast ? ' (fast)' : '');
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(m);
  }
  const out = {};
  for (const [label, list] of Array.from(groups).sort()) {
    const a = aggregate(list, pricing);
    out[label] = { messages: list.length, te: a.te, usd: a.usd };
  }
  return out;
}

/**
 * Una scansione completa. Restituisce lo stato e se e cambiato qualcosa.
 *
 * Con write: false e una prova: si calcola tutto, anche con un listino
 * diverso (pricingPath), ma niente viene scritto e il lock non si prende.
 * E cosi che si vede l'effetto di un listino nuovo prima di adottarlo.
 */
function scanOnce(opts) {
  const { pricingPath = null, write = true, since = null } = opts || {};
  // contare da una data qualsiasi e solo una prova: lo stato vero ha la sua
  if (since && write) throw new Error('--since si usa solo con --dry-run');
  const nowIso = new Date().toISOString();
  const pricing = loadPricing(pricingPath);
  const held = write ? acquireLock() : false;
  try {
    // recuperato dalla copia: va riscritto anche se i numeri non cambiano,
    // altrimenti il file principale resta rotto
    const letto = since ? { state: emptyState(nowIso), fresh: false, recovered: false } : readState(nowIso);
    if (since) {
      const ms = Date.parse(since);
      if (!Number.isFinite(ms)) throw new Error('--since: data non valida, "' + since + '"');
      letto.state.installed_at = new Date(ms).toISOString();
    }
    const { state, fresh, recovered } = letto;
    const installedAtMs = Date.parse(state.installed_at);

    // installed_at cambiato vuol dire stato azzerato: quello che ricordo
    // dei file e stato filtrato con un'altra data, e non vale piu
    if (cacheInstalledAtMs !== installedAtMs) {
      fileCache.clear();
      cacheInstalledAtMs = installedAtMs;
    }

    const before = fresh ? null : fingerprint(state);
    const found = discover(TRANSCRIPTS_ROOT);
    if (!found.ok) {
      // Niente cartella: Claude Code non e mai stato usato su questa
      // macchina, o tiene i transcript altrove. Lo stato si crea lo stesso,
      // cosi installed_at resta fissato al primo avvio.
      if (fresh && write) {
        writeState(state);
        log('cartella dei transcript non trovata (' + TRANSCRIPTS_ROOT + '): stato creato, in attesa');
      }
      return { state, changed: fresh, found: false, models: {} };
    }

    const scan = collect(found, installedAtMs);
    applyScan(state, scan, pricing, nowIso);
    const models = byModel(scan.all, pricing);

    const changed = fresh || recovered || before !== fingerprint(state);
    if (!write) return { state, changed, found: true, sessionsOnDisk: found.sessions.size, models };
    if (changed) {
      state.updated_at = nowIso;
      writeState(state);
      let messages = 0;
      for (const list of scan.bySession.values()) messages += list.length;
      log('scansione: ' + found.sessions.size + ' sessioni sul disco, ' + messages +
        ' messaggi contati - totale ' + state.total_te + ' TE, $' + state.total_usd.toFixed(4) +
        (state.unknown_models.length ? ' - modelli senza prezzo: ' + state.unknown_models.join(', ') : ''));
    }
    return { state, changed, found: true, sessionsOnDisk: found.sessions.size, models };
  } finally {
    releaseLock(held);
  }
}

function summary(res) {
  const state = res.state;
  const archived = Object.values(state.sessions).filter((s) => s && s.archived);
  return {
    installed_at: state.installed_at,
    total_te: state.total_te,
    total_usd: state.total_usd,
    sessions: Object.keys(state.sessions).length,
    // le archiviate non hanno piu transcript: tengono il prezzo con cui
    // erano state contate, qualunque listino si usi adesso
    archived_te: archived.reduce((n, s) => n + (Number(s.te) || 0), 0),
    by_model: res.models,
    unknown_models: state.unknown_models,
    model_fallbacks: state.model_fallbacks,
  };
}

/**
 * Scansione continua, nello stesso processo di chi la chiama: il server della
 * scena la avvia accanto a se, e quando il server si spegne si spegne anche
 * lei. Restituisce la funzione per fermarla.
 */
function startWatching(intervalS) {
  let failing = false;
  const tick = () => {
    try {
      scanOnce();
      if (failing) { log('scansione di nuovo regolare'); failing = false; }
    } catch (err) {
      // un giro andato male non ferma il cantiere; lo si dice una volta sola
      if (!failing) log('errore nella scansione: ' + (err && err.stack ? err.stack : err));
      failing = true;
    }
  };
  tick();
  const timer = setInterval(tick, (intervalS || DEFAULT_INTERVAL_S) * 1000);
  return () => clearInterval(timer);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.watch) {
    process.stdout.write('contatore: leggo ' + TRANSCRIPTS_ROOT + ', scrivo ' + STATE_PATH +
      ', ogni ' + args.interval + ' s\n');
    startWatching(args.interval);
    return;
  }
  try {
    const res = scanOnce({ pricingPath: args.pricing, write: !args.dryRun, since: args.since });
    if (args.print || args.dryRun) process.stdout.write(JSON.stringify(summary(res), null, 2) + '\n');
    if (!res.found) {
      process.stderr.write('cartella dei transcript non trovata: ' + TRANSCRIPTS_ROOT + '\n');
    }
  } catch (err) {
    log('errore: ' + (err && err.stack ? err.stack : err));
    process.stderr.write('contatore: ' + (err && err.message ? err.message : err) + '\n');
    process.exitCode = 1;
  }
}

module.exports = {
  scanOnce, startWatching, validatePricing, PRICE_FIELDS,
  STATE_PATH, PRICING_PATH, TRANSCRIPTS_ROOT, LOG_PATH, DEFAULT_INTERVAL_S,
};

// da riga di comando fa da se; richiesto dal server, aspetta di essere chiamato
if (require.main === module) main();
