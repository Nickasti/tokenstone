/* Client del cantiere.

   Legge /api/cantiere: il totale del contatore e il credito di ogni mondo,
   che il server divide fra i mondi secondo il suo registro. La scena non
   tiene un saldo suo: dato il credito, sa quanti blocchi si possono pagare,
   e lo stesso conto lo fa ogni browser, su ogni dispositivo.

   Riferisce al server com'e fatto il mondo - pezzi, costo, dono iniziale - e
   fin dove e arrivato, perche il punto raggiunto non torni indietro e perche,
   a mondo completato, si sappia quanto credito avanza per il prossimo.

   Se il server non risponde si passa alla simulazione: c'e solo il dono
   iniziale, piu il credito regalato con ?dev. */

import { WORLD_POLL_MS } from './config.js';

const API = '/api/cantiere';

const fmt = n => Math.round(n).toLocaleString('it-IT');

export class TokenSource {
  constructor(mondo) {
    this.mondo = mondo;
    this.live = false;
    this.loaded = false;
    this.listeners = [];
    this.info = 'simulazione';
    this.priceWarning = '';
    this.credit = 0;        // TE del mondo secondo il registro, senza il dono
    this.posatiMax = 0;     // il punto piu alto raggiunto, da qualunque browser
    this.attivo = true;
    this.inAttesa = 0;
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
      if (!d || !d.mondi || !d.mondi[this.mondo]) throw new Error('registro senza ' + this.mondo);
      this.live = true;
      this.apply(d);
      return true;
    } catch (e) {
      return false;
    }
  }

  apply(d) {
    const m = d.mondi[this.mondo];
    // la risposta a una scrittura porta il registro ma non il contatore
    if (d.contatore) this._contatore = d.contatore;
    const c = this._contatore || {};
    this.credit = Number(m.credito_te) || 0;
    this.posatiMax = Number(m.posati_max) || 0;
    this.attivo = !!m.attivo;
    this.inAttesa = Number(d.in_attesa_te) || 0;

    /* Modelli che il listino non conosce: il contatore li ha prezzati con la
       voce piu vicina, quindi il credito e una stima finche il listino non
       viene aggiornato. */
    const ignoti = Array.isArray(c.prezzi_stimati) ? c.prezzi_stimati : [];
    this.priceWarning = ignoti.length ? `prezzo stimato per ${ignoti.join(', ')}` : '';

    const sessioni = c.sessioni || 0;
    /* appena installato il contatore non ha ancora visto niente: deve
       sembrare un'attesa, non un guasto */
    if (!c.totale_te && !sessioni) {
      this.info = 'cantiere reale - in attesa della prima risposta di Claude Code';
    } else if (!this.attivo) {
      this.info = `in pausa - i token ora vanno a ${d.attivo || 'nessun mondo'}`;
    } else {
      this.info = `cantiere reale - ${fmt(c.totale_te)} TE` +
        (c.totale_usd ? ` (${c.totale_usd.toFixed(2)} $)` : '') +
        (sessioni ? ` da ${sessioni} session${sessioni === 1 ? 'e' : 'i'}` : '');
    }

    this.loaded = true;
    this.emit();
  }

  /* Com'e fatto il mondo e, se c'e, fin dove e arrivato. Senza posati si
     aggiorna solo la forma: e quello che fa ?dev, il cui credito regalato non
     deve finire nel registro. */
  async report(dati) {
    if (!this.live) return;
    try {
      const r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ azione: 'riporta', mondo: this.mondo }, dati)),
      });
      if (r.ok) this.apply(await r.json());
    } catch (e) { /* il prossimo giro di lettura rimette tutto in pari */ }
  }

  poll() {
    if (this._t) clearInterval(this._t);
    this._t = setInterval(() => {
      /* il server puo sparire: si continua con l'ultimo credito noto */
      this.fetchOnce();
    }, WORLD_POLL_MS);
  }
}
