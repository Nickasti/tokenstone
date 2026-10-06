/* Il credito di un mondo, letto dal registro.

   Legge /api/registry: il totale del contatore e il credito di ogni mondo,
   che il server divide fra i mondi secondo il suo registro. La scena non
   tiene un saldo suo: dato il credito, sa quanti blocchi si possono pagare,
   e lo stesso conto lo fa ogni browser, su ogni dispositivo.

   Riferisce al server com'e fatto il mondo - pezzi, costo, dono iniziale - e
   fin dove e arrivato, perche il punto raggiunto non torni indietro e perche,
   a mondo completato, si sappia quanto credito avanza per il prossimo.

   Se il server non risponde si passa alla simulazione: c'e solo il dono
   iniziale, piu il credito regalato con ?dev. */

import { POLL_MS } from './config.js';

const API = '/api/registry';
// dopo tre giri senza risposta - quindici secondi - la scena lo dice
const MAX_MISSED = 3;

const fmt = n => Math.round(n).toLocaleString('it-IT');

export class CreditSource {
  constructor(world) {
    this.world = world;
    this.live = false;
    this.loaded = false;
    this.listeners = [];
    this.info = 'simulazione';
    this.priceWarning = '';
    this.credit = 0;        // TE del mondo secondo il registro, senza il dono
    this.placedMax = 0;     // il punto piu alto raggiunto, da qualunque browser
    this.active = true;
    this.waiting = 0;
    this.version = null;    // la versione dei file con cui questa scheda e partita
    this.missed = 0;
  }

  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(f => f(this)); }

  async probe() {
    const ok = await this.fetchOnce();
    if (!ok) {
      this.info = 'simulazione - contatore non raggiungibile';
      this.loaded = true;
      this.emit();
    }
    this.poll();
    return ok;
  }

  async fetchOnce() {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      if (!d || !d.worlds || !d.worlds[this.world]) throw new Error('registro senza ' + this.world);

      /* I file della scena sono cambiati da quando questa scheda e partita:
         il codice che sta eseguendo non e piu quello del server, e col tempo
         mostrerebbe un cantiere che non e quello vero. Si ricarica, e
         riparte dal registro come ogni scheda nuova. */
      if (d.client_version) {
        if (this.version && d.client_version !== this.version) { location.reload(); return true; }
        this.version = d.client_version;
      }

      this.live = true;
      this.missed = 0;
      this.apply(d);
      return true;
    } catch (e) {
      /* Il server puo sparire per un momento: si continua con l'ultimo credito
         noto. Se pero non torna, la scena non deve sembrare collegata. */
      if (this.live && ++this.missed === MAX_MISSED) {
        this.info = 'scollegato dal cantiere - il server non risponde, i numeri sono fermi';
        this.emit();
      }
      return false;
    }
  }

  apply(d) {
    const w = d.worlds[this.world];
    // la risposta a una scrittura porta il registro ma non il contatore
    if (d.counter) this._counter = d.counter;
    const c = this._counter || {};
    this.credit = Number(w.credit_te) || 0;
    this.placedMax = Number(w.placed_max) || 0;
    this.active = !!w.active;
    this.waiting = Number(d.waiting_te) || 0;

    /* Modelli che il listino non conosce: il contatore li ha prezzati con la
       voce piu vicina, quindi il credito e una stima finche il listino non
       viene aggiornato. */
    const unknown = Array.isArray(c.estimated_prices) ? c.estimated_prices : [];
    this.priceWarning = unknown.length ? `prezzo stimato per ${unknown.join(', ')}` : '';

    const sessions = c.sessions || 0;
    /* appena installato il contatore non ha ancora visto niente: deve
       sembrare un'attesa, non un guasto */
    if (!c.total_te && !sessions) {
      this.info = 'cantiere reale - in attesa della prima risposta di Claude Code';
    } else if (!this.active) {
      this.info = `in pausa - i token ora vanno a ${d.active || 'nessun mondo'}`;
    } else {
      this.info = `cantiere reale - ${fmt(c.total_te)} TE` +
        (c.total_usd ? ` (${c.total_usd.toFixed(2)} $)` : '') +
        (sessions ? ` da ${sessions} session${sessions === 1 ? 'e' : 'i'}` : '');
    }

    this.loaded = true;
    this.emit();
  }

  /* Com'e fatto il mondo e, se c'e, fin dove e arrivato. Senza placed si
     aggiorna solo la forma: e quello che fa ?dev, il cui credito regalato non
     deve finire nel registro. */
  async report(data) {
    if (!this.live) return;
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ action: 'report', world: this.world }, data)),
      });
      if (r.ok) this.apply(await r.json());
    } catch (e) { /* il prossimo giro di lettura rimette tutto in pari */ }
  }

  poll() {
    if (this._t) clearInterval(this._t);
    this._t = setInterval(() => this.fetchOnce(), POLL_MS);
  }
}
