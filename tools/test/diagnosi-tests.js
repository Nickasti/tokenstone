#!/usr/bin/env node
/**
 * Prova di npm run diagnosi: stampa quello che serve, e niente di personale.
 *
 * Lo stato del contatore che le si da contiene il nome di un progetto e l'id
 * di una sessione, e il diario un percorso dentro la cartella dell'utente:
 * nessuno dei tre deve comparire nell'uscita.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-diag-'));

let falliti = 0;
function verifica(nome, ottenuto, atteso) {
  const a = JSON.stringify(atteso), o = JSON.stringify(ottenuto);
  if (a === o) console.log('  ok    ' + nome + ' = ' + o);
  else { falliti++; console.log('  FALLITO ' + nome + '\n          atteso  ' + a + '\n          ottenuto ' + o); }
}

const SEGRETO = 'progetto-riservato-xyz';
const SESSIONE = '0f0f0f0f-aaaa-bbbb-cccc-123456789abc';
fs.mkdirSync(path.join(TMP, 'state'));
fs.writeFileSync(path.join(TMP, 'state', 'world-state.json'), JSON.stringify({
  installed_at: '2026-10-01T10:00:00.000Z', updated_at: '2026-10-02T10:00:00.000Z', total_te: 1234567,
  sessions: { [SESSIONE]: { te: 1234567, model: 'claude-opus-5-5', project: SEGRETO, messages: 42 } },
  unknown_models: [], model_fallbacks: {}
}));
fs.writeFileSync(path.join(TMP, 'counter.log'),
  '2026-10-02T10:00:00.000Z  cartella dei transcript non trovata (' + path.join(os.homedir(), '.claude', 'projects') + ')\n');

console.log('\n1. La diagnosi si stampa, con le sue parti.\n');
const r = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'diagnosi.js')], {
  encoding: 'utf8', timeout: 30000,
  env: Object.assign({}, process.env, {
    ACROPOLI_STATE: path.join(TMP, 'state', 'world-state.json'),
    ACROPOLI_REGISTRY: path.join(TMP, 'state', 'registry.json'),
    ACROPOLI_LOG: path.join(TMP, 'counter.log'),
    ACROPOLI_TRANSCRIPTS: path.join(TMP, 'projects'),
  }),
});
const out = r.stdout || '';
verifica('esce senza errore', r.status, 0);
verifica('ha il titolo', out.includes('### Diagnosi di TokenStone'), true);
verifica('dice i TE del contatore', out.includes('1.234.567'), true);
verifica('dice i modelli usati', out.includes('claude-opus-5-5 (42)'), true);
verifica('dice che il piano non e scelto', out.includes('non ancora scelto'), true);

console.log('\n2. Niente di personale.\n');
verifica('niente nome del progetto', out.includes(SEGRETO), false);
verifica('niente id della sessione', out.includes(SESSIONE), false);
verifica('niente cartella dell\'utente', out.includes(os.homedir()), false);
verifica('il percorso del diario diventa ~', out.includes('~'), true);

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* il sistema la pulira */ }
console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
process.exitCode = falliti === 0 ? 0 : 1;
