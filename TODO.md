# TokenStone — cosa resta da fare

*TokenStone e un nome provvisorio, ma dalla fase 3 e il nome con cui il
progetto si presenta: pagina iniziale, app, file di avvio.*

L'idea: una piattaforma di mondi da costruire passo dopo passo coi token di
Claude Code. Chi la usa sceglie un mondo, lo costruisce in settimane o mesi di
lavoro, e quando l'ha finito - o quando vuole cambiare - ne comincia un altro.
L'Acropoli e il primo mondo; poi la piana di Giza e il Foro Romano, e piu
avanti anche mondi moderni o inventati.

---

## Fatto

*Gli ultimi passi; la storia completa e nel piano qui sotto e nel diario.*

- [x] Eretteo rimesso in pianta: era a specchio e quasi attaccato al
      Partenone. Ora sta 12 m piu a nord, col portico nord verso nord sul suo
      terrazzo piu basso (gradino di roccia di 3,2 m) e le Cariatidi verso il
      Partenone; l'ulivo sacro lo segue nel Pandroseion, a ovest
- [x] Prestazioni: qualita adattiva, ombre a rate, fotogrammi a riposo.
      La fase 5 e completa
- [x] Il fregio delle Panatenee sul Partenone: 46 pezzi nuovi, in fondo al
      cantiere; il mondo passa da 3280 a 3326 pezzi
- [x] Frontoni del Partenone con le loro storie, e le figure est di nuovo visibili
- [x] Ornati dipinti su cornici, capitelli, antefisse e acroteri; tetti pieni
- [x] Via Panatenaica: le lastre seguono la strada (prima, girate a specchio,
      facevano zig-zag sulle curve e lasciavano passare la sabbia)
- [x] Terreno spianato sotto il Partenone, l'Athena Promachos e l'altare:
      l'ondulazione del pianoro non copre piu i gradini
- [x] Il pannello dice *Mancano* invece di mostrare un credito negativo
- [x] Il grafo del progetto con graphify, collegato a `CLAUDE.md`
- [x] Misura settimanale: 66 milioni di TE

## Prossimi step

- [ ] Fase T, la prova con gli amici: prima il piano di ognuno, poi la guida
      e le segnalazioni, le prove sui tre sistemi, il repository privato
- [ ] Provare le prestazioni su un computer vero, debole (anche gli amici
      serviranno a questo)
- [ ] Rimisurare la settimana con una percentuale piu alta di `/usage`

## Bloccato

Nulla.

---

## Decisioni prese

*6 ottobre 2026*

- **Nomi in inglese** per cartelle, file e campi dei dati; commenti,
  interfaccia e documentazione in italiano.
- **Pausa.** Un mondo si puo mettere in pausa per cominciarne un altro, e
  riprendere quando si vuole. Il credito va solo al mondo attivo.
- **Avanzo.** Il credito che avanza quando un mondo e completato passa al
  mondo scelto dopo.
- **Durata.** Ogni mondo ha la sua, dichiarata in settimane di lavoro a pieno
  regime. `WEEKLY_TE`, in `engine/config.js`, resta uno solo: dipende dal
  piano di chi lavora, non dal mondo.
- **Prossimo mondo:** la piana di Giza, dopo aver rifinito l'Acropoli.
- **Nome provvisorio:** TokenStone.

*6 ottobre 2026, per la fase 3*

- **TokenStone ovunque:** pagina iniziale, app installata e file di avvio
  (`TokenStone.cmd` e simili). Se il nome definitivo cambiera, si rinomina.
- **Giza e il Foro compaiono gia**, come schede "in arrivo": nome, luogo,
  epoca, nessuna data.
- **Le immagini delle schede sono scatti della scena** completata, fatti da uno
  script in Chrome senza finestra; per i mondi in arrivo, una sagoma disegnata
  come l'icona dell'app.
- **Al primo avvio si sceglie il mondo.** Finche non si sceglie, i TE si
  accumulano in attesa e vanno tutti al mondo scelto. Il cantiere gia esistente
  resta com'e, con l'Acropoli attiva.
- *Predefinite, salvo obiezione:* visitare un mondo non lo rende attivo;
  cambiare mondo a meta chiede conferma; la dimostrazione dura circa 90
  secondi e non tocca il registro; in pagina si mostrano i TE, e i dollari solo
  in una nota.

---

## Il piano

### Fase 1 — Il cantiere si calcola dal credito *(fatta, 6 ottobre)*
- [x] Registro (oggi `state/registry.json`): mondo attivo, tratti di credito, e per
      ogni mondo pezzi, costo, dono iniziale e punto piu alto raggiunto
- [x] I blocchi posati si ricavano dal credito: stesso cantiere in ogni
      browser, niente piu avanzamento nel `localStorage`
- [x] Pausa e ripresa: cambiare mondo chiude un tratto e ne apre un altro
- [x] Avanzo: a mondo completato, il credito in piu passa al successivo
- [x] Il server accetta due scritture, solo dal computer locale, come JSON e
      dalla pagina della scena: "scegli mondo" e "riporta avanzamento"
- [x] Il credito regalato di `?dev` resta solo nel browser
- [x] Il cantiere attuale e diventato il primo tratto dell'Acropoli
- [x] Test: pausa, ripresa, avanzo, prezzi che scendono, scritture rifiutate;
      verificato in due profili di Chrome che vedono lo stesso cantiere

La scelta del mondo esiste nel registro ma non ancora nell'interfaccia: con un
mondo solo non c'e niente da scegliere. Arriva con la pagina iniziale.

### Fase 2 — Piu mondi nella struttura, niente di visibile *(fatta, 6 ottobre)*
- [x] L'Acropoli in `worlds/acropolis/`, il motore comune in `engine/`
- [x] `world.json` per ogni mondo: nome, luogo, epoca, durata, sole, stato,
      anteprima. La durata dell'Acropoli e uscita da `config.js`; la quota
      settimanale e passata al motore, in `engine/config.js`
- [x] Nomi di cartelle, file e campi in inglese (decisione del 6 ottobre);
      lo stato in `state/`, il registro in `state/registry.json`
- [x] Migrazione automatica delle installazioni vecchie, provata su una copia
      e poi sullo stato vero
- [x] Test della scena in Chrome senza finestra: `npm run test:scene`

Il kit greco (colonnati, trabeazioni, frontoni) resta nell'Acropoli: si
sposta nel motore, o in un kit comune, quando un secondo mondo ne ha bisogno.

### Fase 3 — La pagina iniziale *(fatta, 6 ottobre)*
- [x] TokenStone, contatore totale, una scheda per mondo: in costruzione, in
      pausa, da cominciare, compiuto, in arrivo
- [x] Scegliere, riprendere, visitare; conferma per cambiare mondo a meta;
      credito in attesa in vista
- [x] Primo avvio senza mondo attivo: si sceglie dalla pagina, i TE aspettano
- [x] `world.json` per Giza e il Foro, con stato "in arrivo"
- [x] Scatti della scena per le schede (`npm run previews`); sagome per i
      mondi in arrivo
- [x] Modalita dimostrativa: 90 secondi dalla prima pietra all'ultima, con la
      camera che segue il cantiere, senza toccare il registro (`?demo`)
- [x] TokenStone nell'app installata e nei file di avvio, che si aprono sulla
      pagina iniziale
- [x] Le schede aperte prima di un aggiornamento si ricaricano da sole; quelle
      scollegate lo dicono

Rimasti con il nome vecchio, da rinominare col nome definitivo: le variabili
d'ambiente `ACROPOLI_*`, le chiavi del browser, la cartella del progetto, e
l'icona dell'app, che e ancora il frontone dell'Acropoli.

### Fase 4 — Il modello per i mondi nuovi *(fatta, 7 ottobre)*
- [x] `worlds/_template/`, un mondo da copiare: la torre di prova, da una
      miniatura fantasy, 501 pezzi in sei fasi, commentata riga per riga
- [x] `npm run new-world -- <id> "Nome"`: copia il modello; per un mondo gia
      annunciato, come Giza, aggiunge pagina e codice e tiene il world.json
- [x] Guida: `docs/creare-un-mondo.md`
- [x] L'intestazione della scena viene da world.json (`data-world`)
- [x] Nel motore il generatore con seme (`engine/random.js`) e il dono
      iniziale come quota del mondo, non piu come numero fisso
- [x] La dimostrazione tiene i suoi 90 secondi anche su un computer lento
- [x] Modalita rapide per chi sviluppa: `?demo=10`, e *Tutto in 10 s* in `?dev`
- [x] Il laboratorio nella pagina iniziale: la torre di prova, `?dev` e la
      guida a portata di clic, invece che nascosti nell'indirizzo

### Fase 5 — Rifiniture dell'Acropoli *(fatta, 15 ottobre)*
- [x] Le lastre della via Panatenaica orientate lungo la strada, e la
      pendenza misurata sugli assi del pezzo gia girato (`layOnGround`)
- [x] Piani spianati sotto gli edifici (`PADS` in `src/config.js`)
- [x] L'Eretteo: pianta non piu a specchio, spostato a nord, portici girati
      verso l'esterno, terrazzo e gradino di roccia per il portico nord
- [x] Lista decisa il 15 ottobre: ornati dipinti, sculture dei frontoni,
      fregio del Partenone, prestazioni
- [x] Ornati dipinti: kymation e meandro sui geison e sulle cornici
      rampanti, ovoli su architravi e capitelli ionici, palmette di antefisse
      e acroteri (`src/ornaments.js`)
- [x] Le file di tegole pendevano al contrario: ora il tetto e pieno
- [x] Sculture dei frontoni leggibili: Atena e Poseidone con ulivo e tridente
      a ovest, Zeus in trono e Atena armata a est, i cavalli del Sole e
      della Luna negli angoli; le figure del frontone est erano nascoste
      dietro il timpano
- [x] Fregio delle Panatenee: 46 pezzi nuovi in fondo all'elenco, fase
      `p-zoforo` (`src/frieze.js`)
- [x] Prestazioni: qualita adattiva della risoluzione e delle ombre, ombre
      ridisegnate al massimo ogni 160 ms, un fotogramma su due a riposo

### Fase 6 — La piana di Giza
- [ ] Ricerca sulle fonti; IV dinastia, intorno al 2560 a.C.
- [ ] Kit egizio: un pezzo e un corso di blocchi
- [ ] Sole a 30° nord; durata da decidere

### Fase 7 — Il Foro Romano
- [ ] Epoca da scegliere; kit romano con archi, volte, laterizio, ordini

### Fase T — La prova con gli amici *(in pianificazione, 16 ottobre)*

Prima di pubblicare e sponsorizzare, il progetto lo provano alcuni amici.
Decisioni del 16 ottobre: ognuno sceglie il suo piano; il progetto arriva
da un repository GitHub privato, con gli amici invitati come collaboratori;
i sistemi degli amici non si sanno ancora, quindi si preparano tutti e tre.

1. **Il piano di ognuno.** I 66 milioni di TE sono il valore di Pro, misurato
   su un abbonamento Pro. Gli altri in proporzione, come li dichiara
   Anthropic: Max 5x 330 milioni, Max 20x 1,32 miliardi.
   - [ ] Il piano si sceglie al primo avvio, prima del primo mondo, e si
         cambia dalla pagina iniziale, con una conferma che spiega l'effetto
         sui prezzi
   - [ ] Il piano sta nello stato dell'installazione (non nel codice); il
         motore prende da li il valore della settimana
   - [ ] Prove: registro, server, scena
2. **Prima di consegnarlo.**
   - [ ] Pulire il grafo dal percorso di questo computer
   - [ ] `docs/prova.md`: come si installa su Windows, macOS e Linux, come
         si aggiorna, cosa provare, come segnalare
   - [ ] Modelli per le Issues: "qualcosa non funziona" e "impressioni"
   - [ ] `npm run diagnosi`: versioni e stato del contatore, senza percorsi
         ne dati personali, da incollare in una segnalazione
3. **Tre sistemi senza avere tre computer.**
   - [ ] Le prove automatiche su GitHub Actions per Windows, macOS e Linux, a
         ogni push: server, contatore e scena
4. **La consegna.**
   - [ ] Repository privato `tokenstone` sull'account GitHub, e il primo push
         (con conferma prima di farlo)
   - [ ] Gli inviti agli amici (li fai tu, da GitHub)
5. **La prova.**
   - [ ] Raccogliere le segnalazioni, correggere, rilasciare con `git pull`

---

## In parallelo

- [x] **Misura settimanale**: 66 milioni di TE, da due letture con solo Claude
      Code (12% e 19% della settimana dal 5 ottobre alle 19:05)
- [x] Il pannello dice *Mancano* invece di un credito negativo, quando i
      prezzi salgono e i blocchi posati costano piu del credito
- [x] La guida per creare un mondo in inglese, con la versione italiana sotto
- [x] Il grafo del progetto con graphify (`graphify-out/`), collegato a
      `CLAUDE.md` per spendere meno contesto
- [ ] Rileggere i documenti nel grafo (`/graphify --update`): README, TODO
      e diario sono cambiati dopo l'estrazione. Gemini gratuito ha un limite
      di 20 richieste al giorno; altrimenti li legge Claude
- [ ] Prima di pubblicare: nel grafo il nodo di `home/home.js` ha nel nome il
      percorso completo di questo computer; rigenerarlo o pulirlo
- [ ] Rimisurare la settimana con una percentuale piu alta, per stringere i
      66 milioni (oggi fra 65,0 e 67,2)
- [ ] Licenza e attribuzioni alle fonti storiche
- [ ] README per GitHub: immagini della scena, scelta della lingua
- [ ] Pubblicazione su GitHub
- [ ] Routine settimanale del listino, dopo la pubblicazione
- [ ] Da tenere d'occhio: il "Failed to fetch" mai riprodotto, probabilmente
      chiuso col passaggio a Node

## Decisioni aperte

- Il nome definitivo — entro la fase 3
- La lista delle rifiniture dell'Acropoli — entro la fase 5
- La durata di Giza — entro la fase 6 (proposta: tre mesi); Giza e il Foro
  sono rimandati a dopo la prova con gli amici
- L'epoca del Foro — entro la fase 7

## Piu avanti

- Sculture fotogrammetrate dal Museo dell'Acropoli (`setSculptureProvider()`
  e pronto); HDRI al posto del cielo analitico
- `npx tokenstone`: avviare il progetto senza clonarlo; richiede di spostare
  lo stato fuori dalla cartella
