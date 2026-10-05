#!/usr/bin/env node
/**
 * Banco di prova del contatore. Non tocca lo stato vero ne i transcript veri:
 * costruisce una finta cartella ~/.claude/projects in una cartella temporanea
 * e la passa al contatore con le variabili d'ambiente.
 *
 *   node tools/token-counter/test/run-tests.js
 *
 * Usa un listino suo, pricing-test.json, che non va aggiornato con i prezzi
 * veri: i numeri attesi sono calcolati a mano qui sotto su quei valori.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const HERE = __dirname;
const COUNTER = path.join(HERE, '..', 'counter.js');
const FIXTURE = fs.readFileSync(path.join(HERE, 'fixture.jsonl'), 'utf8');
const PRICING = path.join(HERE, 'pricing-test.json');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'acropoli-test-'));
const INSTALLED_AT = '2026-09-22T00:00:00.000Z';

/*
 * Conto a mano, con pricing-test.json e 1 $ = 200.000 TE.
 * Con questi prezzi un token di input di Opus vale esattamente 1 TE.
 *
 * msg_A  opus-5, tre righe con lo stesso id: vince output 500.
 *   input 1000        (1000/1e6)*5.00    = 0,005
 *   cache 5m 2000     (2000/1e6)*6.25    = 0,0125
 *   cache 1h 4000     (4000/1e6)*10.00   = 0,04
 *   cache read 10000  (10000/1e6)*0.50   = 0,005
 *   output 500        (500/1e6)*25.00    = 0,0125
 *                                  totale  0,075 $  ->  15.000 TE
 *
 * msg_B  sonnet-5, senza dettaglio 5m/1h: cache_creation_input_tokens 8000
 *        pesa come scrittura a 5 minuti.
 *   input 2000        (2000/1e6)*2.00    = 0,004
 *   cache 5m 8000     (8000/1e6)*2.50    = 0,02
 *   cache read 50000  (50000/1e6)*0.20   = 0,01
 *   output 1000       (1000/1e6)*10.00   = 0,01
 *                                  totale  0,044 $  ->   8.800 TE
 *
 * msg_C  modello sconosciuto -> prezzi del default (opus), nome annotato.
 *   input 100 + output 200                = 0,0055 $ ->   1.100 TE
 *
 * Scartati: riga malformata, riga user, assistant senza usage,
 *           msg_OLD (timestamp precedente a installed_at).
 *
 * Totale atteso per il fixture: 0,1245 $ -> 24.900 TE
 */
const ATTESO = {
  te: 24900,
  usd: 0.1245,
  model: 'claude-opus-5',
  tokens: { input: 3100, cw5m: 10000, cw1h: 4000, cache_read: 60000, output: 1700 },
};

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

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Una cartella di lavoro: stato, log e una finta ~/.claude/projects. */
function ambiente(nome, { conStato = true } = {}) {
  const dir = path.join(TMP, nome);
  const projects = path.join(dir, 'projects');
  fs.mkdirSync(projects, { recursive: true });
  const state = path.join(dir, 'world', 'world-state.json');
  if (conStato) {
    fs.mkdirSync(path.dirname(state), { recursive: true });
    fs.writeFileSync(state, JSON.stringify({
      installed_at: INSTALLED_AT,
      updated_at: INSTALLED_AT,
      total_te: 0,
      total_usd: 0,
      sessions: {},
      unknown_models: [],
    }, null, 2));
  }
  return { dir, projects, state, log: path.join(dir, 'counter.log') };
}

function variabili(amb, extra) {
  return Object.assign({}, process.env, {
    ACROPOLI_STATE: amb.state,
    ACROPOLI_LOG: amb.log,
    ACROPOLI_PRICING: PRICING,
    ACROPOLI_TRANSCRIPTS: amb.projects,
  }, extra || {});
}

function esegui(amb, args, extra) {
  return spawnSync(process.execPath, [COUNTER].concat(args || []), {
    encoding: 'utf8',
    env: variabili(amb, extra),
  });
}

function leggi(amb) {
  return JSON.parse(fs.readFileSync(amb.state, 'utf8'));
}

function scrivi(file, testo) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, testo);
}

/** Una riga user con la cartella di lavoro, come quelle vere di Claude Code. */
function rigaCwd(cwd) {
  return JSON.stringify({ type: 'user', cwd, timestamp: '2026-09-22T11:59:00.000Z',
    message: { role: 'user', content: 'ciao' } }) + '\n';
}

/** Una risposta con solo token di input: con Opus, N token = N TE. */
function riga(id, model, input, timestamp) {
  return JSON.stringify({ type: 'assistant', timestamp: timestamp || '2026-09-22T13:00:00.000Z',
    message: { id, model, usage: { input_tokens: input, output_tokens: 0 } } }) + '\n';
}

// --------------------------------------------------------------------------
console.log('\n1. Calcolo dei TE su un transcript con duplicati, cache 5m+1h,');
console.log('   modello sconosciuto, riga malformata e messaggio precedente.\n');

const A = ambiente('principale');
scrivi(path.join(A.projects, 'C--lavoro-progetto-alfa', 's1.jsonl'),
  rigaCwd('C:\\lavoro\\progetto-alfa') + FIXTURE);
verifica('exit code', esegui(A).status, 0);

let s = leggi(A);
verifica('te sessione', s.sessions.s1.te, ATTESO.te);
verifica('usd sessione', s.sessions.s1.usd, ATTESO.usd);
verifica('modello dominante', s.sessions.s1.model, ATTESO.model);
verifica('token grezzi', s.sessions.s1.tokens, ATTESO.tokens);
verifica('messaggi contati', s.sessions.s1.messages, 3);
verifica('progetto dalla cwd', s.sessions.s1.project, 'progetto-alfa');
verifica('modelli sconosciuti', s.unknown_models, ['claude-mystery-9']);
verifica('prezzo usato al loro posto', s.model_fallbacks, { 'claude-mystery-9': 'claude-opus-5' });
verifica('total_te', s.total_te, ATTESO.te);
verifica('installed_at conservato', s.installed_at, INSTALLED_AT);

// --------------------------------------------------------------------------
console.log('\n2. Idempotenza: piu scansioni sullo stesso disco, e nessuna');
console.log('   riscrittura dello stato quando non e cambiato niente.\n');

esegui(A);
const prima = leggi(A).updated_at;
sleep(20);
esegui(A);
s = leggi(A);
verifica('total_te invariato', s.total_te, ATTESO.te);
verifica('stato non riscritto', s.updated_at, prima);

// --------------------------------------------------------------------------
console.log('\n3. Due progetti: le sessioni si sommano, ognuna col suo progetto.\n');

scrivi(path.join(A.projects, 'home-x-progetto-beta', 's2.jsonl'),
  rigaCwd('/home/x/progetto-beta') + FIXTURE.replace(/msg_/g, 'msg2_'));
esegui(A);
s = leggi(A);
verifica('due sessioni', Object.keys(s.sessions).sort(), ['s1', 's2']);
verifica('progetto della seconda', s.sessions.s2.project, 'progetto-beta');
verifica('total_te = somma', s.total_te, ATTESO.te * 2);

// --------------------------------------------------------------------------
console.log('\n4. Sessione ripresa: un file che ricopia messaggi gia contati');
console.log('   non li conta una seconda volta.\n');

scrivi(path.join(A.projects, 'home-x-progetto-beta', 's3.jsonl'), FIXTURE);
esegui(A);
s = leggi(A);
verifica('nessuna sessione in piu', Object.keys(s.sessions).sort(), ['s1', 's2']);
verifica('total_te invariato', s.total_te, ATTESO.te * 2);

// --------------------------------------------------------------------------
console.log('\n5. Subagenti: cartella della sessione e file affiancati');
console.log('   finiscono sotto la sessione madre.\n');

const alfa = path.join(A.projects, 'C--lavoro-progetto-alfa');
scrivi(path.join(alfa, 's1', 'subagents', 'agent-1.jsonl'), riga('msg_SUB', 'claude-opus-5', 1000));
scrivi(path.join(alfa, 's1-agent-2.jsonl'), riga('msg_SIDE', 'claude-opus-5', 500));
scrivi(path.join(alfa, 'memory', 'MEMORY.md'), '# non e un transcript\n');
esegui(A);
s = leggi(A);
verifica('subagenti nella sessione madre', s.sessions.s1.te, ATTESO.te + 1500);
verifica('nessuna sessione fantasma', Object.keys(s.sessions).sort(), ['s1', 's2']);
verifica('total_te', s.total_te, ATTESO.te * 2 + 1500);

// --------------------------------------------------------------------------
console.log('\n6. Sessione cancellata da Claude Code: resta nel cantiere, archiviata.\n');

fs.unlinkSync(path.join(A.projects, 'home-x-progetto-beta', 's2.jsonl'));
esegui(A);
s = leggi(A);
verifica('sessione archiviata', s.sessions.s2 && s.sessions.s2.archived, true);
verifica('te conservato', s.sessions.s2 && s.sessions.s2.te, ATTESO.te);
verifica('total_te invariato', s.total_te, ATTESO.te * 2 + 1500);

// --------------------------------------------------------------------------
console.log('\n7. Modelli nuovi: vince la voce piu specifica; una variante con la');
console.log('   data e lo stesso modello, una versione nuova va segnalata.\n');

scrivi(path.join(A.projects, 'gamma', 's4.jsonl'),
  riga('msg_55', 'claude-opus-5-5', 1000) +           // opus-5 per prefisso: 1.000 TE, segnalato
  riga('msg_DATED', 'claude-sonnet-5-20260101', 1000)); // sonnet, prezzo certo: 400 TE
esegui(A);
s = leggi(A);
verifica('te con prezzi stimati e certi', s.sessions.s4.te, 1400);
verifica('modelli senza prezzo', s.unknown_models, ['claude-mystery-9', 'claude-opus-5-5']);
verifica('stimato col piu vicino', s.model_fallbacks['claude-opus-5-5'], 'claude-opus-5');
verifica('total_te', s.total_te, ATTESO.te * 2 + 1500 + 1400);

// --------------------------------------------------------------------------
console.log('\n8. Prima installazione: la storia precedente non conta.\n');

const B = ambiente('prima-installazione', { conStato: false });
scrivi(path.join(B.projects, 'vecchio', 'storico.jsonl'), rigaCwd('/x/vecchio') + FIXTURE);
const avvio = Date.now();
verifica('exit code', esegui(B).status, 0);
s = leggi(B);
const installato = Date.parse(s.installed_at);
verifica('installed_at fissato adesso', installato >= avvio - 1000 && installato <= Date.now(), true);
verifica('niente di prima', s.total_te, 0);
verifica('nessuna sessione', Object.keys(s.sessions).length, 0);

// e da li in poi conta: una risposta nuova, con l'orario di adesso
fs.appendFileSync(path.join(B.projects, 'vecchio', 'storico.jsonl'),
  riga('msg_NUOVO', 'claude-opus-5', 700, new Date(Date.now() + 1000).toISOString()));
esegui(B);
verifica('conta quello che arriva dopo', leggi(B).total_te, 700);

// --------------------------------------------------------------------------
console.log('\n9. Robustezza.\n');

const C = ambiente('senza-claude', { conStato: false });
const assente = path.join(C.dir, 'non-esiste');
verifica('cartella dei transcript assente: exit code',
  esegui(C, [], { ACROPOLI_TRANSCRIPTS: assente }).status, 0);
verifica('stato creato lo stesso', fs.existsSync(C.state), true);

const D = ambiente('corrotto');
scrivi(path.join(D.projects, 'p', 's1.jsonl'), FIXTURE);
esegui(D);
verifica('copia di riserva scritta', fs.existsSync(path.join(path.dirname(D.state), '.world-state.bak')), true);
fs.writeFileSync(D.state, '{ stato corrotto');
verifica('stato corrotto: exit code', esegui(D).status, 0);
s = leggi(D);
verifica('installed_at dalla copia', s.installed_at, INSTALLED_AT);
verifica('total_te ricostruito', s.total_te, ATTESO.te);

const E = ambiente('listino-rotto');
const rotto = path.join(E.dir, 'pricing-rotto.json');
fs.writeFileSync(rotto, '{ "models": {} }');
const r = esegui(E, [], { ACROPOLI_PRICING: rotto });
verifica('listino rotto: errore visibile', r.status, 1);
verifica('e spiegato', /te_per_usd/.test(r.stderr), true);

// --------------------------------------------------------------------------
console.log('\n10. Scansione continua: il contatore vede le righe nuove mentre');
console.log('    la sessione e in corso, leggendo solo la coda del file.\n');

const W = ambiente('continua');
const live = path.join(W.projects, 'delta', 's5.jsonl');
scrivi(live, rigaCwd('/x/delta'));
const proc = spawn(process.execPath, [COUNTER, '--watch', '--interval', '0.2'],
  { env: variabili(W), stdio: 'ignore' });
try {
  sleep(800);
  fs.appendFileSync(live, riga('msg_W1', 'claude-opus-5', 2000));
  sleep(800);
  verifica('prima risposta vista', leggi(W).total_te, 2000);
  fs.appendFileSync(live, riga('msg_W2', 'claude-opus-5', 500));
  sleep(800);
  verifica('la seconda si somma', leggi(W).total_te, 2500);
  // una riga ancora a meta scrittura non va contata finche non e completa
  const mezza = riga('msg_W3', 'claude-opus-5', 300);
  fs.appendFileSync(live, mezza.slice(0, 40));
  sleep(800);
  verifica('riga a meta ignorata', leggi(W).total_te, 2500);
  fs.appendFileSync(live, mezza.slice(40));
  sleep(800);
  verifica('completata, conta', leggi(W).total_te, 2800);
} finally {
  proc.kill();
}

// --------------------------------------------------------------------------
console.log('\n11. Modalita veloce e messaggi interni di Claude Code.\n');

/** Una risposta con un campo di usage in piu, come speed. */
function rigaCon(id, model, input, extra) {
  return JSON.stringify({ type: 'assistant', timestamp: '2026-09-22T13:00:00.000Z',
    message: { id, model, usage: Object.assign({ input_tokens: input, output_tokens: 0 }, extra) } }) + '\n';
}

const F = ambiente('veloce');
scrivi(path.join(F.projects, 'eps', 's6.jsonl'),
  rigaCon('msg_FAST', 'claude-opus-5', 1000, { speed: 'fast' }) +     // x2 dal listino: 2.000 TE
  rigaCon('msg_STD', 'claude-opus-5', 1000, { speed: 'standard' }) +  // 1.000 TE
  rigaCon('msg_FS', 'claude-sonnet-5', 1000, { speed: 'fast' }) +     // niente x nel listino: 400 TE, segnalato
  rigaCon('msg_SYN', '<synthetic>', 99999));                          // interno: ignorato
esegui(F);
s = leggi(F);
verifica('veloce col moltiplicatore, normale senza', s.total_te, 2000 + 1000 + 400);
verifica('veloce senza maggiorazione segnalato', s.unknown_models, ['claude-sonnet-5 (fast)']);
verifica('e detto come e stato contato', s.model_fallbacks['claude-sonnet-5 (fast)'], 'claude-sonnet-5 a prezzo normale');
verifica('i messaggi interni non contano', s.sessions.s6.messages, 3);

// --------------------------------------------------------------------------
console.log('\n12. Prova a secco: un listino nuovo si misura senza scrivere niente.\n');

const statoPrima = fs.readFileSync(A.state, 'utf8');
const doppio = JSON.parse(fs.readFileSync(PRICING, 'utf8'));
doppio.models['claude-opus-5'].input *= 2;  // fixture: 3.100 token di input, quasi tutti Opus
const doppioFile = path.join(A.dir, 'listino-doppio.json');
fs.writeFileSync(doppioFile, JSON.stringify(doppio));
const prova = esegui(A, ['--dry-run', '--pricing', doppioFile]);
verifica('exit code', prova.status, 0);
const riepilogo = JSON.parse(prova.stdout || '{}');
verifica('stato intatto', fs.readFileSync(A.state, 'utf8') === statoPrima, true);
verifica('il conto cambia col listino', riepilogo.total_te > leggi(A).total_te, true);
verifica('archiviate col loro prezzo', riepilogo.archived_te, ATTESO.te);
verifica('peso per modello', typeof riepilogo.by_model['claude-opus-5'].te, 'number');

// --since: quanto e stato consumato da una data in poi, per misurare una
// finestra di /usage. Conta solo i transcript: le sessioni archiviate no.
const daData = (data) => JSON.parse(esegui(A, ['--dry-run', '--since', data]).stdout || '{}').total_te;
verifica('dall\'installazione, transcript sul disco', daData(INSTALLED_AT), ATTESO.te + 1500 + 1400);
verifica('da una data futura, niente', daData('2100-01-01T00:00:00Z'), 0);
verifica('--since senza prova a secco rifiutato', esegui(A, ['--since', INSTALLED_AT]).status, 1);
verifica('stato ancora intatto', fs.readFileSync(A.state, 'utf8') === statoPrima, true);

// --------------------------------------------------------------------------
console.log('\n13. Il controllo del listino.\n');

const CHECK = path.join(HERE, '..', 'check-pricing.js');
const controlla = (file) => spawnSync(process.execPath, [CHECK, file], {
  encoding: 'utf8', env: variabili(A),
});
verifica('listino di prova valido', controlla(PRICING).status, 0);
const monco = JSON.parse(fs.readFileSync(PRICING, 'utf8'));
delete monco.models['claude-sonnet-5'].cache_read;
monco.models['claude-opus-5'].fast_multiplier = 0.5;
const moncoFile = path.join(A.dir, 'listino-monco.json');
fs.writeFileSync(moncoFile, JSON.stringify(monco));
const c = controlla(moncoFile);
verifica('listino monco rifiutato', c.status, 1);
verifica('voce mancante nominata', /claude-sonnet-5\.cache_read/.test(c.stderr), true);
verifica('maggiorazione assurda nominata', /fast_multiplier/.test(c.stderr), true);
verifica('il contatore non lo usa', esegui(A, ['--dry-run', '--pricing', moncoFile]).status, 1);

// --------------------------------------------------------------------------
console.log('\n' + (falliti === 0
  ? 'Tutti i controlli passati.'
  : falliti + ' controlli falliti.') + '\n');
console.log('cartella temporanea: ' + TMP + '\n');
process.exitCode = falliti === 0 ? 0 : 1;
