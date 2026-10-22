# TODO — Acropoli Tokenizer (TokenStone)

Aggiornato: 2026-10-22
Repo: https://github.com/Nickasti/tokenstone (pubblico)
Guida per chi prova: `docs/prova.md` · Piano a fasi e decisioni: `docs/piano.md` · Diario: `docs/conversazione.md`

## Fatto

- [x] Fase 1 — Il cantiere si calcola dal credito: registro dei mondi, pausa, ripresa, avanzo al mondo successivo (6 ottobre)
- [x] Fase 2 — Motore comune in `engine/` e mondi in `worlds/`, nomi in inglese, migrazione automatica delle installazioni vecchie (6 ottobre)
- [x] Fase 3 — Pagina iniziale TokenStone: contatore, schede dei mondi, primo avvio, dimostrazione da 90 secondi, app installabile, file di avvio a doppio clic (6 ottobre)
- [x] Fase 4 — Modello per i mondi nuovi: torre di prova, `npm run new-world`, guida in inglese e italiano, laboratorio nella pagina iniziale (7 ottobre)
- [x] Fase 5 — Rifiniture dell'Acropoli: terreno spianato sotto gli edifici, Eretteo rimesso in pianta, ornati dipinti, frontoni con le loro storie, fregio delle Panatenee (3326 pezzi in tutto), prestazioni adattive (15 ottobre)
- [x] Misura della settimana di Pro: 66 milioni di TE; il pannello dice *Mancano* invece di un credito negativo
- [x] Il piano di Claude (Pro, Max 5x, Max 20x) si sceglie al primo avvio e decide il valore della settimana
- [x] Pronti per chi prova: `docs/prova.md`, moduli di segnalazione su GitHub, `npm run diagnosi`, grafo del progetto senza percorsi personali
- [x] Prove automatiche verdi su Linux, Windows e macOS (GitHub Actions); corretti i due difetti trovati su Windows (ricarica automatica, scritture del registro)
- [x] Repository pubblico su GitHub (16 ottobre)

## Prossimi step

- [ ] Mandare agli amici il link alla guida: https://github.com/Nickasti/tokenstone/blob/main/docs/prova.md
- [ ] Raccogliere le segnalazioni (Issues con le etichette `problema` e `impressioni`, o messaggi) e correggerle; gli amici aggiornano con `git pull`
- [ ] Rimisurare la settimana con una lettura alta di `/usage`, per stringere i 66 milioni (oggi fra 65,0 e 67,2)

## Backlog

### Prima di sponsorizzarlo
- [ ] Licenza e attribuzioni alle fonti storiche (oggi il repository è pubblico ma senza licenza: si legge, non si riusa)
- [ ] README per GitHub: immagini della scena, scelta della lingua
- [ ] Nome definitivo; poi rinominare le variabili `ACROPOLI_*`, le chiavi del browser, la cartella del progetto e l'icona dell'app
- [ ] Decidere se usare l'email anonima di GitHub per i commit futuri (quelli fatti mostrano l'email personale)
- [ ] macOS nelle prove a ogni push, ora che sul repository pubblico i minuti sono gratuiti
- [ ] Prestazioni su un computer vero e debole (le segnalazioni degli amici aiuteranno)
- [ ] Routine settimanale del listino dei prezzi dei modelli

### Mondi
- [ ] Fase 6 — Piana di Giza: fonti (IV dinastia, intorno al 2560 a.C.), kit egizio (un pezzo è un corso di blocchi), sole a 30° nord, durata da decidere (proposta: tre mesi)
- [ ] Fase 7 — Foro Romano: epoca da scegliere, kit romano con archi, volte, laterizio, ordini

### Più avanti
- [ ] Sculture fotogrammetrate dal Museo dell'Acropoli (`setSculptureProvider()` è pronto)
- [ ] HDRI al posto del cielo analitico
- [ ] `npx tokenstone`: avviarlo senza clonarlo (serve spostare lo stato fuori dalla cartella)
- [ ] Rileggere i documenti nel grafo (`/graphify --update`)
- [ ] Da tenere d'occhio: il "Failed to fetch" mai riprodotto, probabilmente chiuso col passaggio a Node

## Bloccato

Nulla
