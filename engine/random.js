/* Il caso, ma sempre lo stesso.

   Quello che un mondo sparge "a caso" - alberi, rocce, offerte votive - deve
   cadere nello stesso punto a ogni caricamento: il cantiere e "i primi N
   pezzi dell'elenco", e se l'elenco cambiasse a ogni ricarica, N indicherebbe
   altri pezzi. Math.random non va bene: serve un generatore con un seme.

     const rnd = seeded(4790);
     rnd();   // un numero fra 0 e 1, lo stesso a ogni caricamento

   E mulberry32, lo stesso che l'Acropoli usa fin dall'inizio: cambiarlo
   sposterebbe ogni albero e ogni offerta del pianoro. */
export function seeded(s) {
  return function () {
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
