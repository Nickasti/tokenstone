#!/usr/bin/env node
/**
 * Toglie dal grafo il percorso del computer su cui e stato costruito.
 *
 *   npm run graph      aggiorna il grafo (graphify update .) e poi lo pulisce
 *
 * graphify da a ogni nodo un nome ricavato dal percorso del file, relativo
 * alla cartella del progetto, piu il nome del simbolo. Quando il simbolo non
 * ha lettere - la funzione $() di home/home.js - il nome coincide con quello
 * del file, e per distinguerli graphify ci mette davanti il percorso intero:
 * c_users_<nome>_desktop_..._home_home. Nel grafo finirebbe il nome di chi
 * l'ha costruito. Qui quei nodi prendono un nome relativo e unico, e lo
 * stesso cambio si fa in graph.json, graph.html e nel report.
 *
 * La cache delle estrazioni e le copie con la data, che graphify lascia
 * accanto, hanno percorsi assoluti dappertutto: non si versionano
 * (.gitignore), e restano su questo computer.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'graphify-out');
// come graphify fa i nomi: minuscole, tutto il resto diventa un trattino basso
const PREFIX = ROOT.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') + '_';

const graphFile = path.join(OUT, 'graph.json');
let graph;
try { graph = JSON.parse(fs.readFileSync(graphFile, 'utf8')); } catch (_) {
  process.stdout.write('  nessun grafo da pulire\n');
  process.exit(0);
}

/* i nomi nuovi: senza il prefisso, e se cosi coincidono con un altro nodo,
   con il simbolo scritto in lettere */
const ids = new Set(graph.nodes.map((n) => n.id));
const SYMBOLS = { '$': 'dollaro', '_': 'trattino', '#': 'cancelletto', '@': 'chiocciola' };
const renames = new Map();
for (const n of graph.nodes) {
  if (!n.id.startsWith(PREFIX)) continue;
  let id = n.id.slice(PREFIX.length);
  if (ids.has(id)) {
    const word = [...String(n.label || '')].map((ch) => SYMBOLS[ch] || (/[a-z0-9]/i.test(ch) ? ch : '')).join('') || 'simbolo';
    id = id + '_' + word.toLowerCase();
    for (let k = 2; ids.has(id); k++) id = id.replace(/_\d+$/, '') + '_' + k;
  }
  ids.add(id);
  renames.set(n.id, id);
}

if (!renames.size) {
  process.stdout.write('  il grafo non contiene il percorso di questo computer\n');
  process.exit(0);
}

/* lo stesso cambio nei tre file: i nomi vecchi sono lunghi e unici, una
   sostituzione di testo fra virgolette basta e non tocca altro */
for (const name of ['graph.json', 'graph.html', 'GRAPH_REPORT.md']) {
  const file = path.join(OUT, name);
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
  let n = 0;
  for (const [from, to] of renames) {
    const parts = text.split(from);
    n += parts.length - 1;
    text = parts.join(to);
  }
  if (n) fs.writeFileSync(file, text);
  process.stdout.write(`  ${name}: ${n} riferimenti ripuliti\n`);
}
for (const [from, to] of renames) process.stdout.write(`  ${from.slice(0, 24)}... -> ${to}\n`);
