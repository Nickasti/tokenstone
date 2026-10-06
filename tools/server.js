#!/usr/bin/env node
/**
 * Server della scena, senza dipendenze.
 *
 *   npm start
 *   node tools/server.js [porta] [--no-browser] [--host 0.0.0.0] [--interval s]
 *
 * Serve i file statici e, nello stesso processo, fa girare il contatore di
 * token: ogni cinque secondi legge i transcript di Claude Code e riscrive lo
 * stato che la scena consulta. Un programma solo: si accende il server e il
 * cantiere comincia a contare, si spegne e smette.
 *
 * Ascolta solo su questo computer (127.0.0.1). Lo stato dice quanto lavori e
 * su quali progetti: non e roba da esporre alla rete di casa o dell'ufficio.
 * Con --host 0.0.0.0 la scena si apre anche da un altro dispositivo, per
 * esempio dal telefono, sapendo che chiunque sulla stessa rete puo vederla.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const counter = require('./token-counter/counter.js');
const cantiere = require('./cantiere.js');

const ROOT = path.resolve(__dirname, '..');
const STATE_URL = '/world/world-state.json';
// con questo un secondo avvio riconosce che sulla porta c'e gia il cantiere
const PING_URL = '/__acropoli';
// il registro dei cantieri: si legge, e si scrive solo in due modi
const API_URL = '/api/cantiere';
const MAX_BODY = 8 * 1024;
let PORTA = null;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  // i moduli ES si caricano solo con un tipo JavaScript: con un tipo generico
  // il browser li rifiuta, e la scena non parte
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.hdr': 'image/vnd.radiance',
  '.woff2': 'font/woff2',
};

function parseArgs(argv) {
  const out = { port: 8000, host: '127.0.0.1', browser: true, interval: counter.DEFAULT_INTERVAL_S };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (/^\d+$/.test(a)) out.port = Number(a);
    else if (a === '--no-browser') out.browser = false;
    else if (a === '--host') out.host = argv[++i] || out.host;
    else if (a === '--interval') {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) out.interval = n;
    }
  }
  return out;
}

/**
 * Da indirizzo a file su disco, senza uscire dalla cartella del progetto.
 * I file e le cartelle nascoste (.git, .claude, la copia di riserva dello
 * stato) non si servono: non sono parte della scena.
 */
function resolveFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch (_) {
    return null;
  }
  if (decoded.includes('\0')) return null;
  // anche la barra rovesciata: su Windows e un separatore, e senza contarla
  // "world\.world-state.bak" passerebbe per un nome qualsiasi
  const parts = decoded.split(/[\\/]/).filter(Boolean);
  if (parts.some((p) => p.startsWith('.'))) return null;
  const file = path.resolve(ROOT, ...parts);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) return null;
  return file;
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    // in sviluppo la cache fa solo perdere tempo, e lo stato deve essere fresco
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) return serveFile(req, res, path.join(file, 'index.html'));
    if (err || !st.isFile()) return send(res, 404, 'non trovato\n');
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(file);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

/** Il totale del contatore e quello che la scena mostra di lui. */
function leggiContatore() {
  try {
    const s = JSON.parse(fs.readFileSync(counter.STATE_PATH, 'utf8'));
    return {
      totale_te: Number(s.total_te) || 0,
      totale_usd: Number(s.total_usd) || 0,
      sessioni: s.sessions ? Object.keys(s.sessions).length : 0,
      installato: s.installed_at || null,
      prezzi_stimati: Array.isArray(s.unknown_models) ? s.unknown_models : [],
    };
  } catch (_) {
    // il contatore non ha ancora scritto niente: il cantiere aspetta
    return { totale_te: 0, totale_usd: 0, sessioni: 0, installato: null, prezzi_stimati: [] };
  }
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), MIME['.json']);
}

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Le scritture sul registro. Tre controlli, perche ogni pagina aperta nel
 * browser puo provare a mandare richieste a localhost:
 * - solo dal computer stesso, anche se il server ascolta sulla rete;
 * - solo come JSON, che un sito estraneo non puo inviare senza chiedere il
 *   permesso al server, e il permesso non viene mai dato;
 * - solo dalla pagina della scena, se il browser dice da dove arriva.
 */
function scrittura(req, res) {
  if (!LOOPBACK.has(req.socket.remoteAddress)) return sendJson(res, 403, { errore: 'solo dal computer locale' });
  const tipo = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (tipo !== 'application/json') return sendJson(res, 415, { errore: 'serve application/json' });
  const origin = req.headers.origin;
  if (origin && origin !== 'http://localhost:' + PORTA && origin !== 'http://127.0.0.1:' + PORTA) {
    return sendJson(res, 403, { errore: 'origine non ammessa' });
  }

  let body = '';
  let troppo = false;
  req.setEncoding('utf8');
  req.on('data', (c) => {
    if (troppo) return;
    body += c;
    if (body.length > MAX_BODY) {
      troppo = true;
      res.setHeader('Connection', 'close');
      sendJson(res, 413, { errore: 'richiesta troppo grande' });
    }
  });
  req.on('end', () => {
    if (troppo) return;
    let dati;
    try { dati = JSON.parse(body); } catch (_) { return sendJson(res, 400, { errore: 'JSON non valido' }); }
    if (!dati || typeof dati !== 'object') return sendJson(res, 400, { errore: 'JSON non valido' });

    const now = new Date().toISOString();
    const totale = leggiContatore().totale_te;
    const { reg } = cantiere.leggi(now);
    try {
      if (dati.azione === 'riporta') cantiere.riporta(reg, dati, totale, now);
      else if (dati.azione === 'scegli') cantiere.scegli(reg, dati.mondo, totale);
      else return sendJson(res, 400, { errore: 'azione sconosciuta' });
    } catch (err) {
      if (err instanceof cantiere.Rifiuto) return sendJson(res, 400, { errore: err.message });
      throw err;
    }
    cantiere.scrivi(reg);
    sendJson(res, 200, cantiere.vista(reg, totale));
  });
}

function lettura(res) {
  const now = new Date().toISOString();
  const contatore = leggiContatore();
  const { reg, nuovo } = cantiere.leggi(now);
  // il primo avvio, o un registro recuperato dalla copia, si fissa su disco
  if (nuovo) cantiere.scrivi(reg);
  sendJson(res, 200, Object.assign({ contatore }, cantiere.vista(reg, contatore.totale_te)));
}

function handler(req, res) {
  res.on('finish', () => {
    // la scena chiede lo stato ogni cinque secondi: a riportarlo tutto, il
    // registro non direbbe piu niente
    const quieto = req.url.startsWith(STATE_URL) || (req.url.startsWith(API_URL) && req.method === 'GET');
    if (quieto && res.statusCode === 200) return;
    process.stderr.write('  ' + req.method + ' ' + req.url + ' ' + res.statusCode + '\n');
  });

  const urlPath = req.url.split('?')[0];
  if (urlPath === API_URL && req.method === 'POST') return scrittura(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'solo lettura\n');
  if (urlPath === API_URL) return lettura(res);

  if (urlPath === PING_URL) return send(res, 200, JSON.stringify({ app: 'acropoli' }), MIME['.json']);

  // lo stato sta dove lo scrive il contatore, che i test possono spostare
  if (urlPath === STATE_URL) return serveFile(req, res, counter.STATE_PATH);

  const file = resolveFile(req.url);
  if (!file) return send(res, 404, 'non trovato\n');
  serveFile(req, res, file);
}

function openBrowser(url) {
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]]
      : ['xdg-open', [url]];
  try {
    const child = spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true });
    child.on('error', () => { /* nessun browser: l'indirizzo e stampato sopra */ });
    child.unref();
  } catch (_) { /* idem */ }
}

/** Sulla porta c'e gia il cantiere? Una risposta sola, entro un secondo e mezzo. */
function isOurServer(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: PING_URL, timeout: 1500 }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(body).app === 'acropoli'); } catch (_) { resolve(false); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const server = http.createServer(handler);

  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      // Il doppio clic deve funzionare anche la seconda volta: se il cantiere
      // e gia acceso, si apre la pagina e basta, invece di un errore.
      if (await isOurServer(args.port)) {
        const url = 'http://localhost:' + args.port;
        process.stdout.write('Il cantiere e gia acceso su ' + url + (args.browser ? ': apro la pagina.\n' : '.\n'));
        if (args.browser) openBrowser(url);
        process.exit(0);
      }
      process.stderr.write('La porta ' + args.port + ' e gia occupata da un altro programma.\n' +
        'Chiudilo, oppure scegli un\'altra porta: npm start -- 8080\n');
    } else {
      process.stderr.write('Il server non parte: ' + err.message + '\n');
    }
    process.exit(1);
  });

  server.listen(args.port, args.host, () => {
    const port = server.address().port;
    PORTA = port;
    const url = 'http://localhost:' + port;
    process.stdout.write('Acropoli in ascolto su ' + url + '   (Ctrl+C per fermare)\n');
    if (args.host !== '127.0.0.1') {
      process.stdout.write('  attenzione: ascolto anche su ' + args.host +
        ', la scena e il tuo consumo sono visibili dalla rete\n');
    }
    process.stdout.write('  contatore: leggo ' + counter.TRANSCRIPTS_ROOT + '\n');

    const stop = counter.startWatching(args.interval);
    const shutdown = () => {
      stop();
      server.close();
      process.stdout.write('\nfermato.\n');
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    if (args.browser) openBrowser(url);
  });
}

main();
