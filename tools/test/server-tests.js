#!/usr/bin/env node
/**
 * Banco di prova del server. Lo avvia su una porta libera, con stato, log e
 * transcript in una cartella temporanea: non tocca niente di vero.
 *
 *   node tools/test/server-tests.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const net = require('net');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const SERVER = path.join(__dirname, '..', 'server.js');
const PRICING = path.join(__dirname, '..', 'token-counter', 'test', 'pricing-test.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acropoli-server-'));
const STATE = path.join(TMP, 'world', 'world-state.json');
const PROJECTS = path.join(TMP, 'projects');
fs.mkdirSync(PROJECTS, { recursive: true });

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

/** Una richiesta col percorso esatto, senza che il client lo normalizzi. */
function richiesta(port, percorso, method, body, headers) {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, path: percorso, method: method || 'GET', headers: headers || {} }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({
        status: res.statusCode,
        type: (res.headers['content-type'] || '').split(';')[0],
        cache: res.headers['cache-control'],
        body,
      }));
    });
    req.setTimeout(3000, () => { req.destroy(); resolve({ status: 'nessuna risposta' }); });
    req.on('error', (e) => resolve({ status: 'errore ' + e.code }));
    req.end(body === undefined ? undefined : body);
  });
}

function avvia() {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [SERVER, '0', '--no-browser', '--interval', '0.3'], {
      env: Object.assign({}, process.env, {
        ACROPOLI_STATE: STATE,
        ACROPOLI_LOG: path.join(TMP, 'counter.log'),
        ACROPOLI_PRICING: PRICING,
        ACROPOLI_TRANSCRIPTS: PROJECTS,
      }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    proc.stdout.on('data', (c) => {
      out += c;
      const m = out.match(/localhost:(\d+)/);
      if (m) resolve({ proc, port: Number(m[1]) });
    });
    proc.on('exit', (code) => reject(new Error('il server si e chiuso subito, codice ' + code)));
    setTimeout(() => reject(new Error('il server non ha detto su che porta ascolta')), 5000);
  });
}

(async () => {
  const avvio = Date.now();
  const { proc, port } = await avvia();
  try {
    console.log('\n1. I file della scena, col tipo giusto.\n');

    let r = await richiesta(port, '/');
    verifica('pagina', [r.status, r.type], [200, 'text/html']);
    verifica('niente cache', r.cache, 'no-store');
    r = await richiesta(port, '/src/main.js');
    verifica('modulo come JavaScript', [r.status, r.type], [200, 'text/javascript']);
    r = await richiesta(port, '/', 'HEAD');
    verifica('HEAD senza corpo', [r.status, r.body], [200, '']);
    r = await richiesta(port, '/non-esiste.js');
    verifica('file assente', r.status, 404);
    r = await richiesta(port, '/', 'POST');
    verifica('solo lettura', r.status, 405);

    console.log('\n1b. Quello che serve per installare la scena come app.\n');

    r = await richiesta(port, '/manifest.webmanifest');
    verifica('manifesto', [r.status, r.type], [200, 'application/manifest+json']);
    const manifesto = JSON.parse(r.body || '{}');
    for (const icona of manifesto.icons || []) {
      const ri = await richiesta(port, icona.src);
      verifica('icona ' + icona.src.split('/').pop(), [ri.status, ri.type], [200, icona.type]);
    }
    r = await richiesta(port, '/sw.js');
    verifica('service worker come JavaScript', [r.status, r.type], [200, 'text/javascript']);
    r = await richiesta(port, '/spento.html');
    verifica('pagina "cantiere spento"', [r.status, r.type], [200, 'text/html']);
    r = await richiesta(port, '/__acropoli');
    verifica('il server si riconosce', JSON.parse(r.body || '{}').app, 'acropoli');

    console.log('\n1c. Un secondo avvio sulla stessa porta non fallisce: trova il');
    console.log('    cantiere acceso, lo dice ed esce, cosi il doppio clic e sicuro.\n');

    const doppio = spawn(process.execPath, [SERVER, String(port), '--no-browser'], {
      env: Object.assign({}, process.env, { ACROPOLI_STATE: STATE, ACROPOLI_TRANSCRIPTS: PROJECTS }),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let detto = '';
    doppio.stdout.on('data', (c) => { detto += c; });
    const uscita = await new Promise((res) => doppio.on('exit', res));
    verifica('esce senza errore', uscita, 0);
    verifica('e dice che e gia acceso', /gia acceso/.test(detto), true);

    console.log('\n2. Lo stato e quello scritto dal contatore nello stesso processo.\n');

    await attendi(600);
    r = await richiesta(port, '/world/world-state.json?t=1');
    let stato = JSON.parse(r.body || '{}');
    verifica('stato servito', [r.status, r.type], [200, 'application/json']);
    verifica('creato adesso, non quello vero', Date.parse(stato.installed_at) >= avvio - 1000, true);
    verifica('ancora vuoto', stato.total_te, 0);

    // una risposta di Claude Code arriva sul disco: con Opus, 1.234 token di
    // input sono 1.234 TE
    const riga = JSON.stringify({ type: 'assistant', timestamp: new Date(Date.now() + 1000).toISOString(),
      message: { id: 'msg_1', model: 'claude-opus-5', usage: { input_tokens: 1234, output_tokens: 0 } } });
    fs.mkdirSync(path.join(PROJECTS, 'prova'), { recursive: true });
    fs.writeFileSync(path.join(PROJECTS, 'prova', 'sessione.jsonl'), riga + '\n');
    await attendi(1200);
    stato = JSON.parse((await richiesta(port, '/world/world-state.json')).body || '{}');
    verifica('il transcript diventa credito', stato.total_te, 1234);

    console.log('\n2b. Il registro dei cantieri: si legge, e si scrive solo nei modi previsti.\n');

    const JSON_H = { 'Content-Type': 'application/json' };
    const scrivi = (dati, headers) => richiesta(port, '/api/cantiere', 'POST', JSON.stringify(dati), headers || JSON_H);

    r = await richiesta(port, '/api/cantiere');
    let api = JSON.parse(r.body || '{}');
    verifica('lettura', [r.status, r.type], [200, 'application/json']);
    verifica('mondo attivo al primo avvio', api.attivo, 'acropoli');
    verifica('tutto il consumo va all\'Acropoli', api.mondi && api.mondi.acropoli.credito_te, 1234);
    verifica('il totale del contatore e incluso', api.contatore && api.contatore.totale_te, 1234);
    verifica('il registro e su disco', fs.existsSync(path.join(path.dirname(STATE), 'cantiere.json')), true);

    r = await scrivi({ azione: 'riporta', mondo: 'acropoli', pezzi: 3280, costo_te: 1e8, dono_te: 5e5, posati: 7 });
    verifica('riporto accettato', [r.status, JSON.parse(r.body).mondi.acropoli.posati_max], [200, 7]);
    r = await richiesta(port, '/api/cantiere');
    verifica('e ricordato', JSON.parse(r.body).mondi.acropoli.posati_max, 7);

    r = await scrivi({ azione: 'riporta', mondo: 'acropoli', pezzi: 3280, costo_te: 1e8, dono_te: 5e5, posati: 9 },
      { 'Content-Type': 'application/json', Origin: 'http://localhost:' + port });
    verifica('dalla pagina della scena', r.status, 200);
    r = await scrivi({ azione: 'scegli', mondo: 'acropoli' },
      { 'Content-Type': 'application/json', Origin: 'https://sito-estraneo.example' });
    verifica('da un altro sito: rifiutato', r.status, 403);
    r = await richiesta(port, '/api/cantiere', 'POST', '{"azione":"scegli","mondo":"acropoli"}', { 'Content-Type': 'text/plain' });
    verifica('senza JSON dichiarato: rifiutato', r.status, 415);
    r = await scrivi({ azione: 'scegli', mondo: 'atlantide' });
    verifica('mondo sconosciuto: rifiutato', [r.status, /sconosciuto/.test(r.body)], [400, true]);
    r = await scrivi({ azione: 'demolisci' });
    verifica('azione sconosciuta: rifiutata', r.status, 400);
    r = await richiesta(port, '/api/cantiere', 'POST', '{ non json', JSON_H);
    verifica('JSON rotto: rifiutato', r.status, 400);
    r = await richiesta(port, '/api/cantiere', 'POST', JSON.stringify({ azione: 'riporta', x: 'a'.repeat(20000) }), JSON_H);
    verifica('richiesta troppo grande: rifiutata', r.status, 413);
    r = await richiesta(port, '/api/cantiere', 'PUT', '{}', JSON_H);
    verifica('altri metodi: rifiutati', r.status, 405);
    r = await richiesta(port, '/api/cantiere');
    verifica('dopo i rifiuti il registro e intatto', JSON.parse(r.body).mondi.acropoli.posati_max, 9);

    console.log('\n3. Fuori dalla scena non si esce.\n');

    verifica('risalire la cartella', (await richiesta(port, '/../package.json')).status, 404);
    verifica('risalire, codificato', (await richiesta(port, '/%2e%2e/%2e%2e/package.json')).status, 404);
    verifica('file nascosto', (await richiesta(port, '/world/.world-state.bak')).status, 404);
    verifica('nascosto con la barra rovesciata', (await richiesta(port, '/world%5C.world-state.bak')).status, 404);
    verifica('cartella nascosta', (await richiesta(port, '/.git/config')).status, 404);
    verifica('carattere nullo', (await richiesta(port, '/index.html%00.js')).status, 404);

    console.log('\n4. Una connessione muta non blocca le altre: era il guasto del');
    console.log('   vecchio server, che serviva una richiesta alla volta.\n');

    const muta = net.connect(port, '127.0.0.1');
    await new Promise((r) => muta.on('connect', r));
    const t0 = Date.now();
    const tutte = await Promise.all(Array.from({ length: 20 }, (_, i) =>
      richiesta(port, i % 2 ? '/src/config.js' : '/world/world-state.json')));
    verifica('venti richieste, tutte servite', tutte.every((x) => x.status === 200), true);
    verifica('senza aspettare la muta', Date.now() - t0 < 2000, true);
    muta.destroy();
  } catch (err) {
    falliti++;
    console.log('  FALLITO ' + err.message);
  } finally {
    proc.kill();
  }

  console.log('\n5. Una porta occupata si spiega, invece di fallire a caso.\n');
  const occupante = net.createServer().listen(0, '127.0.0.1');
  await new Promise((r) => occupante.on('listening', r));
  const occupata = occupante.address().port;
  const secondo = spawn(process.execPath, [SERVER, String(occupata), '--no-browser'], {
    env: Object.assign({}, process.env, { ACROPOLI_STATE: STATE, ACROPOLI_TRANSCRIPTS: PROJECTS }),
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let err = '';
  secondo.stderr.on('data', (c) => { err += c; });
  const codice = await new Promise((r) => secondo.on('exit', r));
  occupante.close();
  verifica('esce con errore', codice, 1);
  verifica('e dice perche', /occupata/.test(err), true);

  console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
  process.exitCode = falliti === 0 ? 0 : 1;
})();
