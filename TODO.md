# TokenStone — cosa resta da fare

*TokenStone e un nome provvisorio. Il progetto oggi si chiama ancora Acropoli:
il nome nuovo entra nella fase 3, con la pagina iniziale.*

L'idea: una piattaforma di mondi da costruire passo dopo passo coi token di
Claude Code. Chi la usa sceglie un mondo, lo costruisce in settimane o mesi di
lavoro, e quando l'ha finito - o quando vuole cambiare - ne comincia un altro.
L'Acropoli e il primo mondo; poi la piana di Giza e il Foro Romano, e piu
avanti anche mondi moderni o inventati.

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

### Fase 3 — La pagina iniziale
- [ ] Nome, contatore totale, una scheda per mondo: in corso, in pausa,
      compiuto, in arrivo
- [ ] Scegliere, riprendere, visitare; conferma per cambiare mondo a meta;
      credito in attesa in vista
- [ ] Modalita dimostrativa: la costruzione accelerata, senza credito, per
      chi apre il progetto senza Claude Code
- [ ] Il nome nuovo nell'app installata e nei file di avvio, che si aprono
      sulla pagina iniziale

### Fase 4 — Il modello per i mondi nuovi
- [ ] `mondi/_modello/`, un mondo minimo da copiare
- [ ] Guida: cosa deve fornire un mondo

### Fase 5 — Rifiniture dell'Acropoli
- [ ] Lista da fare insieme. Candidati: il fregio ionico del Partenone (manca),
      le sculture dei frontoni (segnaposti procedurali), gli ornati dipinti
      (campiture piene), le prestazioni su computer meno potenti

### Fase 6 — La piana di Giza
- [ ] Ricerca sulle fonti; IV dinastia, intorno al 2560 a.C.
- [ ] Kit egizio: un pezzo e un corso di blocchi
- [ ] Sole a 30° nord; durata da decidere

### Fase 7 — Il Foro Romano
- [ ] Epoca da scegliere; kit romano con archi, volte, laterizio, ordini

---

## In parallelo

- [ ] **Misura settimanale** *(in corso)*: finestra pulita dal 5 ottobre alle
      19:05, solo Claude Code. Quando `/usage` segna almeno il 10%, si fa il
      conto con `--since` e il limite inferiore di 31 milioni diventa una misura
- [ ] Licenza e attribuzioni alle fonti storiche
- [ ] README per GitHub: immagini della scena, scelta della lingua
- [ ] Pubblicazione su GitHub
- [ ] Routine settimanale del listino, dopo la pubblicazione
- [ ] Da tenere d'occhio: il "Failed to fetch" mai riprodotto, probabilmente
      chiuso col passaggio a Node

## Decisioni aperte

- Il nome definitivo — entro la fase 3
- La lista delle rifiniture dell'Acropoli — entro la fase 5
- La durata di Giza — entro la fase 6 (proposta: tre mesi)
- L'epoca del Foro — entro la fase 7

## Piu avanti

- Sculture fotogrammetrate dal Museo dell'Acropoli (`setSculptureProvider()`
  e pronto); HDRI al posto del cielo analitico
- `npx tokenstone`: avviare il progetto senza clonarlo; richiede di spostare
  lo stato fuori dalla cartella
