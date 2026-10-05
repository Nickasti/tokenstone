import { PHASES } from './config.js';
import { pieces } from './pieces.js';

const fmt = n => Math.floor(n).toLocaleString('it-IT');

export class UI {
  constructor(handlers) {
    this.h = handlers;
    this.el = {
      tok:   document.getElementById('tokval'),
      src:   document.getElementById('toksrc'),
      warn:  document.getElementById('tokwarn'),
      mark:  document.getElementById('mark'),
      desc:  document.getElementById('desc'),
      build: document.getElementById('build'),
      auto:  document.getElementById('auto'),
      add:   document.getElementById('add'),
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
    PHASES.forEach(ph => {
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
    this.el.tok.textContent = fmt(tokens);
    this.el.src.textContent = source;
    this.el.warn.hidden = !warn;
    this.el.warn.textContent = warn || '';
    this.el.warn.title = warn
      ? 'Il listino non ha ancora il prezzo di questo modello: il credito e una stima. ' +
        'Per correggerlo, chiedi a Claude Code di aggiornare il listino.'
      : '';
    this.el.prog.textContent =
      `${placed.toLocaleString('it-IT')} / ${total.toLocaleString('it-IT')} BLOCCHI`;

    const done = placed >= total;
    const p = done ? null : pieces[placed];
    this.el.mark.textContent = done ? 'TELOS' : p.id;
    this.el.desc.textContent = done
      ? 'Il programma di Pericle e compiuto - 406 a.C.'
      : p.desc;
    this.el.build.disabled = done || tokens < p.cost;
    this.el.build.textContent = done ? 'Cantiere concluso'
      : (tokens < p.cost
          ? `Servono ${fmt(Math.ceil(p.cost - tokens))} TE in piu`
          : `Posa il blocco - ${fmt(p.cost)} TE`);
    this.el.auto.disabled = done;

    const cur = done ? null : p.phase;
    PHASES.forEach(ph => {
      let n = 0;
      for (let i = 0; i < placed; i++) if (pieces[i].phase === ph.k) n++;
      document.getElementById('c-' + ph.k).textContent = `${n}/${ph.total}`;
      document.getElementById('b-' + ph.k).style.width = (n / ph.total * 100) + '%';
      document.getElementById('ph-' + ph.k).className =
        'ph' + (n === ph.total ? ' done' : (ph.k === cur ? ' on' : ''));
    });

    const ph = PHASES.find(x => x.k === cur);
    this.el.note.textContent = ph ? ph.t
      : `Cantiere completo: ${fmt(total)} blocchi per ${fmt(totalCost)} TE.`;
  }
}
