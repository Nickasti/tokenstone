/* Misure reali dei monumenti dell'Acropoli, in metri.
   Dove la ricostruzione è incerta il valore è segnalato nel commento. */

export const FLUTE_SEGMENTS = 44;   // abbassa a 32 se il frame rate cala

/* ---- pianoro: 268 × 126 m, asse maggiore est-ovest ---- */
export const PLATEAU = { cx: -70, cz: 0, a: 134, b: 63 };

/* ---- sistema di riferimento: +X est, -Z nord, origine al Partenone ---- */
export const SITE = {
  parthenon  : { x:    0, z:   0, rot: Math.PI / 2, base: 0.0 },
  erechtheion: { x:  -41, z: -25, rot: Math.PI / 2, base: 0.4 },
  propylaea  : { x: -147, z:  -3, rot: 0,           base: 1.2 },
  nike       : { x: -166, z:  17, rot: 0,           base: 0.6 },
  promachos  : { x:  -84, z: -14, rot: 0,           base: 0.0 },

  /* punti del pianoro: servono solo alla camera del pulsante "avvicina" */
  pandroseion: { x:  -60, z: -25, rot: 0,           base: 0.0 },
  muranord   : { x:  -70, z: -52, rot: 0,           base: 0.0 },
  odos       : { x:  -70, z:   8, rot: 0,           base: 0.0 },
  bomos      : { x:  -16, z: -27, rot: 0,           base: 0.0 },
  temene     : { x: -106, z:  32, rot: 0,           base: 0.0 },
  anathemata : { x:  -70, z:   0, rot: 0,           base: 0.0 }
};

/* ---- Partenone ---- */
export const PARTHENON = {
  stylobateW: 30.88, stylobateL: 69.51,
  stepH: 0.51, stepInset: 0.68, steps: 3,
  colsFront: 8, colsFlank: 17, colAxisInset: 1.42,
  colH: 10.43, rBot: 0.9525, rTop: 0.74, drums: 11,
  entDepth: 1.55, architraveH: 1.35, friezeH: 1.35, geisonH: 0.62,
  triglyphsFront: 15, triglyphsFlank: 33,   // 92 metope in totale
  pedimentH: 3.43,
  cellaW: 21.7, cellaL: 59.0, cellaH: 10.4
};

/* ---- raffinatezze ottiche ----
   Nessuna linea del Partenone e davvero retta. Le deviazioni sono minime
   e deliberate: correggono l illusione ottica che farebbe apparire
   incavato uno stilobate piatto e rastremate delle colonne verticali.
   Metti `on: false` per vedere lo stesso tempio senza correzioni. */
export const REFINEMENTS = {
  on: true,
  curveFront : 0.060,   // innalzamento dello stilobate a meta delle fronti
  curveFlank : 0.110,   // ... e a meta dei fianchi: 11 cm su 69,51 m
  convergence: 2400,    // quota a cui si incontrerebbero gli assi delle colonne
  cornerSwell: 1.021,   // colonne d angolo piu grosse: 1,944 m contro 1,905
  contract   : 0.61     // contrazione dei due intercolumni d angolo
};

/* ---- Propilei. Mnesicle ne progetta quattro ali, la guerra ne ferma due ---- */
export const PROPYLAEA = {
  w: 24.2, l: 18.2,
  colWestH: 8.81, colEastH: 8.57,   // le due fronti sono su quote diverse
  ionicH: 10.25, westFloorDrop: -1.6
};

/* ---- Tempio di Atena Nike: anfiprostilo tetrastilo ionico ---- */
export const NIKE = {
  bastionH: 8.6, bastionW: 11.4, bastionL: 9.4,
  w: 5.4, l: 8.3, colH: 4.06, rBot: 0.28, rTop: 0.24
};

/* ---- Eretteo: tre livelli diversi per rispettare i culti preesistenti ---- */
export const ERECHTHEION = {
  w: 11.6, l: 22.2, wallH: 7.6,
  eastColH: 6.58, northColH: 7.63, northFloorDrop: -3.2,
  caryatidH: 2.31, caryatids: 6
};

/* ---- policromia ----
   Quanto del programma cromatico mostrare. Con `on: false` restano solo
   triglifi e taenia, cioe il minimo indiscutibile. */
export const POLYCHROMY = { on: true };

/* ---- posizione solare: Atene ---- */
export const SOLAR = { lat: 37.9715, lon: 23.7267, tz: 3, dayOfYear: 237 };

/* ---- peso relativo di ogni tipo di pezzo ----
   Non sono token: dicono quanto costa un pezzo rispetto agli altri (una
   metopa vale quattro rocchi e mezzo, la Parthenos cento). Il prezzo vero,
   in TE, lo fissa CANTIERE qui sotto ridistribuendo il budget su questi pesi. */
export const COST = {
  step: 6, drum: 4, capital: 9, ionicBase: 7,
  wall: 5, architrave: 9, triglyph: 7, metope: 18, ionicFrieze: 15,
  geison: 9, tympanum: 20, rakingCornice: 12, sculpture: 45,
  roof: 7, caryatid: 55, bastion: 8, foundation: 5, rough: 6,
  athenaParthenos: 400, promachos: 180, statueBase: 25,

  /* il pianoro */
  slab: 4, reusedDrum: 9,
  kore: 38, tripod: 30, herm: 18, stele: 12, basin: 16,
  sacredOlive: 120, tree: 22, shrub: 8
};

/* ---- quanto costa l'Acropoli ----

   Il contatore in tools/token-counter scrive in world/world-state.json un
   totale in "token equivalenti": i token davvero consumati, pesati sul prezzo
   di listino (l'output costa cinque volte l'input, la lettura di cache un
   decimo). I pezzi si pagano direttamente in TE, senza conversioni.

   La misura del cantiere e' un mese di lavoro a pieno regime: ogni settimana
   si esaurisce il 100% dell'utilizzo concesso da Claude Code, e dopo un mese
   l'ultimo blocco e' posato. Il budget totale, weeklyTe * weeks, viene
   ripartito sui pesi di COST: ogni pezzo costa peso * (budget / somma dei
   pesi), cosi il totale torna esatto anche se si aggiungono pezzi.

   weeklyTe e' quanti TE vale il 100% della finestra settimanale. Non e' un
   dato pubblico e dipende dal piano, quindi si misura. Il modo piu preciso
   e' una lettura sola, verso la fine della finestra: /usage da la
   percentuale e l'ora del reset, la finestra e' cominciata sette giorni
   prima del reset, e il contatore sa quanti TE sono caduti da allora.
     weeklyTe = TE nella finestra / percentuale * 100
   Piu alta la percentuale, piu piccolo l'errore dell'arrotondamento.

   Prima misura, 5 ottobre 2026: 12% della settimana, 3.709.015 TE di
   Claude Code nella finestra, quindi 31 milioni. E un limite inferiore, non
   una misura: in quella settimana si era usato anche claude.ai, e il 12%
   comprende chat che i transcript non vedono. Il valore vero e piu alto, e
   va rimisurato su una settimana di solo Claude Code. Vale comunque per il
   piano di chi l'ha misurato: con un altro piano va rimisurato.

   Per orientarsi: la finestra breve di cinque ore, nello stesso giorno, e
   arrivata al 42% con 3.626.815 TE, cioe circa 8,6 milioni per una
   sessione piena. Non serve a ricavare la settimana, perche il rapporto
   fra i due limiti non e pubblico.

   La misura conta solo Claude Code su questo computer. Se nella stessa
   settimana si e' usato anche claude.ai, che consuma la stessa quota, la
   percentuale comprende consumi che i transcript non vedono, e il valore
   esce piu basso del vero.

   Il contatore conta tutti i progetti, non solo questo, ed e' giusto cosi:
   anche la percentuale di /usage li conta tutti, quindi le due misure sono
   coerenti. */
export const CANTIERE = {
  weeklyTe: 31000000,   // 100% della settimana: limite inferiore, da rimisurare
  weeks: 30 / 7         // un mese
};

/* Ogni quanto la scena rilegge lo stato del contatore, in millisecondi.
   Il contatore scansiona allo stesso ritmo: piu spesso non servirebbe. */
export const WORLD_POLL_MS = 5000;

/* ---- sequenza storica del cantiere ---- */
export const PHASES = [
  { k:'fyta',      b:'Pandroseion', y:'479',     n:'L ulivo di Atena',
    t:'Erodoto racconta che i Persiani bruciarono l ulivo sacro e che il giorno dopo il ceppo aveva gia rimesso un getto lungo un cubito. L Acropoli riparte da qui.' },
  { k:'mura',      b:'Mura di cinta', y:'465-460', n:'Il lato nord',
    t:'I rocchi del Partenone arcaico, squadrati e mai alzati, murati in fila nel lato nord. Non e riuso per risparmiare: si vedono dalla citta, ed e un memoriale.' },
  { k:'odos',      b:'Via Panatenaica', y:'c. 460', n:'Il basolato',
    t:'L unica strada del recinto. Passa a sud della Promachos, gira attorno al Partenone e finisce davanti all altare: nel tempio non entrava nessuno.' },
  { k:'promachos', b:'Acropoli',   y:'c. 456',  n:'Athena Promachos',
    t:'Bronzo alto nove metri fra i Propilei e il Partenone. La punta della lancia si vedeva dalle navi al largo del Capo Sunio.' },
  { k:'p-krepis',  b:'Partenone',  y:'447',     n:'Crepidoma',
    t:'Tre gradini. Lo stilobate non e piatto: si inarca di sei centimetri sulle fronti e di undici sui fianchi, per correggere l illusione ottica.' },
  { k:'p-perist',  b:'Partenone',  y:'447-442', n:'Peristasi',
    t:'46 colonne doriche, 8 sulle fronti e 17 sui fianchi. Ogni fusto e una pila di 11 rocchi con entasi.' },
  { k:'p-sekos',   b:'Partenone',  y:'444-440', n:'Sekos',
    t:'Il corpo chiuso: naos, opistodomo e i due portici esastili di pronao e retro.' },
  { k:'p-trab',    b:'Partenone',  y:'442-438', n:'Trabeazione',
    t:'Architrave, fregio dorico e geison. 92 metope scolpite alternate ai triglifi, dipinti di blu egizio.' },
  { k:'p-front',   b:'Partenone',  y:'438-432', n:'Frontoni',
    t:'A est la nascita di Atena, a ovest la contesa con Poseidone. Le figure passano da stanti al centro a distese negli angoli.' },
  { k:'p-athena',  b:'Partenone',  y:'438',     n:'Athena Parthenos',
    t:'Dodici metri di oro e avorio su anima lignea, opera di Fidia.' },
  { k:'bomos',     b:'Altare di Atena', y:'c. 440', n:'Ara e rampa',
    t:'Il vero centro del culto: qui finiva la processione e qui si sacrificavano le cento vacche dell ecatombe. Il tempio custodiva la statua, l altare riceveva il sangue.' },
  { k:'prop',      b:'Propilei',   y:'437-432', n:'Porta monumentale',
    t:'Mnesicle progetta quattro ali; la guerra del Peloponneso ne ferma due. L ala sud resta alle fondazioni e molti blocchi conservano le bugne di sollevamento.' },
  { k:'temene',    b:'Lato sud',   y:'430-425', n:'Brauronion e Calcoteca',
    t:'Due edifici che non sono templi: un recinto con portici per i doni ad Artemide, e il magazzino dove finivano i bronzi votivi quando non c era piu posto per esporli.' },
  { k:'nike',      b:'Atena Nike', y:'427-424', n:'Tempio sul bastione',
    t:'Anfiprostilo tetrastilo ionico, cinque metri per otto. Il piu piccolo edificio dell Acropoli.' },
  { k:'erech',     b:'Eretteo',    y:'421-406', n:'Santuario irregolare',
    t:'Tre livelli diversi per rispettare i culti preesistenti. La loggia sud poggia su sei cariatidi al posto delle colonne.' },
  { k:'anathemata', b:'Anathemata', y:'continuo', n:'Le offerte votive',
    t:'Chi vinceva una gara, una causa o una guerra lasciava un anathema, e non lo si poteva togliere perche apparteneva alla dea. Pausania, sei secoli dopo, prova a elencarle e si stanca prima di finire.' }
];

export const FOCUS = {
  fyta:'pandroseion', mura:'muranord', odos:'odos',
  bomos:'bomos', temene:'temene', anathemata:'anathemata',
  promachos:'promachos',
  'p-krepis':'parthenon', 'p-perist':'parthenon', 'p-sekos':'parthenon',
  'p-trab':'parthenon', 'p-front':'parthenon', 'p-athena':'parthenon',
  prop:'propylaea', nike:'nike', erech:'erechtheion'
};
