/**
 * Il registro dei cantieri: quale mondo riceve i token, e quanto credito ha
 * ciascuno.
 *
 * Il contatore conosce un numero solo, il totale dei TE consumati da quando
 * il progetto e installato. Il registro divide quel totale fra i mondi in
 * "tratti": dal momento in cui un mondo diventa attivo a quello in cui lo si
 * mette in pausa, i TE sono suoi. Un tratto e un intervallo del totale,
 * [da_te, a_te), e un mondo puo averne quanti ne vuole: pausa e ripresa.
 *
 * I blocchi posati non stanno qui. Ogni mondo conosce il costo dei suoi pezzi
 * in ordine, e dato il credito sa quanti ne puo pagare: e un conto, uguale in
 * ogni browser. Qui si ricorda solo il punto piu alto raggiunto, perche il
 * cantiere non si disfi se i prezzi cambiano, e quanto costa ogni mondo,
 * perche quando uno e completato si sappia quanto credito avanza.
 *
 * Decisioni del 6 ottobre 2026: un mondo si puo mettere in pausa per
 * cominciarne un altro; il credito che avanza a mondo completato passa al
 * mondo scelto dopo; ogni mondo ha la sua durata.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const counter = require('./token-counter/counter.js');

const REGISTRO_PATH = process.env.ACROPOLI_CANTIERE ||
  path.join(path.dirname(counter.STATE_PATH), 'cantiere.json');
const BACKUP_PATH = path.join(path.dirname(REGISTRO_PATH), '.cantiere.bak');

// i mondi che esistono; dalla fase 2 verranno dai loro mondo.json
const MONDI_NOTI = ['acropoli'];
// il primo cantiere riceve tutto il consumo dall'installazione in poi
const PRIMO_MONDO = 'acropoli';

class Rifiuto extends Error {}

// ----------------------------------------------------------------- calcoli

function nuovoRegistro(nowIso) {
  return {
    versione: 1,
    creato_at: nowIso,
    attivo: PRIMO_MONDO,
    tratti: [{ mondo: PRIMO_MONDO, da_te: 0, a_te: null }],
    avanzi: [],
    mondi: {},
  };
}

/**
 * Il credito di un mondo, senza il dono iniziale (che dipende dai prezzi del
 * mondo e lo aggiunge la scena): i TE dei suoi tratti, meno l'avanzo che ha
 * passato ad altri, piu quello che ha ricevuto.
 *
 * Il totale puo anche scendere - un listino corretto ricalcola tutto - e un
 * tratto non vale mai meno di zero.
 */
function creditoDi(reg, id, totale) {
  let te = 0;
  for (const t of reg.tratti) {
    if (t.mondo !== id) continue;
    const fine = t.a_te === null ? totale : Math.min(t.a_te, totale);
    te += Math.max(0, fine - t.da_te);
  }
  for (const a of reg.avanzi) {
    if (a.da === id) te -= a.te;
    if (a.a === id) te += a.te;
  }
  return te;
}

function completato(reg, id) {
  const m = reg.mondi[id];
  return !!(m && m.pezzi > 0 && m.posati_max >= m.pezzi);
}

/** Quanto credito ha in piu un mondo completato: e quello che passa al prossimo. */
function avanzoDi(reg, id, totale) {
  const m = reg.mondi[id];
  if (!completato(reg, id)) return 0;
  return Math.max(0, (m.dono_te || 0) + creditoDi(reg, id, totale) - m.costo_te);
}

function numero(v, nome) {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) throw new Rifiuto(nome + ' non valido');
  return v;
}

function mondoNoto(id) {
  if (!MONDI_NOTI.includes(id)) throw new Rifiuto('mondo sconosciuto: ' + id);
  return id;
}

/**
 * Un mondo racconta com'e fatto e fin dove e arrivato. Il punto piu alto
 * raggiunto puo solo salire: un ricalcolo dei prezzi non toglie blocchi gia
 * posati. posati e facoltativo, perche la modalita ?dev, che regala credito
 * finto, riferisce la forma del mondo ma non il suo avanzamento.
 */
function riporta(reg, dati, totale, nowIso) {
  const id = mondoNoto(dati.mondo);
  const pezzi = Math.floor(numero(dati.pezzi, 'pezzi'));
  if (pezzi < 1) throw new Rifiuto('pezzi non valido');
  const prima = reg.mondi[id] || { posati_max: 0 };
  const m = {
    pezzi,
    costo_te: numero(dati.costo_te, 'costo_te'),
    dono_te: numero(dati.dono_te, 'dono_te'),
    posati_max: Math.min(pezzi, prima.posati_max || 0),
  };
  if (dati.posati !== undefined) {
    m.posati_max = Math.min(pezzi, Math.max(m.posati_max, Math.floor(numero(dati.posati, 'posati'))));
  }
  // un mondo completato che riceve pezzi nuovi - le rifiniture - torna in corso
  m.completato_at = m.posati_max >= pezzi ? (prima.completato_at || nowIso) : null;
  reg.mondi[id] = m;
  return reg;
}

/**
 * Cambia il mondo che riceve i token. Il tratto del mondo attivo si chiude
 * adesso; se quel mondo era completato, il suo avanzo passa al nuovo. Un
 * mondo lasciato a meta resta in pausa con il suo credito, e lo ritrova
 * quando torna attivo.
 */
function scegli(reg, id, totale) {
  mondoNoto(id);
  if (reg.attivo === id) return reg;
  if (completato(reg, id)) throw new Rifiuto(id + ' e gia compiuto: si visita, non si costruisce');

  let inizio = 0;
  for (const t of reg.tratti) if (t.a_te !== null) inizio = Math.max(inizio, t.a_te);

  if (reg.attivo) {
    const prec = reg.attivo;
    const aperto = reg.tratti.find((t) => t.mondo === prec && t.a_te === null);
    if (aperto) aperto.a_te = totale;
    const avanzo = avanzoDi(reg, prec, totale);
    if (avanzo > 0) reg.avanzi.push({ da: prec, a: id, te: avanzo });
    inizio = totale;
  }
  // senza un mondo attivo, i TE arrivati nel frattempo vanno al prossimo
  reg.tratti.push({ mondo: id, da_te: inizio, a_te: null });
  reg.attivo = id;
  return reg;
}

/** Quello che serve alla scena e, piu avanti, alla pagina iniziale. */
function vista(reg, totale) {
  const mondi = {};
  for (const id of MONDI_NOTI) {
    const m = reg.mondi[id] || {};
    mondi[id] = {
      attivo: reg.attivo === id,
      credito_te: creditoDi(reg, id, totale),
      posati_max: m.posati_max || 0,
      pezzi: m.pezzi || null,
      costo_te: m.costo_te || null,
      completato: completato(reg, id),
    };
  }
  return {
    attivo: reg.attivo,
    mondi,
    // un mondo completato e ancora attivo accumula credito per il prossimo
    in_attesa_te: reg.attivo ? avanzoDi(reg, reg.attivo, totale) : 0,
  };
}

// --------------------------------------------------------------- su disco

function valido(reg) {
  return reg && typeof reg === 'object' && Array.isArray(reg.tratti) &&
    Array.isArray(reg.avanzi) && reg.mondi && typeof reg.mondi === 'object';
}

// come lo stato del contatore: assente vuol dire primo avvio, illeggibile
// vuol dire incidente, e si torna all'ultima copia buona
function leggi(nowIso) {
  try {
    const reg = JSON.parse(fs.readFileSync(REGISTRO_PATH, 'utf8'));
    if (!valido(reg)) throw new Error('forma non valida');
    return { reg, nuovo: false };
  } catch (err) {
    if (err && err.code === 'ENOENT') return { reg: nuovoRegistro(nowIso), nuovo: true };
    try {
      const reg = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
      if (!valido(reg)) throw new Error('forma non valida');
      return { reg, nuovo: true };
    } catch (_) {
      return { reg: nuovoRegistro(nowIso), nuovo: true };
    }
  }
}

function scriviAtomico(target, text) {
  const tmp = target + '.' + process.pid + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, target);
}

function scrivi(reg) {
  fs.mkdirSync(path.dirname(REGISTRO_PATH), { recursive: true });
  const text = JSON.stringify(reg, null, 2) + '\n';
  scriviAtomico(REGISTRO_PATH, text);
  try { scriviAtomico(BACKUP_PATH, text); } catch (_) { /* il registro c'e gia */ }
}

module.exports = {
  REGISTRO_PATH, MONDI_NOTI, Rifiuto,
  nuovoRegistro, creditoDi, avanzoDi, completato, riporta, scegli, vista, leggi, scrivi,
};
