/**
 * Porta lo stato di un'installazione vecchia nella forma attuale.
 *
 * Fino alla fase 2 lo stato stava in world/, e il registro si chiamava
 * cantiere.json. Ora la cartella e state/ - world/ si confondeva con worlds/,
 * dove stanno i mondi - e il registro e registry.json. Lo spostamento si fa
 * una volta, al primo avvio, e non tocca niente se state/ c'e gia.
 *
 * Non fa niente quando i percorsi sono stati spostati apposta, come nei test.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const MOVES = [
  ['world-state.json', 'world-state.json'],
  ['.world-state.bak', '.world-state.bak'],
  ['cantiere.json', 'registry.json'],
  ['.cantiere.bak', '.registry.bak'],
];

function migrateLegacyState(root) {
  const base = root || ROOT;
  if (!root && (process.env.ACROPOLI_STATE || process.env.ACROPOLI_REGISTRY)) return [];
  const from = path.join(base, 'world');
  const to = path.join(base, 'state');
  if (!fs.existsSync(from) || fs.existsSync(path.join(to, 'world-state.json'))) return [];

  fs.mkdirSync(to, { recursive: true });
  const moved = [];
  for (const [a, b] of MOVES) {
    const src = path.join(from, a);
    const dst = path.join(to, b);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.renameSync(src, dst);
      moved.push(a === b ? a : a + ' -> ' + b);
    }
  }
  // quello che resta sono lock e file temporanei di processi gia finiti
  try {
    for (const e of fs.readdirSync(from)) {
      if (e.endsWith('.lock') || e.endsWith('.tmp')) fs.rmSync(path.join(from, e), { recursive: true, force: true });
    }
    fs.rmdirSync(from);
  } catch (_) { /* resta qualcosa che non e nostro: la cartella rimane */ }
  return moved;
}

module.exports = { migrateLegacyState };
