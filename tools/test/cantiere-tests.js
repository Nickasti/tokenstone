#!/usr/bin/env node
/**
 * Banco di prova del registro dei cantieri: i conti del credito fra i mondi,
 * senza disco e senza server.
 *
 *   node tools/test/cantiere-tests.js
 *
 * Il registro conosce un solo mondo vero, l'Acropoli; per provare pausa e
 * avanzo ne serve un secondo, e i test lo aggiungono all'elenco dei mondi noti.
 */
'use strict';

const c = require('../cantiere.js');
c.MONDI_NOTI.push('giza');

const ORA = '2026-10-06T12:00:00.000Z';
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
function rifiuta(nome, fn) {
  try {
    fn();
    falliti++;
    console.log('  FALLITO ' + nome + ': accettato');
  } catch (err) {
    verifica(nome, err instanceof c.Rifiuto, true);
  }
}
const acropoli = (posati) => ({ mondo: 'acropoli', pezzi: 100, costo_te: 1000, dono_te: 50, posati });
const giza = (posati) => ({ mondo: 'giza', pezzi: 10, costo_te: 5000, dono_te: 200, posati });

// --------------------------------------------------------------------------
console.log('\n1. Primo avvio: tutto il consumo dall\'installazione va all\'Acropoli.\n');

let reg = c.nuovoRegistro(ORA);
verifica('mondo attivo', reg.attivo, 'acropoli');
verifica('credito con 600 TE consumati', c.creditoDi(reg, 'acropoli', 600), 600);
verifica('gli altri mondi non hanno niente', c.creditoDi(reg, 'giza', 600), 0);

// --------------------------------------------------------------------------
console.log('\n2. Avanzamento: il punto piu alto raggiunto puo solo salire.\n');

c.riporta(reg, acropoli(40), 600, ORA);
verifica('posati', reg.mondi.acropoli.posati_max, 40);
c.riporta(reg, acropoli(25), 600, ORA);
verifica('un riporto piu basso non toglie niente', reg.mondi.acropoli.posati_max, 40);
c.riporta(reg, { mondo: 'acropoli', pezzi: 100, costo_te: 1000, dono_te: 50 }, 600, ORA);
verifica('senza posati (?dev) si aggiorna solo la forma', reg.mondi.acropoli.posati_max, 40);
c.riporta(reg, acropoli(500), 600, ORA);
verifica('mai oltre i pezzi che esistono', reg.mondi.acropoli.posati_max, 100);
reg.mondi.acropoli.posati_max = 40;  // torna indietro per le prove successive
reg.mondi.acropoli.completato_at = null;

// --------------------------------------------------------------------------
console.log('\n3. Pausa: l\'Acropoli a meta, si comincia Giza.\n');

c.scegli(reg, 'giza', 700);
verifica('attivo', reg.attivo, 'giza');
verifica('acropoli ferma a 700', c.creditoDi(reg, 'acropoli', 900), 700);
verifica('giza riceve da 700 in poi', c.creditoDi(reg, 'giza', 900), 200);
verifica('nessun avanzo: l\'Acropoli non e finita', reg.avanzi.length, 0);

// --------------------------------------------------------------------------
console.log('\n4. Ripresa: si torna all\'Acropoli, che ritrova il suo credito.\n');

c.scegli(reg, 'acropoli', 1000);
verifica('acropoli: 700 di prima + 300 da adesso', c.creditoDi(reg, 'acropoli', 1300), 1000);
verifica('giza ferma a 300', c.creditoDi(reg, 'giza', 1300), 300);
const prima = JSON.stringify(reg);
c.scegli(reg, 'acropoli', 1300);
verifica('scegliere il mondo gia attivo non cambia niente', JSON.stringify(reg), prima);

// --------------------------------------------------------------------------
console.log('\n5. Avanzo: l\'Acropoli si completa, il credito in piu passa a Giza.\n');

// a 1300 l'Acropoli ha 50 di dono + 1000 di credito = 1050, costa 1000
c.riporta(reg, acropoli(100), 1300, ORA);
verifica('completata', c.completato(reg, 'acropoli'), true);
verifica('credito in attesa', c.vista(reg, 1300).in_attesa_te, 50);
verifica('continua a crescere finche non si sceglie', c.vista(reg, 1400).in_attesa_te, 150);
c.scegli(reg, 'giza', 1400);
verifica('avanzo registrato', reg.avanzi, [{ da: 'acropoli', a: 'giza', te: 150 }]);
verifica('giza: 300 di prima + 150 di avanzo', c.creditoDi(reg, 'giza', 1400), 450);
verifica('e da qui cresce', c.creditoDi(reg, 'giza', 1500), 550);
verifica('l\'Acropoli resta esattamente pagata', 50 + c.creditoDi(reg, 'acropoli', 1500), 1000);
rifiuta('un mondo compiuto non si riprende', () => c.scegli(reg, 'acropoli', 1500));

// --------------------------------------------------------------------------
console.log('\n6. Pezzi nuovi in un mondo compiuto: torna in corso.\n');

c.riporta(reg, { mondo: 'acropoli', pezzi: 120, costo_te: 1200, dono_te: 50 }, 1500, ORA);
verifica('non piu completato', c.completato(reg, 'acropoli'), false);
verifica('senza data di completamento', reg.mondi.acropoli.completato_at, null);
c.scegli(reg, 'acropoli', 1500);
verifica('e si puo riprendere', reg.attivo, 'acropoli');

// --------------------------------------------------------------------------
console.log('\n7. Il totale scende (un listino corretto): nessun tratto sotto zero.\n');

// tratti dell'Acropoli: 0-700, 1000-1400, e uno aperto da 1500; ha ceduto 150.
// Col totale sceso a 1200: 700 + 200 + 0 (non -300) - 150 = 750
verifica('totale sotto l\'inizio del tratto aperto', c.creditoDi(reg, 'acropoli', 1200), 750);

// --------------------------------------------------------------------------
console.log('\n8. Richieste che non vanno accettate.\n');

rifiuta('mondo sconosciuto', () => c.scegli(reg, 'atlantide', 1500));
rifiuta('riporto di un mondo sconosciuto', () => c.riporta(reg, { mondo: 'x', pezzi: 1, costo_te: 1, dono_te: 0 }, 0, ORA));
rifiuta('pezzi negativi', () => c.riporta(reg, { mondo: 'acropoli', pezzi: -3, costo_te: 1, dono_te: 0 }, 0, ORA));
rifiuta('costo non numerico', () => c.riporta(reg, { mondo: 'acropoli', pezzi: 3, costo_te: 'tanto', dono_te: 0 }, 0, ORA));
rifiuta('zero pezzi', () => c.riporta(reg, { mondo: 'acropoli', pezzi: 0, costo_te: 1, dono_te: 0 }, 0, ORA));

// --------------------------------------------------------------------------
console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
process.exitCode = falliti === 0 ? 0 : 1;
