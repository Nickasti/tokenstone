/* Client del contatore di token.

   Legge world/world-state.json, il file che il contatore riscrive mentre
   legge i transcript di Claude Code, in qualunque progetto si stia lavorando.
   Il cantiere e' uno solo: i token di tutti i progetti confluiscono qui.

   Se il file non c'e' (pagina servita da un altro server, contatore fermo)
   si passa alla modalita simulata, cosi la scena resta usabile lo stesso. */

import { WORLD_POLL_MS } from './config.js';

const STATE_URL = 'world/world-state.json';
const CREDIT_KEY = 'acropoli:credito-te';
/* La versione di prima accreditava token di cantiere, un TE ogni 250. Serve
   solo a convertire chi ha gia' un credito salvato: senza, al primo avvio gli
   verrebbe riaccreditato l'intero totale. */
const OLD_CREDIT_KEY = 'acropoli:credito';
const OLD_TE_PER_BUILD_TOKEN = 250;

const fmt = n => Math.round(n).toLocaleString('it-IT');

export class TokenSource {
  constructor(startTe) {
    this.live = false;
    this.balance = startTe;
    this.lastPct = null;
    this.listeners = [];
    this.info = 'simulazione';
    this.totalTe = 0;
    this.totalUsd = 0;
    /* Quanto credito ho gia' consegnato al cantiere. Vive in localStorage:
       senza, ogni ricarica della pagina accrediterebbe da capo l'intero
       totale e il cantiere si chiuderebbe da solo al terzo F5. */
    this.credited = 0;
    this.installedAt = null;
    this.priceWarning = '';
    this.loadCredit();
  }

  onChange(fn) { this.listeners.push(fn); }
  emit() { this.listeners.forEach(f => f(this)); }

  loadCredit() {
    try {
      const s = JSON.parse(localStorage.getItem(CREDIT_KEY) || 'null');
      if (s && typeof s.credited === 'number') {
        this.credited = s.credited;
        this.installedAt = s.installed_at || null;
        return;
      }
      const old = JSON.parse(localStorage.getItem(OLD_CREDIT_KEY) || 'null');
      if (old && typeof old.credited === 'number') {
        this.credited = old.credited * OLD_TE_PER_BUILD_TOKEN;
        this.installedAt = old.installed_at || null;
        this.saveCredit();
        localStorage.removeItem(OLD_CREDIT_KEY);
      }
    } catch (e) { /* modalita privata: si riparte da zero */ }
  }

  saveCredit() {
    try {
      localStorage.setItem(CREDIT_KEY, JSON.stringify({
        credited: this.credited,
        installed_at: this.installedAt
      }));
    } catch (e) { /* si continua senza memoria */ }
  }

  async probe() {
    const ok = await this.fetchOnce();
    if (ok) {
      this.poll();
    } else {
      this.live = false;
      this.info = 'simulazione - contatore non raggiungibile';
      this.emit();
    }
    return ok;
  }

  async fetchOnce() {
    try {
      const r = await fetch(STATE_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      if (!d || typeof d.total_te !== 'number') throw new Error('stato senza total_te');
      this.live = true;
      this.apply(d);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Il consumo reale di token diventa credito di costruzione:
     e' questa la meccanica del progetto, non un contatore astratto.

     I pezzi costano in TE, quindi il totale passa com'e': si accredita solo
     la differenza rispetto a quanto gia' consegnato, perche' il totale nel
     file e' cumulativo e cresce per sempre. */
  apply(d) {
    /* Contatore reinstallato da zero: il totale riparte, e riparte anche la
       soglia, altrimenti non si accrediterebbe piu' nulla. */
    if (d.installed_at && d.installed_at !== this.installedAt) {
      this.installedAt = d.installed_at;
      this.credited = 0;
      this.saveCredit();
    }

    this.totalTe = d.total_te;
    this.totalUsd = typeof d.total_usd === 'number' ? d.total_usd : 0;

    /* Modelli che il listino non conosce: il contatore li ha prezzati con la
       voce piu vicina, quindi il credito e una stima finche il listino non
       viene aggiornato. */
    const ignoti = Array.isArray(d.unknown_models) ? d.unknown_models : [];
    this.priceWarning = ignoti.length ? `prezzo stimato per ${ignoti.join(', ')}` : '';

    const guadagnati = Math.floor(d.total_te);
    const delta = guadagnati - this.credited;
    if (delta > 0) {
      this.balance += delta;
      this.credited = guadagnati;
      this.saveCredit();
    } else if (delta < 0) {
      /* lo stato e' arretrato: riallineo senza togliere nulla dal saldo */
      this.credited = guadagnati;
      this.saveCredit();
    }

    const sessioni = d.sessions ? Object.keys(d.sessions).length : 0;
    /* appena installato il contatore non ha ancora visto niente: deve
       sembrare un'attesa, non un guasto */
    this.info = !d.total_te && !sessioni
      ? 'cantiere reale - in attesa della prima risposta di Claude Code'
      : `cantiere reale - ${fmt(d.total_te)} TE` +
      (this.totalUsd ? ` (${this.totalUsd.toFixed(2)} $)` : '') +
      (sessioni ? ` da ${sessioni} session${sessioni === 1 ? 'e' : 'i'}` : '');

    this.emit();
  }

  poll() {
    if (this._t) clearInterval(this._t);
    this._t = setInterval(() => {
      /* il contatore puo' sparire: si continua col saldo corrente */
      this.fetchOnce();
    }, WORLD_POLL_MS);
  }

  /* Ripartire da capo azzera il cantiere, non il lavoro fatto: dimenticando
     quanto e' gia' stato consegnato, il totale del contatore viene riaccreditato
     per intero al primo giro di lettura. */
  resetCredit() {
    this.credited = 0;
    this.saveCredit();
  }

  spend(n) {
    if (this.balance < n) return false;
    this.balance -= n;
    this.emit();
    return true;
  }

  grant(n) { this.balance += n; this.emit(); }
}
