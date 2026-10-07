#!/usr/bin/env node
/**
 * Banco di prova del generatore di mondi: node tools/test/new-world-tests.js
 *
 * Lavora in una cartella temporanea passata con ACROPOLI_WORLDS_DIR: non crea
 * mondi veri nel progetto.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const NEW_WORLD = path.join(__dirname, '..', 'new-world.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acropoli-mondi-'));

let falliti = 0;
function verifica(nome, ottenuto, atteso) {
  const a = JSON.stringify(atteso);
  const o = JSON.stringify(ottenuto);
  if (a === o) {
    console.log('  ok    ' + nome + ' = ' + o);
  } else {
    falliti++;
    console.log('  FALLITO ' + nome + '\n          atteso  ' + a + '\n          ottenuto ' + o);
  }
}
const crea = (...args) => spawnSync(process.execPath, [NEW_WORLD, ...args],
  { encoding: 'utf8', env: Object.assign({}, process.env, { ACROPOLI_WORLDS_DIR: TMP }) });
const leggi = (id) => JSON.parse(fs.readFileSync(path.join(TMP, id, 'world.json'), 'utf8'));

// un mondo gia presente, per l'ordine nella pagina iniziale
fs.mkdirSync(path.join(TMP, 'acropolis'));
fs.writeFileSync(path.join(TMP, 'acropolis', 'world.json'), JSON.stringify({ id: 'acropolis', order: 3 }));

// --------------------------------------------------------------------------
console.log('\n1. Un mondo nuovo, dal modello.\n');

let r = crea('babilonia', 'Babilonia');
verifica('exit code', r.status, 0);
verifica('pagina', fs.existsSync(path.join(TMP, 'babilonia', 'index.html')), true);
verifica('codice di esempio', fs.existsSync(path.join(TMP, 'babilonia', 'src', 'main.js')), true);
let m = leggi('babilonia');
verifica('id e nome', [m.id, m.name], ['babilonia', 'Babilonia']);
verifica('in arrivo, finche non e pronto', m.status, 'coming');
verifica('in coda agli altri mondi', m.order, 4);
verifica('i testi del luogo da compilare', [m.place, m.era, m.description], ['', '', '']);
verifica('la pagina prende i testi dal mondo', fs.readFileSync(path.join(TMP, 'babilonia', 'index.html'), 'utf8')
  .includes('data-world="name"'), true);

// --------------------------------------------------------------------------
console.log('\n2. Un mondo gia annunciato tiene il suo world.json.\n');

fs.mkdirSync(path.join(TMP, 'giza'));
const giza = { id: 'giza', order: 2, name: 'Piana di Giza', status: 'coming', place: 'Giza, Egitto' };
fs.writeFileSync(path.join(TMP, 'giza', 'world.json'), JSON.stringify(giza));
r = crea('giza');
verifica('exit code', r.status, 0);
verifica('world.json intatto', leggi('giza'), giza);
verifica('pagina aggiunta', fs.existsSync(path.join(TMP, 'giza', 'index.html')), true);

// --------------------------------------------------------------------------
console.log('\n3. Quello che non va fatto.\n');

r = crea('babilonia');
verifica('un mondo con la pagina non si sovrascrive', [r.status, /gia una pagina/.test(r.stderr)], [1, true]);
for (const id of ['Babilonia', 'foro romano', '_nascosto', '1mondo', 'x']) {
  verifica('id non valido: "' + id + '"', crea(id).status, 1);
}
verifica('senza id spiega come si usa', /Uso:/.test(crea().stderr), true);

// --------------------------------------------------------------------------
console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* il sistema la pulira */ }
process.exitCode = falliti === 0 ? 0 : 1;
