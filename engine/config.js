/* Le impostazioni comuni a tutti i mondi.

   Quello che appartiene a un mondo - misure, fasi, sole, durata - sta nel suo
   world.json e nel suo codice. Qui resta solo quello che appartiene a chi
   lavora: quanto vale una settimana di Claude Code. */

/* ---- quanto vale una settimana ----

   Il contatore in tools/token-counter scrive in state/world-state.json un
   totale in "token equivalenti": i token davvero consumati, pesati sul prezzo
   di listino (l'output costa cinque volte l'input, la lettura di cache un
   decimo). I pezzi si pagano direttamente in TE, senza conversioni.

   Ogni mondo dichiara la sua durata in settimane di lavoro a pieno regime,
   cioe settimane in cui si esaurisce il 100% dell'utilizzo concesso da Claude
   Code. Il suo budget e WEEKLY_TE * settimane, ripartito sui pesi dei suoi
   pezzi: ogni pezzo costa peso * (budget / somma dei pesi), cosi il totale
   torna esatto anche se si aggiungono pezzi.

   WEEKLY_TE e quanti TE vale il 100% della finestra settimanale. Non e un
   dato pubblico e dipende dal piano, quindi si misura. Il modo piu preciso e
   una lettura sola, verso la fine della finestra: /usage da la percentuale e
   l'ora del reset, la finestra e cominciata sette giorni prima del reset, e
   il contatore sa quanti TE sono caduti da allora.
     WEEKLY_TE = TE nella finestra / percentuale * 100
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
   settimana si e usato anche claude.ai, che consuma la stessa quota, la
   percentuale comprende consumi che i transcript non vedono, e il valore
   esce piu basso del vero.

   Il contatore conta tutti i progetti, non solo questo, ed e giusto cosi:
   anche la percentuale di /usage li conta tutti, quindi le due misure sono
   coerenti. */
export const WEEKLY_TE = 31000000;   // 100% della settimana: limite inferiore, da rimisurare

/* Il dono con cui comincia ogni mondo, e il credito che regala il pulsante di
   ?dev: una quota del budget del mondo, non un numero fisso. Un numero fisso
   vale l'1% di un mondo grande e mezzo mondo di uno piccolo. All'Acropoli il
   dono da i primi pezzi: l'ulivo sacro e un po' di verde. */
export const GIFT_SHARE = 0.0125;
export const GRANT_SHARE = 0.04;

/* Ogni quanto la scena rilegge il registro, in millisecondi. Il contatore
   scansiona allo stesso ritmo: piu spesso non servirebbe. */
export const POLL_MS = 5000;
