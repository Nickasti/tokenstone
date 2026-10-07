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
   Claude Code, quindi 31 milioni. Era un limite inferiore: in quella
   settimana si era usato anche claude.ai, che i transcript non vedono.

   Seconda misura, sulla finestra dal 5 ottobre alle 19:05, con solo Claude
   Code. Due letture nella stessa finestra, il 7 ottobre, ognuna col totale
   da inizio finestra: alle 12:45 12% con 7.729.500 TE, cioe 64,4 milioni;
   alle 16:45 19% con 12.681.526 TE, cioe 66,7 milioni. /usage arrotonda
   all'intero, quindi le due letture dicono 61,8-67,2 e 65,0-68,5 milioni:
   tutte e due sono vere solo fra 65,0 e 67,2. Il valore e il centro, 66
   milioni. Torna anche la differenza fra le due: 4.952.026 TE per il 7%
   in piu, 70,7 milioni, ma con un arrotondamento del 6-8% che la rende
   poco precisa (62-83 milioni). Vale per il piano di chi l'ha misurato: con un altro piano va
   rimisurato.

   Per orientarsi: la finestra breve di cinque ore, il 5 ottobre, e
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
export const WEEKLY_TE = 66000000;   // 100% della settimana, misurato il 7 ottobre 2026

/* Il dono con cui comincia ogni mondo, e il credito che regala il pulsante di
   ?dev: una quota del budget del mondo, non un numero fisso. Un numero fisso
   vale l'1% di un mondo grande e mezzo mondo di uno piccolo. All'Acropoli il
   dono da i primi pezzi: l'ulivo sacro e un po' di verde. */
export const GIFT_SHARE = 0.0125;
export const GRANT_SHARE = 0.04;

/* Ogni quanto la scena rilegge il registro, in millisecondi. Il contatore
   scansiona allo stesso ritmo: piu spesso non servirebbe. */
export const POLL_MS = 5000;
