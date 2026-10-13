import { pieces } from './pieces.js';

const fmt = n => Math.floor(n).toLocaleString('it-IT');

/* Il pannello del cantiere: credito, prossimo blocco, fasi, sole. Le fasi e
   le parole della fine del cantiere sono del mondo, e arrivano con lui:
     phases     [{ k, b, y, n, t }] - chiave, edificio, anno, nome, testo
     completion { mark, text }       - cosa si legge a cantiere compiuto */
export class UI {
  constructor(handlers, world) {
    this.h = handlers;
    this.phases = world.phases;
    this.completion = world.completion;
    this.el = {
      tok:   document.getElementById('tokval'),
      lbl:   document.querySelector('#dock .tok .lbl'),
      src:   document.getElementById('toksrc'),
      warn:  document.getElementById('tokwarn'),
      mark:  document.getElementById('mark'),
      desc:  document.getElementById('desc'),
      build: document.getElementById('build'),
      auto:  document.getElementById('auto'),
      add:   document.getElementById('add'),
      rush:  document.getElementById('rush'),
      prog:  document.getElementById('prog'),
      note:  document.getElementById('note'),
      list:  document.getElementById('phlist'),
      solar: document.getElementById('solarval'),
      hour:  document.getElementById('hour')
    };
    this.buildPhaseList();
    this.wire();
  }

  buildPhaseList() {
    let lastB = '';
    this.phases.forEach(ph => {
      ph.total = pieces.filter(p => p.phase === ph.k).length;
      if (ph.b !== lastB) {
        const h = document.createElement('div');
        h.className = 'bld'; h.textContent = ph.b;
        this.el.list.appendChild(h);
        lastB = ph.b;
      }
      const d = document.createElement('div');
      d.className = 'ph'; d.id = 'ph-' + ph.k;
      d.innerHTML =
        `<div class="ph-h"><span class="ph-y">${ph.y}</span>` +
        `<span class="ph-t">${ph.n}</span>` +
        `<span class="ph-c" id="c-${ph.k}">0/${ph.total}</span></div>` +
        `<div class="bar"><i id="b-${ph.k}"></i></div>`;
      this.el.list.appendChild(d);
    });
  }

  wire() {
    this.el.build.onclick = () => this.h.build();
    this.el.auto.onclick  = () => this.h.toggleAuto();
    this.el.add.onclick   = () => this.h.grant();
    // la pagina di un mondo vecchio puo non avere il pulsante
    if (this.el.rush) this.el.rush.onclick = () => this.h.rush();
    this.el.hour.oninput  = e => this.h.setHour(parseFloat(e.target.value));
    document.getElementById('reset').onclick = () => this.h.reset();
    document.getElementById('fly').onclick   = () => this.h.fly();
    document.getElementById('tog').onclick   = () =>
      document.getElementById('phases').classList.toggle('open');
  }

  setAuto(on) {
    this.el.auto.textContent = on ? 'Ferma il cantiere' : 'Cantiere continuo';
    this.el.auto.className = on ? 'act' : '';
  }

  setSolar(text) { this.el.solar.textContent = text; }

  setGrant(te) { this.el.add.textContent = `+${fmt(te)} TE`; }

  render(state) {
    const { tokens, placed, total, totalCost, source, warn } = state;
    /* Credito sotto zero: i blocchi gia posati costano piu del credito. Succede
       quando i prezzi salgono - una nuova misura della settimana - perche il
       cantiere non torna mai indietro. Non e un debito da mostrare col meno:
       e quanto manca perche il cantiere riparta. */
    const behind = tokens < 0;
    if (this.el.lbl) this.el.lbl.textContent = behind ? 'Mancano · TE' : 'Credito · TE';
    this.el.tok.textContent = fmt(Math.abs(tokens));
    this.el.tok.classList.toggle('behind', behind);
    this.el.src.textContent = source;
    this.el.warn.hidden = !warn && !behind;
    this.el.warn.textContent = warn ||
      (behind ? 'prezzi saliti: il cantiere aspetta i token' : '');
    this.el.warn.title = warn
      ? 'Il listino non ha ancora il prezzo di questo modello: il credito è una stima. ' +
        'Per correggerlo, chiedi a Claude Code di aggiornare il listino.'
      : behind
        ? 'I blocchi posati restano dove sono, ma ai prezzi di adesso costano più del credito raccolto. ' +
          'Finché i token non coprono la differenza, il cantiere aspetta.'
        : '';
    this.el.prog.textContent =
      `${placed.toLocaleString('it-IT')} / ${total.toLocaleString('it-IT')} BLOCCHI`;

    const done = placed >= total;
    const p = done ? null : pieces[placed];
    this.el.mark.textContent = done ? this.completion.mark : p.id;
    this.el.desc.textContent = done ? this.completion.text : p.desc;
    this.el.build.disabled = done || tokens < p.cost;
    this.el.build.textContent = done ? 'Cantiere concluso'
      : (tokens < p.cost
          ? `Servono ${fmt(Math.ceil(p.cost - tokens))} TE in più`
          : `Posa il blocco - ${fmt(p.cost)} TE`);
    this.el.auto.disabled = done;

    const cur = done ? null : p.phase;
    this.phases.forEach(ph => {
      let n = 0;
      for (let i = 0; i < placed; i++) if (pieces[i].phase === ph.k) n++;
      document.getElementById('c-' + ph.k).textContent = `${n}/${ph.total}`;
      document.getElementById('b-' + ph.k).style.width = (n / ph.total * 100) + '%';
      document.getElementById('ph-' + ph.k).className =
        'ph' + (n === ph.total ? ' done' : (ph.k === cur ? ' on' : ''));
    });

    const ph = this.phases.find(x => x.k === cur);
    this.el.note.textContent = ph ? ph.t
      : `Cantiere completo: ${fmt(total)} blocchi per ${fmt(totalCost)} TE.`;
  }
}
