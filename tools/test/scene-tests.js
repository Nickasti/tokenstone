#!/usr/bin/env node
/**
 * Prova della scena in un browser vero: npm run test:scene
 *
 * Avvia il server con stato e transcript in una cartella temporanea, apre la
 * scena in Chrome (o Edge, o Chromium) senza finestra e la guida dal
 * protocollo di debug: la radice porta al mondo, la scena parte senza errori,
 * un transcript nuovo diventa blocchi posati, e il registro li ricorda.
 *
 * Senza un browser della famiglia Chrome, o con un Node troppo vecchio per
 * parlare il protocollo (serve WebSocket, da Node 22), la prova si salta e
 * lo dice: non e un fallimento.
 *
 *   CHROME_PATH=/percorso/del/browser  per indicarne uno preciso
 *   TEST_SCENE_HEADED=1                per guardarla in una finestra
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER = path.join(ROOT, 'tools', 'server.js');
const PRICING = path.join(ROOT, 'tools', 'token-counter', 'test', 'pricing-test.json');
// un percorso corto: con profili dai percorsi lunghi Chrome su Windows non apre la sua cache
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-'));

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
const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

function trovaBrowser() {
  if (process.env.CHROME_PATH) return fs.existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : null;
  const candidati = process.platform === 'win32' ? [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ] : process.platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ] : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']
    .map((n) => spawnSync('which', [n], { encoding: 'utf8' }).stdout.trim()).filter(Boolean);
  return candidati.find((p) => p && fs.existsSync(p)) || null;
}

function salta(perche) {
  console.log('\nProva della scena saltata: ' + perche + '\n');
  process.exit(0);
}

/** Una connessione al protocollo di debug di una scheda. */
async function collega(port, url) {
  let pagina = null;
  for (let i = 0; i < 60 && !pagina; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
      pagina = lista.find((t) => t.type === 'page');
    } catch (_) { /* il browser non e ancora pronto */ }
    if (!pagina) await attendi(250);
  }
  if (!pagina) throw new Error('il browser non ha aperto nessuna scheda');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.addEventListener('open', r); ws.addEventListener('error', e); });
  let id = 0;
  const attese = new Map();
  const errori = [];
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && attese.has(m.id)) { attese.get(m.id)(m.result || m.error); attese.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errori.push(m.params.exceptionDetails.exception
      ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
  });
  const call = (method, params) => new Promise((r) => {
    const my = ++id; attese.set(my, r);
    ws.send(JSON.stringify({ id: my, method, params: params || {} }));
  });
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Page.navigate', { url });
  const valuta = async (expr) => {
    const r = await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r && r.result ? r.result.value : undefined;
  };
  return { ws, valuta, call, errori };
}

async function aspetta(valuta, expr, ms) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    try { if (await valuta(expr)) return true; } catch (_) { /* pagina in caricamento */ }
    await attendi(250);
  }
  return false;
}

(async () => {
  const browser = trovaBrowser();
  if (!browser) salta('nessun browser della famiglia Chrome trovato (CHROME_PATH per indicarlo)');
  if (typeof WebSocket === 'undefined') salta('serve Node 22 o successivo, che ha WebSocket');

  const projects = path.join(TMP, 'projects');
  fs.mkdirSync(path.join(projects, 'prova'), { recursive: true });
  const env = Object.assign({}, process.env, {
    ACROPOLI_STATE: path.join(TMP, 'state', 'world-state.json'),
    ACROPOLI_LOG: path.join(TMP, 'counter.log'),
    ACROPOLI_PRICING: PRICING,
    ACROPOLI_TRANSCRIPTS: projects,
    // cambiarlo vale come un aggiornamento dei file della scena
    ACROPOLI_CLIENT_STAMP: path.join(TMP, 'stamp.txt'),
  });
  fs.writeFileSync(path.join(TMP, 'stamp.txt'), 'prima');

  const server = spawn(process.execPath, [SERVER, '0', '--no-browser', '--interval', '0.3'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] });
  const porta = await new Promise((resolve, reject) => {
    let out = '';
    server.stdout.on('data', (c) => { out += c; const m = out.match(/localhost:(\d+)/); if (m) resolve(Number(m[1])); });
    server.on('exit', (c) => reject(new Error('il server si e chiuso, codice ' + c)));
  });
  const base = 'http://localhost:' + porta;

  const debugPort = 9300 + Math.floor(Math.random() * 400);
  const chrome = spawn(browser, [
    ...(process.env.TEST_SCENE_HEADED ? [] : ['--headless=new']),
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + path.join(TMP, 'p'),
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,800', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    console.log('\n1. La radice porta al mondo, e la scena parte senza errori.\n');
    const { valuta, errori } = await collega(debugPort, base + '/');
    verifica('la scena si apre', await aspetta(valuta,
      "document.getElementById('boot') && document.getElementById('boot').className.includes('gone')", 45000), true);
    verifica('indirizzo del mondo', await valuta('location.pathname'), '/worlds/acropolis/');
    verifica('nessun errore in pagina', errori, []);
    verifica('niente messaggio d\'errore', await valuta("document.getElementById('boot').className.includes('err')"), false);
    verifica('collegata al registro', await aspetta(valuta,
      "document.getElementById('toksrc').textContent.startsWith('cantiere reale')", 10000), true);

    console.log('\n2. Un transcript nuovo diventa blocchi posati, e il registro li ricorda.\n');
    const prog = () => valuta("parseInt(document.getElementById('prog').textContent.replace(/\\D.*$/, ''), 10)");
    await attendi(2500);   // il dono iniziale si posa per primo
    const prima = await prog();
    // con il listino di prova un token di input di Opus vale 1 TE: tre milioni di TE
    const riga = JSON.stringify({ type: 'assistant', timestamp: new Date(Date.now() + 1000).toISOString(),
      message: { id: 'msg_scena', model: 'claude-opus-5', usage: { input_tokens: 3000000, output_tokens: 0 } } });
    fs.writeFileSync(path.join(projects, 'prova', 'sessione.jsonl'), riga + '\n');
    verifica('il cantiere cresce', await aspetta(valuta,
      "parseInt(document.getElementById('prog').textContent, 10) > " + prima, 20000), true);
    await attendi(3000);   // il riporto parte ogni due secondi
    const reg = await (await fetch(base + '/api/registry')).json();
    const dopo = await prog();
    verifica('il registro ricorda il punto raggiunto', reg.worlds.acropolis.placed_max > prima, true);
    verifica('e conosce la forma del mondo', reg.worlds.acropolis.pieces, 3280);
    verifica('nessun errore durante la posa', errori, []);
    console.log('        (' + prima + ' blocchi col dono iniziale, ' + dopo + ' dopo tre milioni di TE)');

    console.log('\n3. ?dev passa attraverso la radice e mostra i comandi.\n');
    const dev = await collega(debugPort, base + '/?dev');
    await aspetta(dev.valuta, "location.search === '?dev' && document.body.classList.contains('dev')", 30000);
    verifica('indirizzo con ?dev', await dev.valuta('location.pathname + location.search'), '/worlds/acropolis/?dev');
    verifica('comandi visibili', await dev.valuta("getComputedStyle(document.querySelector('.row2')).display"), 'flex');

    console.log('\n4. Una scheda aperta prima di un aggiornamento si ricarica da sola.\n');
    await dev.valuta('window.__vecchia = true');
    fs.writeFileSync(path.join(TMP, 'stamp.txt'), 'dopo');
    verifica('si e ricaricata', await aspetta(dev.valuta, 'window.__vecchia !== true', 20000), true);
    verifica('e riparte collegata', await aspetta(dev.valuta,
      "document.getElementById('toksrc').textContent.startsWith('cantiere reale')", 30000), true);

    console.log('\n5. Se il server sparisce, la scena lo dice invece di sembrare collegata.\n');
    server.kill();
    verifica('scollegata', await aspetta(dev.valuta,
      "document.getElementById('toksrc').textContent.startsWith('scollegato')", 30000), true);
  } catch (err) {
    falliti++;
    console.log('  FALLITO ' + err.message);
  } finally {
    chrome.kill();
    server.kill();
    await attendi(500);
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* il sistema la pulira */ }
  }

  console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
  process.exitCode = falliti === 0 ? 0 : 1;
})();
