#!/usr/bin/env node
/**
 * Prova dei file di avvio: quello del sistema su cui gira accende davvero il
 * server.
 *
 *   Windows  TokenStone.cmd
 *   macOS    TokenStone.command, e anche tokenstone.sh
 *   Linux    tokenstone.sh
 *
 * Ogni file passa i suoi argomenti al server: qui "0 --no-browser", cioe una
 * porta libera qualsiasi e nessun browser. Lo stato va in una cartella
 * temporanea, i transcript pure: la prova non tocca il cantiere vero.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-avvio-'));

let falliti = 0;
function verifica(nome, ottenuto, atteso) {
  const a = JSON.stringify(atteso), o = JSON.stringify(ottenuto);
  if (a === o) console.log('  ok    ' + nome + ' = ' + o);
  else { falliti++; console.log('  FALLITO ' + nome + '\n          atteso  ' + a + '\n          ottenuto ' + o); }
}

const env = Object.assign({}, process.env, {
  ACROPOLI_STATE: path.join(TMP, 'state', 'world-state.json'),
  ACROPOLI_LOG: path.join(TMP, 'counter.log'),
  ACROPOLI_TRANSCRIPTS: path.join(TMP, 'projects'),
});

/* chiude il file di avvio e il server che ha acceso: su Windows il cmd e il
   node sono due processi, e si chiude l'albero intero */
function stop(child) {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-child.pid, 'SIGTERM'); } catch (_) { child.kill(); } }
}

async function prova(file) {
  const win = process.platform === 'win32';
  const child = win
    // cmd vuole la riga intera, con il percorso fra virgolette: la cartella puo avere spazi
    ? spawn('cmd.exe', ['/d', '/s', '/c', '""' + path.join(ROOT, file) + '" 0 --no-browser"'],
        { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsVerbatimArguments: true })
    : spawn(path.join(ROOT, file), ['0', '--no-browser'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  let out = '';
  child.stdout.on('data', (c) => { out += c; });
  child.stderr.on('data', (c) => { out += c; });
  const porta = await new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 20000);
    const guarda = () => { const m = out.match(/localhost:(\d+)/); if (m) { clearTimeout(t); resolve(Number(m[1])); } };
    child.stdout.on('data', guarda);
    child.on('exit', () => { clearTimeout(t); resolve(null); });
  });
  verifica(file + ': il server si accende', porta !== null, true);
  if (porta) {
    let risposta = null;
    try { risposta = await (await fetch('http://127.0.0.1:' + porta + '/__tokenstone')).json(); } catch (_) { /* resta null */ }
    verifica(file + ': e risponde', risposta && risposta.app, 'tokenstone');
  } else {
    console.log('          uscita: ' + out.trim().split('\n').slice(-5).join(' | '));
  }
  stop(child);
}

(async () => {
  console.log('\nI file di avvio di questo sistema (' + process.platform + ').\n');
  const files = process.platform === 'win32' ? ['TokenStone.cmd']
    : process.platform === 'darwin' ? ['TokenStone.command', 'tokenstone.sh'] : ['tokenstone.sh'];
  for (const f of files) {
    if (process.platform !== 'win32') {
      verifica(f + ': eseguibile', (fs.statSync(path.join(ROOT, f)).mode & 0o111) !== 0, true);
    }
    await prova(f);
  }
  await new Promise((r) => setTimeout(r, 500));
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* il sistema la pulira */ }
  console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
  process.exitCode = falliti === 0 ? 0 : 1;
})();
