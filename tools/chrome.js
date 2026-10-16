/**
 * Guidare un browser della famiglia Chrome dal suo protocollo di debug.
 *
 * Serve alla prova della scena (tools/test/scene-tests.js) e agli scatti per
 * le schede della pagina iniziale (tools/make-previews.js). Nessuna
 * dipendenza: il protocollo parla WebSocket, che Node ha da solo dalla
 * versione 22.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

/** Chrome, Edge o Chromium: il primo che c'e. CHROME_PATH per indicarne uno. */
function findBrowser() {
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

/**
 * Avvia il browser. Il profilo va in una cartella dal percorso corto: con
 * percorsi lunghi, su Windows Chrome non riesce ad aprire la propria cache.
 */
function launch(browser, { profileDir, debugPort, headed = false, width = 1280, height = 800 }) {
  return spawn(browser, [
    ...(headed ? [] : ['--headless=new']),
    '--remote-debugging-port=' + debugPort, '--user-data-dir=' + profileDir,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    // WebGL anche senza scheda grafica: la scena e three.js
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    // sulle macchine delle prove automatiche (Linux di GitHub) la sandbox di Chrome non parte
    ...(process.env.CI ? ['--no-sandbox'] : []),
    '--hide-scrollbars', '--window-size=' + width + ',' + height, 'about:blank',
  ], { stdio: 'ignore' });
}

/** Una connessione a una scheda, che va subito all'indirizzo dato. */
async function connect(debugPort, url) {
  let pagina = null;
  for (let i = 0; i < 60 && !pagina; i++) {
    try {
      const lista = await (await fetch('http://127.0.0.1:' + debugPort + '/json')).json();
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
  if (url) await call('Page.navigate', { url });
  const valuta = async (expr) => {
    const r = await call('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r && r.result ? r.result.value : undefined;
  };
  return { ws, valuta, call, errori };
}

/** Aspetta che un'espressione nella pagina diventi vera, fino a ms. */
async function waitFor(valuta, expr, ms) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    try { if (await valuta(expr)) return true; } catch (_) { /* pagina in caricamento */ }
    await attendi(250);
  }
  return false;
}

module.exports = { findBrowser, launch, connect, waitFor, attendi };
