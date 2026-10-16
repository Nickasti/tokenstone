# Provare TokenStone

Grazie per provarlo. TokenStone trasforma il lavoro che fai con Claude Code
in un cantiere: ogni risposta di Claude posa qualche blocco, e in circa un
mese di lavoro pieno l'Acropoli di Pericle è finita. Il progetto non è
ancora pubblico: questa guida spiega come installarlo, cosa provare e come
dire cosa non va.

## Cosa serve

- **Claude Code**, con un abbonamento Pro o Max, sullo stesso computer.
- **Node.js 18 o successivo**: [nodejs.org](https://nodejs.org), la versione
  LTS. Per controllare: `node -v` in un terminale.
- **git**, per scaricare il progetto e i suoi aggiornamenti:
  [git-scm.com](https://git-scm.com). Su macOS c'è già, o te lo propone il
  sistema la prima volta che lo usi.
- **Un browser** recente: Chrome, Edge, Firefox o Safari.
- **Un account GitHub**, per accettare l'invito al progetto, che è privato.

Non serve altro: il progetto non ha dipendenze, quindi niente `npm install`.

## Installarlo

1. Accetta l'invito a GitHub che ti è arrivato per email.
2. Apri un terminale nella cartella dove vuoi tenerlo e scarica il progetto:

   ```bash
   git clone https://github.com/Nickasti/tokenstone.git
   ```

   Se git ti chiede di accedere, usa il tuo account GitHub. Con la GitHub
   CLI installata va bene anche `gh repo clone Nickasti/tokenstone`.
3. Avvialo con un doppio clic sul file del tuo sistema, nella cartella
   `tokenstone`:

   | Sistema | File | Se non parte |
   |---|---|---|
   | Windows | `TokenStone.cmd` | Windows può avvisare che il file viene da internet: *Ulteriori informazioni*, *Esegui comunque* |
   | macOS | `TokenStone.command` | clic destro, *Apri*, poi *Apri* di nuovo; oppure nel Terminale: `./TokenStone.command` |
   | Linux | `tokenstone.sh` | nel terminale: `./tokenstone.sh` |

   Da qualunque sistema funziona anche `npm start`, nel terminale, dalla
   cartella del progetto.

Si apre una finestra con il server, e il browser va sulla pagina iniziale.
Per spegnere TokenStone basta chiudere quella finestra.

## Il primo avvio

1. **Il piano.** La pagina chiede quale piano di Claude usi: Pro, Max 5x o
   Max 20x. Serve a dare ai blocchi il prezzo giusto, così un mondo dura lo
   stesso numero di settimane per tutti. Lo trovi su claude.ai, in
   *Impostazioni*, *Abbonamento*. Si può cambiare dopo.
2. **Il mondo.** Scegli l'Acropoli e conferma. Da lì in poi ogni risposta di
   Claude Code, in qualunque progetto, la fa crescere.
3. **Lavora come sempre.** Non devi fare niente di diverso con Claude Code.
   TokenStone legge solo i contatori dei token che Claude Code salva sul tuo
   computer: mai il testo dei messaggi, e niente esce dal computer.

Il conto parte dal primo avvio: i token consumati prima non contano. Per
questo conviene avviarlo appena installato.

**Non serve tenerlo sempre acceso.** Quando lo riapri si rimette in pari da
solo con quello che hai fatto nel frattempo. Un limite: Claude Code cancella
i suoi transcript dopo un mese, quindi aprilo almeno una volta al mese.

## Aggiornarlo

Quando ti dico che c'è una versione nuova, con TokenStone chiuso:

```bash
cd tokenstone
git pull
```

e poi riaprilo. Il tuo cantiere non si perde: sta nella cartella `state`, che
gli aggiornamenti non toccano.

## Cosa provare

Non c'è un ordine obbligato, ma queste sono le cose che mi servono di più:

- [ ] **L'installazione**: si avvia al primo colpo? Dove ti sei bloccato?
- [ ] **Il primo avvio**: si capisce cosa fare, e perché?
- [ ] **Qualche giorno di lavoro normale con Claude Code**: il cantiere
      cresce? Il ritmo ti sembra giusto, troppo lento, troppo veloce?
- [ ] **La dimostrazione**: dalla scheda dell'Acropoli, *Guarda come si
      costruisce* mostra il cantiere intero in un minuto e mezzo.
- [ ] **Il laboratorio**, in fondo alla pagina iniziale: la torre di prova e
      la modalità sviluppo.
- [ ] **L'app**: con Chrome o Edge, l'icona *Installa* nella barra
      dell'indirizzo la mette nel menu Start o nel Dock.
- [ ] **La fluidità**: la scena gira bene sul tuo computer? Se scatta, dimmi
      che computer è.
- [ ] **La voglia**: ti è venuta voglia di tornarci a guardare? Cosa ti
      piacerebbe che ci fosse?

## Come segnalare

Dalla pagina del progetto su GitHub: *Issues*, *New issue*, e scegli fra
**Qualcosa non funziona** e **Impressioni**. Se scrivere una issue ti
scoccia, va benissimo anche un messaggio.

Per un problema, aiuta molto la **diagnosi**: nel terminale, dalla cartella
del progetto,

```bash
npm run diagnosi
```

e incolla quello che stampa. Dice le versioni di TokenStone, di Node, di
Claude Code e del sistema, e cosa sa il contatore. Non contiene niente di
personale - niente testo, niente nomi dei tuoi progetti, e la tua cartella
utente diventa `~` - ma rileggila pure prima di incollarla.

Uno screenshot vale sempre, soprattutto per i problemi grafici.

## Togliere TokenStone

Basta cancellare la cartella `tokenstone`. Non installa niente altrove, e
Claude Code non viene toccato.
