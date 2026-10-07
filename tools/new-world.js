#!/usr/bin/env node
/**
 * Un mondo nuovo, dal modello: npm run new-world -- <id> ["Nome"]
 *
 *   npm run new-world -- babilonia "Babilonia"
 *
 * Copia worlds/_template/ in worlds/<id>/: la pagina, il codice di esempio e
 * un world.json con l'id e il nome dati, segnato "in arrivo" perche la pagina
 * iniziale lo mostri ma non lo lasci ancora scegliere.
 *
 * Se worlds/<id>/world.json c'e gia - un mondo annunciato, come Giza - lo
 * lascia com'e e aggiunge solo pagina e codice. Se il mondo ha gia una pagina,
 * si ferma: non sovrascrive niente.
 *
 * Il percorso dopo, passo per passo, e in docs/creare-un-mondo.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// i test lo spostano in una cartella temporanea
const WORLDS = process.env.ACROPOLI_WORLDS_DIR || path.join(ROOT, 'worlds');
const TEMPLATE = path.join(ROOT, 'worlds', '_template');

function fail(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

const [id, name] = process.argv.slice(2);
if (!id) fail('Uso: npm run new-world -- <id> ["Nome"]   (id: lettere minuscole, cifre e trattini)');
// l'id e il nome della cartella e il nome nel registro: niente spazi, niente
// maiuscole, e niente trattino basso all'inizio, che nasconde la cartella
if (!/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  fail('Id non valido: "' + id + '". Servono lettere minuscole, cifre e trattini, e deve cominciare con una lettera.');
}

const dir = path.join(WORLDS, id);
if (fs.existsSync(path.join(dir, 'index.html'))) fail('Il mondo "' + id + '" ha gia una pagina: non sovrascrivo niente.');

const metaPath = path.join(dir, 'world.json');
const announced = fs.existsSync(metaPath);
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join(TEMPLATE, 'index.html'), path.join(dir, 'index.html'));
fs.cpSync(path.join(TEMPLATE, 'src'), path.join(dir, 'src'), { recursive: true });

if (!announced) {
  const meta = JSON.parse(fs.readFileSync(path.join(TEMPLATE, 'world.json'), 'utf8'));
  // in coda agli altri mondi, nella pagina iniziale
  let order = 0;
  for (const d of fs.readdirSync(WORLDS)) {
    try { order = Math.max(order, JSON.parse(fs.readFileSync(path.join(WORLDS, d, 'world.json'), 'utf8')).order || 0); } catch (_) { /* non e un mondo */ }
  }
  Object.assign(meta, {
    id,
    order: Math.min(order, 98) + 1,
    name: name || id,
    subtitle: '',
    place: '',
    era: '',
    description: '',
    status: 'coming',
    preview: null,
  });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
}

const rel = path.relative(ROOT, dir) || dir;
process.stdout.write([
  '',
  'Mondo "' + id + '" creato in ' + rel + (announced ? ', con il world.json che aveva gia.' : '.'),
  '',
  'Adesso:',
  '  1. ' + (announced ? 'controlla' : 'compila') + ' ' + path.join(rel, 'world.json') + ': luogo, epoca, durata, sole',
  '  2. scrivi il mondo in ' + path.join(rel, 'src', 'main.js') + ' (parte dalla torre di prova)',
  '  3. guardalo: npm start, poi /worlds/' + id + '/?demo=10',
  '  4. quando e pronto: "status": "available" in world.json, e npm run previews -- ' + id,
  '',
  'La guida passo per passo: docs/creare-un-mondo.md',
  '',
].join('\n'));
