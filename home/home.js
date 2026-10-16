/* La pagina iniziale: il contatore, i mondi, la scelta di quello da costruire.

   Legge due cose dal server: /api/worlds, i dati di ogni mondo dai loro
   world.json, e /api/registry, il credito e l'avanzamento di ciascuno. Le
   rilegge ogni cinque secondi, come la scena.

   Visitare un mondo non lo rende attivo: si guarda e basta. Scegliere e
   un'azione a parte, con una conferma che dice cosa succede al credito. */

const POLL_MS = 5000;
const fmt = n => Math.round(n).toLocaleString('it-IT');
const $ = id => document.getElementById(id);

let worlds = [];
let reg = null;
let version = null;

function el(tag, attrs, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of children) if (c !== null && c !== undefined) e.append(c);
  return e;
}

/* La durata di un mondo in parole: le settimane di world.json sono di
   lavoro a pieno regime, cioe col 100% della quota settimanale. */
function durata(weeks) {
  if (!weeks) return null;
  if (weeks < 1.5) return 'circa una settimana di lavoro';
  if (weeks < 3.5) return `circa ${Math.round(weeks)} settimane di lavoro`;
  const mesi = weeks * 7 / 30;
  return mesi < 1.5 ? 'circa un mese di lavoro' : `circa ${Math.round(mesi)} mesi di lavoro`;
}

/** In che condizione e un mondo, per la sua scheda. */
function stato(w, r) {
  if (w.status !== 'available' || !w.has_page) return { key: 'coming', label: 'In arrivo' };
  if (r.completed) return { key: 'done', label: 'Compiuto' };
  if (r.active) return { key: 'on', label: 'In costruzione' };
  if (r.placed_max > 0) return { key: 'paused', label: 'In pausa' };
  return { key: 'new', label: 'Da cominciare' };
}

function nome(id) {
  const w = worlds.find(x => x.id === id);
  return w ? w.name : id;
}

/* ─────────── la conferma ─────────── */

function conferma(w) {
  const active = reg.active;
  const ar = active ? reg.worlds[active] : null;
  const testo = [];
  if (!active) {
    testo.push(`${w.name} riceve i ${fmt(reg.waiting_te)} TE in attesa e tutti quelli che arriveranno.`);
  } else if (ar && ar.completed) {
    testo.push(`${nome(active)} è compiuto: i ${fmt(reg.waiting_te)} TE che ha in più passano a ${w.name}.`);
  } else {
    testo.push(`${nome(active)} va in pausa: tiene il suo credito e i suoi ${fmt(ar ? ar.placed_max : 0)} blocchi, ` +
      `e lo ritrovi com'è quando torni.`);
  }
  testo.push(`Da adesso i token che consumi costruiscono ${w.name}.`);

  const d = $('confirm');
  $('confirm-title').textContent = active ? `Passare a ${w.name}?` : `Cominciare ${w.name}?`;
  const corpo = $('confirm-text');
  corpo.replaceChildren(...testo.map(t => el('p', null, t)));
  $('confirm-ok').textContent = active ? `Passa a ${w.name}` : `Comincia ${w.name}`;
  $('confirm-ok').onclick = () => scegli(w);
  d.showModal();
}

async function scegli(w) {
  $('confirm-ok').disabled = true;
  try {
    const r = await fetch('/api/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'choose', world: w.id }),
    });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    location.href = `/worlds/${w.id}/`;
  } catch (e) {
    $('confirm-text').append(el('p', null, 'Non si è potuto cambiare mondo: ' + e.message));
    $('confirm-ok').disabled = false;
  }
}

/* ─────────── il piano ───────────
   Il piano di Claude decide quanto vale una settimana di lavoro, e quindi
   quanto costa ogni blocco: chi ha piu token paga di piu, cosi un mondo dura
   lo stesso numero di settimane per tutti. Al primo avvio la pagina lo
   chiede prima di ogni altra cosa; dopo si cambia dalla riga sotto il
   contatore. */

let planAsked = false;

function milioni(te) {
  return te >= 1e9
    ? `${(te / 1e9).toLocaleString('it-IT', { maximumFractionDigits: 2 })} miliardi`
    : `${Math.round(te / 1e6).toLocaleString('it-IT')} milioni`;
}

function scegliPiano(first) {
  const d = $('plan');
  const testo = [
    'Il piano decide quanto vale una settimana di lavoro, e quindi quanto costa ogni blocco. ' +
    'Con un piano più grande consumi più token e i blocchi costano di più: un mondo dura lo ' +
    'stesso numero di settimane per tutti.'
  ];
  if (!first) {
    testo.push('Cambiare piano ricalcola i prezzi di tutti i mondi. I blocchi già posati restano: ' +
      'con un piano più grande il cantiere aspetta finché i token non raggiungono i prezzi nuovi, ' +
      'con uno più piccolo riparte più svelto.');
  }
  $('plan-text').replaceChildren(...testo.map(t => el('p', null, t)));
  const current = reg.plan ? reg.plan.id : null;
  $('plan-options').replaceChildren(...reg.plans.map(p =>
    el('button', { class: 'btn plan-opt' + (p.id === current ? ' current' : ''), type: 'button',
      'data-plan': p.id, onclick: () => salvaPiano(p.id) },
      el('b', null, p.name),
      el('span', null, `${milioni(p.weekly_te)} di TE a settimana`),
      el('small', null, p.basis))));
  $('plan-cancel').hidden = first;
  d.dataset.first = first ? '1' : '';
  d.showModal();
}

async function salvaPiano(id) {
  const d = $('plan');
  if (reg.plan && reg.plan.id === id) return d.close();
  d.querySelectorAll('.plan-opt').forEach(b => { b.disabled = true; });
  try {
    const r = await fetch('/api/registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'plan', plan: id }),
    });
    if (!r.ok) throw new Error((await r.json()).error || r.status);
    d.close();
    await load();
  } catch (e) {
    $('plan-text').append(el('p', null, 'Non si è potuto salvare il piano: ' + e.message));
    d.querySelectorAll('.plan-opt').forEach(b => { b.disabled = false; });
  }
}

/* ─────────── le schede ─────────── */

function card(w) {
  const r = (reg && reg.worlds[w.id]) || {};
  const s = stato(w, r);
  const url = `/worlds/${w.id}/`;
  const img = el('div', { class: 'img', role: 'img', 'aria-label': w.name },
    el('span', { class: 'chip ' + s.key }, s.label));
  if (w.preview) img.style.backgroundImage = `url("/worlds/${w.id}/${w.preview}")`;

  const actions = el('div', { class: 'actions' });
  const button = (label, onclick, primary) =>
    el('button', { class: 'btn' + (primary ? ' primary' : ''), type: 'button', onclick }, label);
  const link = (label, href, primary) =>
    el('a', { class: 'btn' + (primary ? ' primary' : ''), href }, label);

  if (s.key === 'on') {
    actions.append(link('Entra', url, true), link('Guarda come si costruisce', url + '?demo'));
  } else if (s.key === 'paused') {
    actions.append(button('Riprendi', () => conferma(w), true), link('Visita', url),
      link('Guarda come si costruisce', url + '?demo'));
  } else if (s.key === 'new') {
    actions.append(button(reg && reg.active ? 'Passa a questo mondo' : 'Comincia', () => conferma(w), true),
      link('Guarda come si costruisce', url + '?demo'));
  } else if (s.key === 'done') {
    actions.append(link('Visita', url, true), link('Riguarda la costruzione', url + '?demo'));
  }

  let progress = null;
  if (r.pieces && r.placed_max > 0) {
    const pct = Math.min(100, r.placed_max / r.pieces * 100);
    const bar = el('div', { class: 'bar' }, el('i'));
    bar.firstChild.style.width = pct.toFixed(1) + '%';
    progress = el('div', null, bar,
      el('div', { class: 'progress' }, `${fmt(r.placed_max)} / ${fmt(r.pieces)} blocchi · ${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`));
  }

  const meta = [w.place, w.era, durata(w.weeks)].filter(Boolean).join(' · ');
  return el('article', { class: 'card ' + s.key },
    img,
    el('div', { class: 'body' },
      el('h3', null, w.name),
      el('div', { class: 'sub' }, w.subtitle || ''),
      el('div', { class: 'meta' }, meta),
      el('p', { class: 'desc' }, w.description || ''),
      progress,
      actions.childNodes.length ? actions : null));
}

/* ─────────── il contatore ─────────── */

function render() {
  const c = (reg && reg.counter) || {};
  $('total').replaceChildren(fmt(c.total_te || 0), el('small', null, 'TE'));
  $('usd').textContent = c.total_usd
    ? `Valgono circa ${c.total_usd.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ ` +
      `a prezzo di listino. Con un abbonamento non è quello che paghi: è il valore del lavoro, che serve a ` +
      `pesare i token di modelli diversi.`
    : '';

  const state = $('state');
  if (!reg) {
    state.textContent = 'il server non risponde: avvia TokenStone e ricarica la pagina';
  } else if (!c.total_te && !c.sessions) {
    state.textContent = 'In attesa della prima risposta di Claude Code.';
  } else if (reg.active) {
    state.replaceChildren('Ora si costruisce ', el('b', null, nome(reg.active)), '.');
    if (reg.waiting_te > 0) state.append(` ${fmt(reg.waiting_te)} TE avanzati aspettano il prossimo mondo.`);
  } else {
    state.replaceChildren(el('b', null, 'Nessun mondo in costruzione.'), ` ${fmt(reg.waiting_te)} TE in attesa.`);
  }
  $('plan-line').hidden = !(reg && reg.plan);
  if (reg && reg.plan) $('plan-name').textContent = reg.plan.name;
  $('first').hidden = !(reg && reg.plan && !reg.active);
  $('first-te').textContent = reg ? fmt(reg.waiting_te) : '0';

  $('worlds').replaceChildren(...worlds.map(card));
}

async function load() {
  try {
    const [w, r] = await Promise.all([
      fetch('/api/worlds', { cache: 'no-store' }).then(x => x.json()),
      fetch('/api/registry', { cache: 'no-store' }).then(x => x.json()),
    ]);
    // come la scena: se i file sono cambiati, questa pagina e vecchia
    if (r.client_version) {
      if (version && r.client_version !== version) return location.reload();
      version = r.client_version;
    }
    worlds = w;
    reg = r;
  } catch (e) {
    reg = null;
  }
  // la conferma aperta non si ridisegna sotto le dita di chi la sta leggendo
  if (!$('confirm').open) render();
  // al primo avvio, prima di tutto, il piano
  if (reg && !reg.plan && reg.plans && !planAsked && !$('plan').open) {
    planAsked = true;
    scegliPiano(true);
  }
}

$('confirm-no').onclick = () => $('confirm').close();
$('plan-cancel').onclick = () => $('plan').close();
$('plan-change').onclick = () => { if (reg && reg.plans) scegliPiano(false); };
// alla prima scelta non si scappa con Esc: senza piano i prezzi sarebbero quelli di Pro
$('plan').addEventListener('cancel', e => { if ($('plan').dataset.first) e.preventDefault(); });
load();
setInterval(load, POLL_MS);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
