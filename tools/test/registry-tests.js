#!/usr/bin/env node
/**
 * Banco di prova del registro dei cantieri: i conti del credito fra i mondi,
 * senza disco e senza server.
 *
 *   node tools/test/registry-tests.js
 *
 * Il registro conosce un solo mondo vero, l'Acropoli; per provare pausa e
 * avanzo ne serve un secondo, e i test lo aggiungono all'elenco dei mondi,
 * insieme a uno "in arrivo" che non si puo ancora scegliere.
 */
'use strict';

const c = require('../registry.js');
c.WORLDS.giza = { status: 'available' };
c.WORLDS.atlantis = { status: 'coming' };

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
    verifica(nome, err instanceof c.Refusal, true);
  }
}
const acropolis = (placed) => ({ world: 'acropolis', pieces: 100, cost_te: 1000, gift_te: 50, placed });

// --------------------------------------------------------------------------
console.log('\n1. Primo avvio: nessun mondo attivo, i TE aspettano; il primo mondo\n   scelto riceve tutto il consumo dall\'installazione.\n');

let reg = c.newRegistry(ORA);
verifica('nessun mondo attivo', reg.active, null);
verifica('nessuno ha credito', c.creditOf(reg, 'acropolis', 500), 0);
verifica('500 TE in attesa', c.view(reg, 500).waiting_te, 500);
c.choose(reg, 'acropolis', 500);
verifica('scelta l\'Acropoli', reg.active, 'acropolis');
verifica('riceve anche quelli in attesa', c.creditOf(reg, 'acropolis', 600), 600);
verifica('gli altri mondi non hanno niente', c.creditOf(reg, 'giza', 600), 0);
verifica('niente piu in attesa', c.view(reg, 600).waiting_te, 0);

// --------------------------------------------------------------------------
console.log('\n2. Avanzamento: il punto piu alto raggiunto puo solo salire.\n');

c.report(reg, acropolis(40), 600, ORA);
verifica('posati', reg.worlds.acropolis.placed_max, 40);
c.report(reg, acropolis(25), 600, ORA);
verifica('un riporto piu basso non toglie niente', reg.worlds.acropolis.placed_max, 40);
c.report(reg, { world: 'acropolis', pieces: 100, cost_te: 1000, gift_te: 50 }, 600, ORA);
verifica('senza posati (?dev) si aggiorna solo la forma', reg.worlds.acropolis.placed_max, 40);
c.report(reg, acropolis(500), 600, ORA);
verifica('mai oltre i pezzi che esistono', reg.worlds.acropolis.placed_max, 100);
reg.worlds.acropolis.placed_max = 40;  // torna indietro per le prove successive
reg.worlds.acropolis.completed_at = null;

// --------------------------------------------------------------------------
console.log('\n3. Pausa: l\'Acropoli a meta, si comincia Giza.\n');

c.choose(reg, 'giza', 700);
verifica('attivo', reg.active, 'giza');
verifica('acropoli ferma a 700', c.creditOf(reg, 'acropolis', 900), 700);
verifica('giza riceve da 700 in poi', c.creditOf(reg, 'giza', 900), 200);
verifica('nessun avanzo: l\'Acropoli non e finita', reg.transfers.length, 0);

// --------------------------------------------------------------------------
console.log('\n4. Ripresa: si torna all\'Acropoli, che ritrova il suo credito.\n');

c.choose(reg, 'acropolis', 1000);
verifica('acropoli: 700 di prima + 300 da adesso', c.creditOf(reg, 'acropolis', 1300), 1000);
verifica('giza ferma a 300', c.creditOf(reg, 'giza', 1300), 300);
const prima = JSON.stringify(reg);
c.choose(reg, 'acropolis', 1300);
verifica('scegliere il mondo gia attivo non cambia niente', JSON.stringify(reg), prima);

// --------------------------------------------------------------------------
console.log('\n5. Avanzo: l\'Acropoli si completa, il credito in piu passa a Giza.\n');

// a 1300 l'Acropoli ha 50 di dono + 1000 di credito = 1050, costa 1000
c.report(reg, acropolis(100), 1300, ORA);
verifica('completata', c.completed(reg, 'acropolis'), true);
verifica('credito in attesa', c.view(reg, 1300).waiting_te, 50);
verifica('continua a crescere finche non si sceglie', c.view(reg, 1400).waiting_te, 150);
c.choose(reg, 'giza', 1400);
verifica('avanzo registrato', reg.transfers, [{ from: 'acropolis', to: 'giza', te: 150 }]);
verifica('giza: 300 di prima + 150 di avanzo', c.creditOf(reg, 'giza', 1400), 450);
verifica('e da qui cresce', c.creditOf(reg, 'giza', 1500), 550);
verifica('l\'Acropoli resta esattamente pagata', 50 + c.creditOf(reg, 'acropolis', 1500), 1000);
rifiuta('un mondo compiuto non si riprende', () => c.choose(reg, 'acropolis', 1500));

// --------------------------------------------------------------------------
console.log('\n6. Pezzi nuovi in un mondo compiuto: torna in corso.\n');

c.report(reg, { world: 'acropolis', pieces: 120, cost_te: 1200, gift_te: 50 }, 1500, ORA);
verifica('non piu completato', c.completed(reg, 'acropolis'), false);
verifica('senza data di completamento', reg.worlds.acropolis.completed_at, null);
c.choose(reg, 'acropolis', 1500);
verifica('e si puo riprendere', reg.active, 'acropolis');

// --------------------------------------------------------------------------
console.log('\n7. Il totale scende (un listino corretto): nessun tratto sotto zero.\n');

// tratti dell'Acropoli: 0-700, 1000-1400, e uno aperto da 1500; ha ceduto 150.
// Col totale sceso a 1200: 700 + 200 + 0 (non -300) - 150 = 750
verifica('totale sotto l\'inizio del tratto aperto', c.creditOf(reg, 'acropolis', 1200), 750);

// --------------------------------------------------------------------------
console.log('\n8. Richieste che non vanno accettate.\n');

rifiuta('mondo sconosciuto', () => c.choose(reg, 'atlantide-inventata', 1500));
rifiuta('riporto di un mondo sconosciuto', () => c.report(reg, { world: 'x', pieces: 1, cost_te: 1, gift_te: 0 }, 0, ORA));
rifiuta('pezzi negativi', () => c.report(reg, { world: 'acropolis', pieces: -3, cost_te: 1, gift_te: 0 }, 0, ORA));
rifiuta('costo non numerico', () => c.report(reg, { world: 'acropolis', pieces: 3, cost_te: 'tanto', gift_te: 0 }, 0, ORA));
rifiuta('zero pezzi', () => c.report(reg, { world: 'acropolis', pieces: 0, cost_te: 1, gift_te: 0 }, 0, ORA));
rifiuta('un mondo in arrivo non si sceglie', () => c.choose(reg, 'atlantis', 1500));

// --------------------------------------------------------------------------
console.log('\n9. Il registro della fase 1, coi campi in italiano, si converte intero.\n');

const vecchio = {
  versione: 1, creato_at: '2026-10-06T10:00:00.000Z', attivo: 'acropoli',
  tratti: [{ mondo: 'acropoli', da_te: 0, a_te: null }],
  avanzi: [],
  mondi: { acropoli: { pezzi: 3280, costo_te: 132856567, dono_te: 1636911, posati_max: 208, completato_at: null } },
};
const nuovo = c.upgrade(vecchio);
verifica('versione', nuovo.version, 2);
verifica('mondo attivo, col nome nuovo', nuovo.active, 'acropolis');
verifica('tratti', nuovo.segments, [{ world: 'acropolis', from_te: 0, to_te: null }]);
verifica('avanzamento conservato', nuovo.worlds.acropolis,
  { pieces: 3280, cost_te: 132856567, gift_te: 1636911, placed_max: 208, completed_at: null });
verifica('stesso credito di prima', c.creditOf(nuovo, 'acropolis', 9899074), 9899074);
verifica('un registro gia nuovo resta com\'e', c.upgrade(nuovo), nuovo);

// --------------------------------------------------------------------------
console.log('\n10. Lo stato di un\'installazione vecchia passa da world/ a state/.\n');

const fs = require('fs');
const os = require('os');
const path = require('path');
const { migrateLegacyState } = require('../migrate.js');

const radice = fs.mkdtempSync(path.join(os.tmpdir(), 'acropoli-migra-'));
fs.mkdirSync(path.join(radice, 'world', '.world-state.lock'), { recursive: true });
fs.writeFileSync(path.join(radice, 'world', 'world-state.json'), '{"total_te":5}');
fs.writeFileSync(path.join(radice, 'world', '.world-state.bak'), '{"total_te":5}');
fs.writeFileSync(path.join(radice, 'world', 'cantiere.json'), JSON.stringify(vecchio));
const spostati = migrateLegacyState(radice);
verifica('file spostati', spostati, ['world-state.json', '.world-state.bak', 'cantiere.json -> registry.json']);
verifica('lo stato e nel posto nuovo', fs.readFileSync(path.join(radice, 'state', 'world-state.json'), 'utf8'), '{"total_te":5}');
verifica('il registro col nome nuovo', fs.existsSync(path.join(radice, 'state', 'registry.json')), true);
verifica('la cartella vecchia non c\'e piu', fs.existsSync(path.join(radice, 'world')), false);
verifica('una seconda volta non fa niente', migrateLegacyState(radice), []);

// --------------------------------------------------------------------------
console.log('\n11. Il piano di Claude: si sceglie al primo avvio, e decide la settimana.\n');

const r11 = c.newRegistry(ORA);
verifica('al primo avvio nessun piano', c.view(r11, 0).plan, null);
verifica('i piani che si possono scegliere', c.view(r11, 0).plans.map(p => p.id), ['pro', 'max5', 'max20']);
verifica('quello predefinito', c.view(r11, 0).default_plan, 'pro');
c.setPlan(r11, 'max5');
verifica('scelto Max 5x', c.view(r11, 0).plan, { id: 'max5', name: 'Max 5x', weekly_te: 330000000 });
rifiuta('un piano che non esiste', () => c.setPlan(r11, 'ultra'));
rifiuta('un piano che non e una parola', () => c.setPlan(r11, 5));
verifica('il rifiuto non cambia il piano', r11.plan, 'max5');
const piani = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'engine', 'plans.json'), 'utf8')).plans;
const pro = piani.find(p => p.id === 'pro').weekly_te;
verifica('Max 5x vale cinque volte Pro', piani.find(p => p.id === 'max5').weekly_te, pro * 5);
verifica('Max 20x vale venti volte Pro', piani.find(p => p.id === 'max20').weekly_te, pro * 20);
// il valore di riserva della scena e quello di Pro: i due numeri non devono separarsi
const config = fs.readFileSync(path.join(__dirname, '..', '..', 'engine', 'config.js'), 'utf8');
verifica('WEEKLY_TE di engine/config.js e Pro', Number(/WEEKLY_TE = (\d+)/.exec(config)[1]), pro);
verifica('un registro di prima, senza piano, resta senza piano', c.view(c.upgrade(vecchio), 0).plan, null);

// --------------------------------------------------------------------------
console.log('\n' + (falliti === 0 ? 'Tutti i controlli passati.' : falliti + ' controlli falliti.') + '\n');
process.exitCode = falliti === 0 ? 0 : 1;
