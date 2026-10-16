#!/usr/bin/env node
/**
 * Quello che serve per capire un problema, da incollare in una segnalazione:
 *
 *   npm run diagnosi
 *
 * Stampa in Markdown la versione di TokenStone, di Node, di Claude Code e
 * del sistema, se il server e acceso, cosa sa il contatore e cosa ricorda il
 * registro, e le ultime righe del diario del contatore.
 *
 * Non stampa niente di personale: niente testo dei messaggi (il contatore non
 * lo legge mai), niente nomi di progetti o di sessioni, e i percorsi hanno la
 * cartella dell'utente sostituita da ~. Prima di incollarla, la si puo
 * rileggere: e tutta li.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync, execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const counter = require('./token-counter/counter.js');
const registry = require('./registry.js');
const { findBrowser } = require('./chrome.js');

/* la cartella dell'utente, in tutte le grafie, diventa ~ */
const HOME = os.homedir();
const homes = [HOME, HOME.replace(/\\/g, '/'), HOME.replace(/\\/g, '\\\\')];
function anon(text) {
  let s = String(text);
  for (const h of homes) if (h) s = s.split(h).join('~');
  return s.replace(new RegExp(os.userInfo().username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '<utente>');
}

const QUIET = { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] };
function git(...args) {
  try { return execFileSync('git', ['-C', ROOT, ...args], QUIET).trim(); } catch (_) { return null; }
}
/* claude su Windows e un claude.cmd, che si lancia solo attraverso la shell */
function claudeVersion() {
  try { return execSync('claude --version', QUIET).trim(); } catch (_) { return null; }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function serverAlive() {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: 8000, path: '/__tokenstone', timeout: 1500 }, (res) => {
      let b = ''; res.on('data', (c) => { b += c; }); res.on('end', () => resolve(/tokenstone/.test(b)));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function countTranscripts(dir) {
  let files = 0, folders = 0;
  try {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      folders++;
      for (const f of fs.readdirSync(path.join(dir, d.name))) if (f.endsWith('.jsonl')) files++;
    }
  } catch (_) { return null; }
  return { folders, files };
}

(async () => {
  const out = [];
  const line = (k, v) => out.push(`- **${k}:** ${v}`);

  out.push('### Diagnosi di TokenStone', '');
  const commit = git('log', '-1', '--format=%h %cd', '--date=short');
  const pkg = readJson(path.join(ROOT, 'package.json')) || {};
  line('Versione', `${pkg.version || '?'}${commit ? ` (commit ${commit})` : ''}`);
  const dirty = git('status', '--porcelain');
  if (dirty) line('File modificati in locale', dirty.split('\n').length);
  line('Sistema', `${os.type()} ${os.release()} (${process.platform}, ${os.arch()})`);
  line('Node', process.version);
  line('Claude Code', claudeVersion() || 'non trovato nel PATH');
  const browser = findBrowser();
  line('Browser per le prove', browser ? path.basename(browser) : 'nessuno della famiglia Chrome trovato');
  line('Server su 127.0.0.1:8000', (await serverAlive()) ? 'acceso' : 'spento');

  out.push('', '#### Contatore', '');
  const t = countTranscripts(counter.TRANSCRIPTS_ROOT);
  line('Cartella dei transcript', `${anon(counter.TRANSCRIPTS_ROOT)} - ` +
    (t ? `${t.folders} progetti, ${t.files} sessioni` : 'non trovata'));
  const st = readJson(counter.STATE_PATH);
  if (!st) {
    line('Stato', 'non ancora creato: TokenStone non e mai stato avviato, o lo stato e in un altro posto');
  } else {
    line('Installato il', st.installed_at || '?');
    line('Ultimo aggiornamento', st.updated_at || '?');
    line('TE totali', Math.round(st.total_te || 0).toLocaleString('it-IT'));
    line('Sessioni contate', Object.keys(st.sessions || {}).length);
    const models = {};
    for (const s of Object.values(st.sessions || {})) {
      if (s.model) models[s.model] = (models[s.model] || 0) + (s.messages || 0);
    }
    line('Modelli (messaggi)', Object.entries(models).map(([m, n]) => `${m} (${n})`).join(', ') || 'nessuno');
    if (st.unknown_models && st.unknown_models.length) line('Modelli senza prezzo', st.unknown_models.join(', '));
    if (st.model_fallbacks && Object.keys(st.model_fallbacks).length) {
      line('Prezzi presi da un modello vicino', JSON.stringify(st.model_fallbacks));
    }
  }

  out.push('', '#### Registro', '');
  const { reg } = registry.read(new Date().toISOString());
  const v = registry.view(reg, (st && st.total_te) || 0);
  line('Piano', v.plan ? `${v.plan.name} (${v.plan.weekly_te.toLocaleString('it-IT')} TE a settimana)` : 'non ancora scelto');
  line('Mondo attivo', v.active || 'nessuno');
  for (const [id, w] of Object.entries(v.worlds)) {
    if (!w.pieces && !w.credit_te) continue;
    line(id, `${w.placed_max}/${w.pieces || '?'} blocchi, credito ${Math.round(w.credit_te).toLocaleString('it-IT')} TE` +
      (w.cost_te ? `, costo ${Math.round(w.cost_te).toLocaleString('it-IT')} TE` : '') + (w.completed ? ', compiuto' : ''));
  }
  if (v.waiting_te) line('TE in attesa', Math.round(v.waiting_te).toLocaleString('it-IT'));

  out.push('', '#### Ultime righe del diario del contatore', '', '```');
  try {
    const log = fs.readFileSync(counter.LOG_PATH, 'utf8').trim().split('\n').slice(-12);
    out.push(...log.map(anon));
  } catch (_) { out.push('(nessun diario)'); }
  out.push('```', '');

  process.stdout.write(anon(out.join('\n')) + '\n');
})();
