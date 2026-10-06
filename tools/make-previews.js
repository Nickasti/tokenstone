#!/usr/bin/env node
/**
 * Le immagini delle schede nella pagina iniziale: npm run previews
 *
 * Per ogni mondo disponibile apre la sua scena in modalita scatto - tutto
 * costruito, niente pannelli, l'ora e l'inquadratura scelte dal mondo - in un
 * Chrome senza finestra, e salva worlds/<id>/preview.webp. Si rifa quando un
 * mondo cambia aspetto. I mondi in arrivo, che una scena non l'hanno ancora,
 * hanno una sagoma disegnata a mano: preview.svg.
 *
 * Il server parte con stato e transcript in una cartella temporanea: lo
 * scatto non legge e non scrive il cantiere vero.
 *
 *   node tools/make-previews.js [id ...]   solo alcuni mondi
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { findBrowser, launch, connect, waitFor, attendi } = require('./chrome.js');

const ROOT = path.resolve(__dirname, '..');
const WIDTH = 1600;
const HEIGHT = 1000;

(async () => {
  const browser = findBrowser();
  if (!browser) { console.error('Serve Chrome, Edge o Chromium (CHROME_PATH per indicarlo).'); process.exit(1); }
  if (typeof WebSocket === 'undefined') { console.error('Serve Node 22 o successivo.'); process.exit(1); }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'acp-'));
  const env = Object.assign({}, process.env, {
    ACROPOLI_STATE: path.join(tmp, 'state', 'world-state.json'),
    ACROPOLI_LOG: path.join(tmp, 'counter.log'),
    ACROPOLI_TRANSCRIPTS: path.join(tmp, 'projects'),
  });
  const server = spawn(process.execPath, [path.join(ROOT, 'tools', 'server.js'), '0', '--no-browser'],
    { env, stdio: ['ignore', 'pipe', 'ignore'] });
  const porta = await new Promise((resolve, reject) => {
    let out = '';
    server.stdout.on('data', (c) => { out += c; const m = out.match(/localhost:(\d+)/); if (m) resolve(Number(m[1])); });
    server.on('exit', (c) => reject(new Error('il server si e chiuso, codice ' + c)));
  });
  const base = 'http://localhost:' + porta;

  const scelti = process.argv.slice(2);
  const mondi = (await (await fetch(base + '/api/worlds')).json())
    .filter((w) => w.status === 'available' && w.has_page && (!scelti.length || scelti.includes(w.id)));

  const debugPort = 9300 + Math.floor(Math.random() * 400);
  const chrome = launch(browser, { profileDir: path.join(tmp, 'p'), debugPort, width: WIDTH, height: HEIGHT });
  let errori = 0;
  try {
    for (const w of mondi) {
      process.stdout.write('  ' + w.id + ': ');
      const t = await connect(debugPort, base + '/worlds/' + w.id + '/?snapshot');
      let pronta = await waitFor(t.valuta, 'window.__snapshotReady === true', 120000);
      if (!pronta) {
        // a volte il browser senza finestra si inceppa al primo caricamento: si riprova una volta
        process.stdout.write('(riprovo) ');
        await t.call('Page.reload', {});
        pronta = await waitFor(t.valuta, 'window.__snapshotReady === true', 120000);
      }
      if (!pronta) {
        const stato = await t.valuta("JSON.stringify({ url: location.href, boot: (document.getElementById('boot') || {}).className, " +
          "testo: (document.getElementById('boot') || {}).textContent, visibile: document.visibilityState })");
        console.log('la scena non e pronta dopo due minuti, salto\n    ' + stato +
          (t.errori.length ? '\n    errori: ' + t.errori.join('; ') : ''));
        errori++;
        t.ws.close();
        continue;
      }
      await attendi(500);
      const shot = await t.call('Page.captureScreenshot', { format: 'webp', quality: 82 });
      const file = path.join(ROOT, 'worlds', w.id, 'preview.webp');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(path.relative(ROOT, file) + ', ' + Math.round(fs.statSync(file).size / 1024) + ' KB' +
        (t.errori.length ? ' (errori in pagina: ' + t.errori.join('; ') + ')' : ''));
      t.ws.close();
    }
  } finally {
    chrome.kill();
    server.kill();
    await attendi(500);
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { /* il sistema la pulira */ }
  }
  process.exitCode = errori ? 1 : 0;
})().catch((err) => { console.error(err.message); process.exit(1); });
