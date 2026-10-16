#!/usr/bin/env node
/**
 * Prova della scena in un browser vero: npm run test:scene
 *
 * Avvia il server con stato e transcript in una cartella temporanea, e fa
 * quello che fa chi usa il progetto, in Chrome (o Edge, o Chromium) senza
 * finestra: apre la pagina iniziale, comincia l'Acropoli, la guarda crescere
 * con un transcript nuovo. Poi la dimostrazione, ?dev, la ricarica dopo un
 * aggiornamento e il server che sparisce.
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
const { spawn } = require('child_process');
const { findBrowser, launch, connect, waitFor, attendi } = require('../chrome.js');

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
function salta(perche) {
  console.log('\nProva della scena saltata: ' + perche + '\n');
  process.exit(0);
}

const PROG = "parseInt(document.getElementById('prog').textContent, 10)";
const FONTE = "document.getElementById('toksrc').textContent";
/* Sulle macchine di GitHub Chrome disegna senza scheda grafica, su due
   processori: su Windows una scena impiega anche un minuto a partire. Le
   attese si allungano, i controlli restano gli stessi. */
const LENTO = process.env.CI ? 3 : 1;

(async () => {
  const browser = findBrowser();
  if (!browser) salta('nessun browser della famiglia Chrome trovato (CHROME_PATH per indicarlo)');
  if (typeof WebSocket === 'undefined') salta('serve Node 22 o successivo, che ha WebSocket');

  const projects = path.join(TMP, 'projects');
  fs.mkdirSync(path.join(projects, 'prova'), { recursive: true });
  fs.writeFileSync(path.join(TMP, 'stamp.txt'), 'prima');
  const env = Object.assign({}, process.env, {
    ACROPOLI_STATE: path.join(TMP, 'state', 'world-state.json'),
    ACROPOLI_LOG: path.join(TMP, 'counter.log'),
    ACROPOLI_PRICING: PRICING,
    ACROPOLI_TRANSCRIPTS: projects,
    // cambiarlo vale come un aggiornamento dei file della scena
    ACROPOLI_CLIENT_STAMP: path.join(TMP, 'stamp.txt'),
  });

  const server = spawn(process.execPath, [SERVER, '0', '--no-browser', '--interval', '0.3'],
    { env, stdio: ['ignore', 'pipe', 'ignore'] });
  const porta = await new Promise((resolve, reject) => {
    let out = '';
    server.stdout.on('data', (c) => { out += c; const m = out.match(/localhost:(\d+)/); if (m) resolve(Number(m[1])); });
    server.on('exit', (c) => reject(new Error('il server si e chiuso, codice ' + c)));
  });
  const base = 'http://localhost:' + porta;
  const registro = async () => (await fetch(base + '/api/registry')).json();

  const debugPort = 9300 + Math.floor(Math.random() * 400);
  const chrome = launch(browser, { profileDir: path.join(TMP, 'p'), debugPort, headed: !!process.env.TEST_SCENE_HEADED });

  try {
    console.log('\n1. La pagina iniziale, al primo avvio: nessun mondo attivo.\n');
    const home = await connect(debugPort, base + '/');
    verifica('tre schede', await waitFor(home.valuta, "document.querySelectorAll('.card').length === 3", 20000), true);
    verifica('stati delle schede', await home.valuta(
      "[...document.querySelectorAll('.card .chip')].map(c => c.textContent)"), ['Da cominciare', 'In arrivo', 'In arrivo']);
    verifica('prima di tutto chiede il piano', await waitFor(home.valuta, "document.getElementById('plan').open", 10000), true);
    verifica('tre piani fra cui scegliere', await home.valuta(
      "[...document.querySelectorAll('#plan .plan-opt')].map(b => b.dataset.plan)"), ['pro', 'max5', 'max20']);
    verifica('niente invito al mondo prima del piano', await home.valuta("document.getElementById('first').hidden"), true);
    await home.valuta("document.getElementById('plan').dispatchEvent(new Event('cancel', { cancelable: true }))");
    verifica('con Esc non si salta la scelta', await home.valuta("document.getElementById('plan').open"), true);
    await home.valuta("document.querySelector('#plan .plan-opt[data-plan=pro]').click()");
    verifica('piano scelto: Pro', await waitFor(async () => ((await registro()).plan || {}).id === 'pro', 'true', 10000), true);
    verifica('e la pagina lo mostra', await waitFor(home.valuta,
      "document.getElementById('plan-name').textContent === 'Pro'", 10000), true);
    verifica('invito a scegliere il primo mondo', await home.valuta("!document.getElementById('first').hidden"), true);
    verifica('i mondi in arrivo non hanno pulsanti', await home.valuta(
      "[...document.querySelectorAll('.card.coming')].every(c => !c.querySelector('.btn'))"), true);
    verifica('il laboratorio si vede, con i suoi ingressi', await home.valuta(
      "[...document.querySelectorAll('#lab .btn')].map(a => a.getAttribute('href'))"),
      ['/worlds/_template/?demo=10', '/worlds/_template/?dev', '/worlds/acropolis/?dev', '/docs/creare-un-mondo.md']);
    const guida = await fetch(base + '/docs/creare-un-mondo.md');
    verifica('la guida si legge nel browser', guida.status + ' ' + guida.headers.get('content-type'),
      '200 text/plain; charset=utf-8');
    const foto = await fetch(base + '/worlds/_template/preview.webp');
    verifica('la torre ha la sua immagine', foto.status, 200);

    console.log('\n2. Comincia l\'Acropoli: conferma, e si entra nel mondo.\n');
    await home.valuta("document.querySelector('.card.new .btn.primary').click()");
    verifica('la conferma si apre', await waitFor(home.valuta, "document.getElementById('confirm').open", 5000), true);
    verifica('e dice dove va il credito', await home.valuta(
      "document.getElementById('confirm-text').textContent.includes('in attesa')"), true);
    await home.valuta("document.getElementById('confirm-ok').click()");
    verifica('si entra nel mondo', await waitFor(home.valuta, "location.pathname === '/worlds/acropolis/'", 10000), true);
    verifica('la scena si apre', await waitFor(home.valuta,
      "(document.getElementById('boot') || {}).className === 'gone'", 45000), true);
    verifica('mondo attivo nel registro', (await registro()).active, 'acropolis');
    verifica('collegata e attiva', await waitFor(home.valuta, FONTE + ".startsWith('cantiere reale')", 10000), true);
    verifica('nessun errore in pagina', home.errori, []);

    console.log('\n3. Un transcript nuovo diventa blocchi posati, e il registro li ricorda.\n');
    await attendi(2500);   // il dono iniziale si posa per primo
    const prima = await home.valuta(PROG);
    // con il listino di prova un token di input di Opus vale 1 TE: tre milioni di TE
    const riga = JSON.stringify({ type: 'assistant', timestamp: new Date(Date.now() + 1000).toISOString(),
      message: { id: 'msg_scena', model: 'claude-opus-5', usage: { input_tokens: 3000000, output_tokens: 0 } } });
    fs.writeFileSync(path.join(projects, 'prova', 'sessione.jsonl'), riga + '\n');
    verifica('il cantiere cresce', await waitFor(home.valuta, PROG + ' > ' + prima, 20000), true);
    await attendi(3000);   // il riporto parte ogni due secondi
    let reg = await registro();
    verifica('il registro ricorda il punto raggiunto', reg.worlds.acropolis.placed_max > prima, true);
    verifica('e conosce la forma del mondo', reg.worlds.acropolis.pieces, 3326);
    verifica('nessun errore durante la posa', home.errori, []);

    console.log('\n4. La pagina iniziale ora mostra l\'Acropoli in costruzione.\n');
    await home.valuta("location.href = '/'");
    await waitFor(home.valuta, "document.querySelectorAll('.card').length === 3", 20000);
    verifica('in costruzione', await waitFor(home.valuta,
      "document.querySelector('.card .chip').textContent === 'In costruzione'", 10000), true);
    verifica('con la barra dell\'avanzamento', await home.valuta("!!document.querySelector('.card .bar i')"), true);
    verifica('niente piu invito', await home.valuta("document.getElementById('first').hidden"), true);

    console.log('\n5. La dimostrazione: costruisce in fretta, e non tocca il registro.\n');
    const posatiPrima = (await registro()).worlds.acropolis.placed_max;
    await home.valuta("location.href = '/worlds/acropolis/?demo'");
    await waitFor(home.valuta, "(document.getElementById('boot') || {}).className === 'gone'", 45000);
    verifica('lo dice', await waitFor(home.valuta, FONTE + ".startsWith('dimostrazione')", 10000), true);
    const d0 = await home.valuta(PROG);
    await attendi(5000);
    const d1 = await home.valuta(PROG);
    verifica('la dimostrazione avanza', d1 > d0, true);
    await attendi(2500);
    verifica('il registro non si e mosso', (await registro()).worlds.acropolis.placed_max, posatiPrima);

    console.log('\n6. ?dev mostra i comandi; una scheda vecchia si ricarica da sola.\n');
    const dev = await connect(debugPort, base + '/worlds/acropolis/?dev');
    await waitFor(dev.valuta, "document.body.classList.contains('dev')", 30000 * LENTO);
    verifica('comandi visibili', await dev.valuta("getComputedStyle(document.querySelector('.row2')).display"), 'flex');
    verifica('collegata, prima di aggiornare i file', await waitFor(dev.valuta, FONTE + ".startsWith('cantiere reale')", 20000 * LENTO), true);
    await dev.valuta('window.__vecchia = true');
    fs.writeFileSync(path.join(TMP, 'stamp.txt'), 'dopo');
    verifica('si e ricaricata', await waitFor(dev.valuta, 'window.__vecchia !== true', 20000 * LENTO), true);
    verifica('e riparte collegata', await waitFor(dev.valuta, FONTE + ".startsWith('cantiere reale')", 30000 * LENTO), true);

    console.log('\n7. Il modello dei mondi nuovi si apre, prende i testi da world.json e costruisce.\n');
    const tpl = await connect(debugPort, base + '/worlds/_template/?demo');
    /* la scheda e la stessa di prima: si aspetta di essere davvero sulla
       torre, non su una ricarica arrivata in ritardo */
    verifica('si apre', await waitFor(tpl.valuta,
      "location.pathname === '/worlds/_template/' && (document.getElementById('boot') || {}).className === 'gone'", 45000 * LENTO), true);
    verifica('nome dal world.json', await tpl.valuta("document.querySelector('h1').textContent"), 'Torre di prova');
    verifica('titolo della scheda', await tpl.valuta('document.title'), 'Torre di prova — TokenStone');
    verifica('ora e data del sole', await tpl.valuta("document.querySelector('[data-world=solar]').textContent"),
      'Ora a Nessun luogo · 21 giugno');
    verifica('costruisce', await waitFor(tpl.valuta, PROG + ' > 3', 30000 * LENTO), true);
    verifica('nessun errore', tpl.errori, []);
    // aperto senza ?demo: non e nel registro, e deve dirlo cosi
    await tpl.valuta("location.href = '/worlds/_template/'");
    verifica('fuori dal registro, e lo dice', await waitFor(tpl.valuta,
      FONTE + ".startsWith('fuori dal registro')", 45000), true);

    console.log('\n7b. Un piano piu grande: la stessa Acropoli costa cinque volte tanto.\n');
    const costoPro = (await registro()).worlds.acropolis.cost_te;
    const cambio = await fetch(base + '/api/registry', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'plan', plan: 'max5' }) });
    verifica('piano cambiato in Max 5x', cambio.status, 200);
    await dev.valuta("location.href = '/worlds/acropolis/?dev'");
    verifica('la scena riferisce i prezzi nuovi', await waitFor(async () => {
      const c = (await registro()).worlds.acropolis.cost_te;
      return Math.abs(c / costoPro - 5) < .01;
    }, 'true', 45000), true);
    verifica('i blocchi posati non cambiano', (await registro()).worlds.acropolis.placed_max >= posatiPrima, true);

    console.log('\n8. Se il server sparisce, la scena lo dice invece di sembrare collegata.\n');
    // la stessa scheda torna al cantiere vero: una dimostrazione il server non lo interroga
    await tpl.valuta("location.href = '/worlds/acropolis/'");
    await waitFor(tpl.valuta, FONTE + ".startsWith('cantiere reale')", 45000);
    server.kill();
    verifica('scollegata', await waitFor(tpl.valuta, FONTE + ".startsWith('scollegato')", 30000), true);
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
