#!/usr/bin/env node
/**
 * Controlla un listino prima che il contatore lo usi.
 *
 *   node tools/token-counter/check-pricing.js              il listino vero
 *   node tools/token-counter/check-pricing.js nuovo.json   un listino candidato
 *
 * Esce con 1 se il file non e valido, e dice perche. Poi, se c'e uno stato,
 * elenca i modelli che il cantiere ha incontrato e che il listino non copre:
 * sono quelli il cui prezzo e ancora una stima.
 *
 * Controlla la forma, non i valori. Se un prezzo sia giusto lo dice solo la
 * pagina ufficiale di Anthropic.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validatePricing, PRICING_PATH, STATE_PATH } = require('./counter.js');

const file = path.resolve(process.argv[2] || PRICING_PATH);

let raw;
try {
  raw = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  process.stderr.write('listino illeggibile (' + file + '): ' + err.message + '\n');
  process.exit(1);
}

const errors = validatePricing(raw);
if (errors.length) {
  process.stderr.write('listino non valido (' + file + '):\n' + errors.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}

const ids = Object.keys(raw.models);
process.stdout.write('listino valido: ' + ids.length + ' modelli (' + ids.join(', ') + ')\n');
if (raw._fonte) process.stdout.write('  fonte: ' + raw._fonte + '\n');
if (raw._aggiornato) process.stdout.write('  aggiornato: ' + raw._aggiornato + '\n');

// Quali modelli mancano ancora, secondo quello che il cantiere ha visto. Il
// nome "(fast)" vuol dire che manca la maggiorazione della modalita veloce.
let state = null;
try { state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch (_) { /* nessuno stato */ }
const seen = state && Array.isArray(state.unknown_models) ? state.unknown_models : [];
const missing = seen.filter((label) => {
  const fast = label.endsWith(' (fast)');
  const id = fast ? label.slice(0, -' (fast)'.length) : label;
  const p = raw.models[id];
  return !p || (fast && !p.fast_multiplier);
});
if (missing.length) {
  process.stdout.write('ancora senza prezzo, secondo lo stato: ' + missing.join(', ') + '\n');
} else if (seen.length) {
  process.stdout.write('copre tutti i modelli che lo stato segnalava: ' + seen.join(', ') + '\n');
}
