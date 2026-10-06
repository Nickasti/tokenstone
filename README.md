# Acropoli — cantiere procedurale

Ricostruzione interattiva del programma edilizio di Pericle sull'Acropoli di Atene.
Ogni blocco dei monumenti viene generato proceduralmente e posato spendendo i
token che consumi davvero lavorando con Claude Code.

Monumenti: Athena Promachos, Partenone, Propilei, Tempio di Atena Nike, Eretteo.
Piu il pianoro: via Panatenaica, muro nord coi rocchi reimpiegati, altare di
Atena Polias, Brauronion e Calcoteca, settantaquattro offerte votive e il verde.
3.280 pezzi indipendenti, ognuno con costo, marca da cantiere e fase storica.
Il cantiere completo costa un mese di lavoro a pieno regime: quattro
settimane e qualcosa in cui si esaurisce ogni volta il 100% dell'utilizzo
settimanale concesso da Claude Code.

---

## Avvio rapido

Serve [Node.js](https://nodejs.org) 18 o successivo, e Claude Code installato
sullo stesso computer. Nient'altro: il progetto non ha dipendenze, quindi non
c'e nemmeno un `npm install` da fare.

### Con un doppio clic

Nella cartella del progetto c'e un file di avvio per ogni sistema:

| Sistema | File | |
|---|---|---|
| Windows | `Acropoli.cmd` | |
| macOS | `Acropoli.command` | se il progetto e arrivato come ZIP, la prima volta: clic destro, *Apri* |
| Linux | `acropoli.sh` | se il file manager non lo esegue: `./acropoli.sh` da terminale |

Si apre una finestra col server e il browser va sulla scena. Per spegnere, si
chiude la finestra. Il doppio clic e sicuro anche quando il cantiere e gia
acceso: in quel caso apre solo la pagina.

**Il server non deve stare sempre acceso.** La memoria del cantiere sono i
transcript che Claude Code salva da se: quando il server parte, il contatore
li rilegge e si rimette in pari con tutto quello che hai fatto nel
frattempo. Il server serve per *guardare*. Un limite: Claude Code cancella da
solo i transcript piu vecchi di un mese, quindi chi non apre la scena per
piu di un mese perde le sessioni cancellate prima di essere contate.

### Come app

Con il cantiere acceso, Chrome ed Edge permettono di installare la scena come
app: l'icona *Installa* nella barra dell'indirizzo, oppure dal menu del
browser. L'Acropoli finisce nel menu Start o nel Dock con la sua icona e si
apre in una finestra sua. Su Safari per macOS: *File*, *Aggiungi al Dock*.
Firefox non installa pagine come app.

L'app ha bisogno del server come la pagina. Se la apri col cantiere spento,
invece dell'errore del browser trovi una pagina che spiega come accenderlo.

### Da terminale

```bash
npm start
```

Apre <http://localhost:8000> nel browser. Le opzioni vanno dopo `--`, e
valgono anche per i file di avvio:

```bash
npm start -- 8080              # un'altra porta
npm start -- --no-browser      # senza aprire la pagina
npm start -- --host 0.0.0.0    # visibile anche da altri dispositivi in rete
```

Senza npm funziona uguale: `node tools/server.js`.

Non c'e altro da fare. Il server fa girare dentro di se il contatore di
token, e da quel momento ogni risposta di Claude Code - in qualunque
progetto, dal terminale, dall'estensione o dall'app - aggiunge credito al
cantiere. Non si modifica nessuna configurazione e non si installa niente
fuori da questa cartella.

Il cantiere parte da zero: conta solo quello che consumi **dopo** il primo
avvio, non la tua storia precedente. Fino alla prima risposta la scena dice
che e in attesa.

Il server ascolta solo su questo computer. Lo stato dice quanto lavori e su
quali progetti, e non va esposto alla rete senza volerlo: `--host 0.0.0.0`
serve a guardare la scena dal telefono, sapendo che chiunque sulla stessa
rete puo vederla.

Aprire `index.html` direttamente da disco non funziona: il browser blocca i
moduli ES e la lettura del file di stato.

### Due modi di aprire la scena

`http://localhost:8000` e la scena come la vede chi guarda: **il cantiere si
posa da solo**, al ritmo con cui arrivano i token, e non c'e niente da
cliccare. Un blocco ogni mezzo secondo circa; se il credito arretrato e molto
- una settimana di lavoro, un cantiere appena riavviato - il ritmo accelera,
altrimenti smaltire la coda richiederebbe mezz'ora.

`http://localhost:8000/?dev` aggiunge i comandi da cantiere: posa singola,
cantiere continuo e il credito regalato della simulazione. Servono a chi
lavora al codice - vedere una fase precisa, provare una modifica senza
aspettare i token - e non hanno senso per chi visita. Il credito regalato
resta in quel browser e non arriva mai al registro: il cantiere vero non se
ne accorge. *Riparti*, in `?dev`, torna anche al credito vero.

---

## I mondi e il registro

L'Acropoli e il primo di piu mondi da costruire. Il contatore conosce un
numero solo, il totale dei TE consumati; il **registro**,
`state/registry.json`, lo divide fra i mondi.

- **Un mondo attivo alla volta.** Riceve i TE dal momento in cui lo si sceglie.
  Il registro ricorda questi intervalli del totale, i *tratti*.
- **Pausa.** Scegliere un altro mondo chiude il tratto di quello attivo: il
  mondo lasciato a meta tiene il suo credito e lo ritrova quando torna attivo.
- **Avanzo.** Quando un mondo e completato, il credito in piu passa al mondo
  scelto dopo. Finche non si sceglie, resta in attesa e non si perde.
- **Durata.** Ogni mondo dichiara le sue settimane di lavoro, e il suo costo
  totale ne discende (vedi *Quanto costa un pezzo*).

**I blocchi posati non si salvano: si calcolano.** Ogni mondo conosce il costo
dei suoi pezzi in ordine; dato il credito, quanti se ne pagano e un conto.
Cosi il cantiere e lo stesso in ogni browser e su ogni dispositivo, e niente
dell'avanzamento vive nel browser, che ricorda solo l'ora del sole. Il registro
tiene il punto piu alto raggiunto da ogni mondo, perche il cantiere non si
disfi se i prezzi cambiano, e quanto costa ogni mondo, perche a mondo
completato si sappia quanto avanza.

*Riparti* non cancella niente: il credito resta, e la scena rivede la
costruzione dall'inizio, accelerata finche non torna al punto raggiunto.

Il registro si legge e si scrive su `/api/registry`. Le scritture sono due -
"scegli mondo" e "riporta avanzamento" - e il server le accetta solo dal
computer locale, solo come JSON e solo dalla pagina della scena: un altro
sito aperto nel browser non puo cambiare il cantiere. Per ricominciare da
capo la divisione del credito basta cancellare `state/registry.json`: al
riavvio tutto il consumo torna all'Acropoli.

La pagina iniziale, per scegliere fra i mondi, arriva con la fase 3 di
`TODO.md`.

---

## Il contatore di token

Claude Code scrive da solo il transcript di ogni sessione in
`~/.claude/projects/<progetto>/<sessione>.jsonl`. Il contatore,
`tools/token-counter/counter.js`, legge quei file ogni cinque secondi, pesa
il consumo sui prezzi di listino e riscrive `state/world-state.json`. La
scena rilegge lo stato allo stesso ritmo e trasforma la crescita del totale
in credito.

### Cosa legge, e cosa no

Dai transcript prende soltanto quattro cose: i contatori di token in
`message.usage`, il nome del modello, l'orario della risposta e la cartella di
lavoro, che serve a sapere da quale progetto arriva una sessione. **Il testo
dei messaggi - le tue domande, le risposte, il codice - non viene mai letto
ne copiato.** Non va in rete: lo stato resta in `state/` sul tuo disco.

Legge solo mentre il server e acceso. Spegni il server e il contatore si
ferma con lui; cancella la cartella e non resta niente, perche niente e stato
installato altrove.

Se Claude Code tiene la sua cartella altrove (variabile `CLAUDE_CONFIG_DIR`),
il contatore la segue.

### Cosa conta

- **Tutti i progetti**, non solo questo: il cantiere e uno solo e i token di
  ogni sessione confluiscono qui. Il campo `project` di ogni sessione nello
  stato dice da dove arrivano.
- **Solo dal primo avvio in poi.** La prima scansione fissa `installed_at`, e
  le risposte precedenti restano fuori.
- **Solo su questo computer.** Le sessioni di Claude Code nel cloud e le chat
  su claude.ai non lasciano transcript in locale, quindi non costruiscono
  niente.

### Dai token al credito

1. Per ogni risposta il contatore legge i cinque contatori di `message.usage`
   (input, scrittura cache 5 min, scrittura cache 1 h, lettura cache, output)
   e li moltiplica per i prezzi del modello in `pricing.json`.
2. Il costo in dollari diventa **token equivalenti** con `te_per_usd`
   (200.000). Un TE e il costo di un token di input di Opus: l'output ne vale
   cinque, la lettura di cache un decimo.
3. Il registro divide il totale fra i mondi, e ogni mondo spende i suoi TE
   cosi come sono, senza divisori (vedi *I mondi e il registro*).

### Quanto costa un pezzo

I pezzi si pagano direttamente in TE. I numeri di `COST` nel `config.js` di ogni mondo non
sono prezzi ma **pesi relativi** (un rocchio 4, una metopa 18, la Parthenos
400). All'avvio `priceInTe()` ripartisce il budget del cantiere su quei pesi:

```
budget     = CANTIERE.weeklyTe * CANTIERE.weeks      (un mese = 30/7 settimane)
costo(p)   = peso(p) * budget / somma dei pesi
```

Cosi il totale torna esatto anche se si aggiungono pezzi, e le proporzioni fra
un rocchio e una statua restano quelle decise a mano.

`CANTIERE.weeklyTe` e il valore in TE del 100% della finestra settimanale.
Non e un dato pubblico e dipende dal piano, quindi va misurato, e basta una
lettura sola. Verso la fine della settimana lancia `/usage` in Claude Code e
annota due cose: la percentuale settimanale e l'ora del reset. La finestra e
cominciata sette giorni prima del reset, e il contatore sa dire quanto hai
consumato da allora, senza scrivere niente:

```bash
node tools/token-counter/counter.js --dry-run --since 2026-09-28T19:05
```

(l'ora senza fuso e quella locale). Poi:

```
weeklyTe = total_te / percentuale * 100
```

Piu alta e la percentuale, piu piccolo e l'errore: `/usage` arrotonda
all'intero, e al 12% quell'arrotondamento vale piu o meno il 4%. Il contatore
pero conosce solo Claude Code su questo computer: se nella stessa settimana
hai usato anche claude.ai, che consuma la stessa quota, il valore esce piu
basso del vero.

Il valore nel progetto, 31 milioni, viene da una prima misura del 5 ottobre
2026 (12%, 3.709.015 TE nella finestra) ed e un limite inferiore: quella
settimana si era usato anche claude.ai. Va rimisurato su una settimana di
solo Claude Code, e comunque vale per il piano di chi l'ha misurato. Con
quel valore un rocchio costa circa 21.800 TE, una metopa 98.000, l'ulivo
sacro 655.000, la Parthenos 2,18 milioni, e un milione di TE posa lo 0,75%
del cantiere.

La finestra breve di cinque ore di `/usage` non serve allo scopo: misura un
altro limite, e il rapporto con quello settimanale non e pubblico.

### I prezzi dei modelli

`pricing.json` contiene il listino per milione di token di ogni modello. Il
contatore lo rilegge a ogni giro, quindi una correzione vale subito, senza
riavviare.

Un modello si riconosce per nome esatto, o per nome con una data in coda
(`claude-sonnet-5-20260101` e `claude-sonnet-5`). Una versione nuova che nel
listino non c'e - per esempio `claude-opus-5-5` quando esiste solo
`claude-opus-5` - viene prezzata con la voce piu vicina, ma finisce in
`unknown_models` nello stato, e `model_fallbacks` dice quale prezzo ha preso
in prestito. E il segnale che il listino va aggiornato, e la scena lo mostra
sotto il credito: "prezzo stimato per ...".

Ogni modello ha le cinque voci in dollari per milione di token e, se la
pagina ufficiale lo prevede, `fast_multiplier`: quanto costa in piu la
modalita veloce (`/fast` in Claude Code), che il transcript registra in
`usage.speed`. Una risposta veloce di un modello senza moltiplicatore viene
contata a prezzo normale - cioe troppo poco - e segnalata come
`nome-modello (fast)`. I messaggi `<synthetic>`, che Claude Code scrive da se
senza nessun modello dietro, non contano.

Il contatore non distingue due maggiorazioni che la pagina prevede e che oggi
non toccano chi usa Claude Code da un abbonamento: l'elaborazione vincolata
agli Stati Uniti (`inference_geo: "us"`, ×1,1) e le ricerche web lato server
($10 ogni 1.000). Nei transcript compaiono come `not_available` e zero.

### Aggiornare il listino

I modelli escono spesso, e il listino non si aggiorna a mano. Il progetto ha
un subagente di Claude Code, `.claude/agents/aggiorna-listino.md`: aprendo
Claude Code in questa cartella basta chiedere di aggiornare il listino.

L'agente lavora in due tempi. Prima **propone**: legge la pagina ufficiale dei
prezzi di Anthropic - solo quella - e scrive un listino candidato,
`tools/token-counter/pricing.candidate.json`. Lo controlla e ne misura
l'effetto sul cantiere senza scrivere niente:

```bash
node tools/token-counter/check-pricing.js tools/token-counter/pricing.candidate.json
node tools/token-counter/counter.js --dry-run --pricing tools/token-counter/pricing.candidate.json
```

e riporta cosa cambia, modello per modello, e quanto cambia il totale. Poi
**applica**, ma solo se glielo dici: sostituisce `pricing.json`, lancia
`npm test` e, se qualcosa non torna, rimette il listino di prima.

Le regole che segue sono scritte nel file dell'agente, e le principali sono
due. Non inventa: una voce che la pagina non riporta resta fuori, e il modello
resta fra gli stimati. E non ricava un prezzo da una proporzione, perche le
proporzioni cambiano: la lettura di cache vale un decimo dell'input su
Claude Opus 5, un ventesimo su Claude Opus 5.5.

`CLAUDE.md` chiede a Claude Code di controllare `unknown_models` quando
inizia a lavorare qui, e di proporre l'agente se serve.

**Quando un prezzo scende**, il totale ricalcolato scende con lui. I blocchi
gia posati restano - il registro ricorda il punto piu alto raggiunto - ma il
cantiere si ferma finche il consumo nuovo non recupera la differenza.
Le sessioni archiviate non si ricalcolano: il loro transcript non c'e piu, e
tengono il prezzo con cui erano state contate.

### Le scelte che proteggono il conto

- **Ricalcolo, mai somma.** Ogni scansione ricostruisce i totali dai
  transcript. Due scansioni sullo stesso disco danno lo stesso numero, e lo
  stato si riscrive solo quando qualcosa cambia davvero.
- **Un messaggio, una volta sola.** Lo streaming riscrive lo stesso
  `message.id` piu volte: vale l'occorrenza con l'output piu alto. E se lo
  stesso messaggio compare in due file - una sessione ripresa che ricopia la
  conversazione precedente - conta una volta, nella sessione dove e apparso
  per primo.
- **Subagenti** - nella cartella della sessione o in file affiancati -
  finiscono sotto la sessione madre.
- **Le sessioni cancellate restano.** Claude Code elimina da solo i transcript
  vecchi. Una sessione sparita dal disco resta nello stato, segnata
  `archived`: il consumo c'e stato, e il cantiere non perde i blocchi pagati.
- **Solo la coda.** I transcript crescono in fondo, e a ogni giro si legge
  soltanto quello che e stato aggiunto. Una riga ancora a meta scrittura si
  aspetta al giro dopo.
- **Copia di riserva.** Ogni scrittura riuscita aggiorna anche
  `state/.world-state.bak`. Se lo stato risulta illeggibile, il contatore
  riparte da li e conserva `installed_at` e le sessioni. Se invece lo stato
  manca del tutto, lo tratta come un reset voluto: per ricominciare il
  cantiere da zero basta cancellare `state/world-state.json`.
- **Scrittura atomica e lock.** Lo stato si scrive in un file temporaneo
  rinominato alla fine, e una cartella `.world-state.lock` evita che due
  scansioni si sovrappongano: la scena non legge mai un file a meta.
- **Un processo solo.** Il contatore gira dentro il server, non accanto: si
  accende e si spegne con lui, e non possono restare processi orfani a
  leggere file.

Stato e log (`tools/token-counter/counter.log`) sono locali per definizione e
stanno nel `.gitignore`.

### Comandi utili

```bash
npm test                                           # listino e tutti i test
npm run test:scene                                 # la scena in Chrome senza finestra (si salta senza Chrome)
node tools/token-counter/counter.js --print        # una scansione e il riepilogo
node tools/token-counter/counter.js --watch        # scansione continua, senza server
```

I test costruiscono una finta cartella di transcript in una cartella
temporanea e usano un listino loro, `test/pricing-test.json`: non toccano
ne lo stato vero ne i tuoi transcript, e non si rompono quando cambiano i
prezzi veri. Quelli del server lo avviano su una porta libera e controllano
anche che non si possa uscire dalla cartella del progetto, ne leggere i file
nascosti. Il contatore accetta `ACROPOLI_STATE`, `ACROPOLI_LOG`,
`ACROPOLI_PRICING` e `ACROPOLI_TRANSCRIPTS` per lavorare altrove.

### Se avevi installato l'hook

Le versioni precedenti funzionavano con un hook `Stop` in
`~/.claude/settings.json`. Non serve piu: toglilo. Se resta, non fa danni -
lanciato senza argomenti il contatore fa una scansione e basta - ma lavora
a vuoto a ogni risposta.

Le versioni ancora precedenti avevano un server in Python e un'API FastAPI
che stimava il consumo da letture manuali di `/usage`. Sono state tolte: la
loro storia e in `docs/conversazione.md`.

---

## Struttura

Il progetto e una piattaforma di mondi: il **motore** e comune, ogni **mondo**
porta solo quello che lo rende se stesso. I nomi di cartelle, file e campi
sono in inglese; commenti, interfaccia e documentazione in italiano.

```
index.html            porta al mondo (la pagina iniziale arriva con la fase 3)
engine/               il motore, uguale per tutti i mondi
  scene.js            scena, cielo, luce, camera, credito, posa: startWorld(mondo)
  pieces.js           registro dei pezzi, prezzi, posa, fusione delle mesh
  credit.js           il credito del mondo, letto dal registro
  sky.js              scattering Rayleigh + Mie, posizione solare, IBL da cubemap
  ui.js               pannello del cantiere, fasi, sole
  config.js           quanto vale una settimana (WEEKLY_TE), dono iniziale
  scene.css           lo stile della scena
worlds/acropolis/     il primo mondo
  world.json          nome, luogo, epoca, durata, sole: quello che il motore legge
  index.html          la pagina del mondo
  src/main.js         l'Acropoli come mondo: cosa costruire, inquadratura, fasi
  src/config.js       misure reali, layout del sito, fasi storiche, pesi dei pezzi
  src/buildings.js    i cinque monumenti, assemblati dal kit
  src/site.js         strada, muro nord, altare, santuari minori, votivi, alberi
  src/kit.js          kit greco: crepidoma, colonnati, trabeazioni, muri, frontoni
  src/terrain.js      heightfield del pianoro e mura di cinta
  src/materials.js    marmo pentelico, policromia, bronzo, oro e avorio
package.json          npm start, npm test, npm run test:scene; nessuna dipendenza
Acropoli.cmd          avvio a doppio clic: Windows; Acropoli.command per macOS, acropoli.sh per Linux
manifest.webmanifest  per installare la scena come app
sw.js, offline.html   la pagina che l'app mostra quando il server e spento
assets/icons/         icone dell'app, generate da tools/make-icons.js
tools/server.js       il server, con il contatore dentro e il registro su /api/registry
tools/registry.js     il registro dei cantieri: mondo attivo, tratti di credito, avanzi
tools/migrate.js      porta lo stato di un'installazione vecchia da world/ a state/
tools/test/           test del registro, del server e della scena
tools/token-counter/  counter.js (scansione), check-pricing.js, pricing.json, test/
state/                world-state.json del contatore e registry.json (non versionati)
.claude/agents/       aggiorna-listino.md, il subagente che aggiorna i prezzi
CLAUDE.md             istruzioni per Claude Code quando lavora in questo progetto
TODO.md               il piano a fasi e le decisioni prese
docs/conversazione.md come è nato il progetto e perché le scelte sono queste
```

---

## Il pianoro

Gli edifici sono meta del recinto. L'altra meta e in
`worlds/acropolis/src/site.js`: la via
Panatenaica lastricata, i rocchi del Partenone arcaico murati nel lato nord,
l'altare di Atena Polias, il Brauronion e la Calcoteca sul lato sud, le offerte
votive e la piantumazione.

Una regola tiene insieme la cosa: **la roccia affiorante non si paga**, perche
c'era prima. Tutto il resto e stato portato su a spalla e costa token come ogni
altro blocco. Se aggiungi elementi al pianoro, tieni la stessa linea.

Quello che e sparso a caso - votivi, alberi, macchia, affioramenti - usa un
generatore con seme fisso. Non toccarlo alla leggera: il cantiere si calcola
come "i primi N pezzi dell'elenco", e il registro ricorda N. Se l'elenco
cambiasse ordine, quei primi N sarebbero altri pezzi.

---

## Raffinatezze ottiche e policromia

Due interruttori in `worlds/acropolis/src/config.js` accendono il Partenone come era davvero.

`REFINEMENTS.on` toglie ogni linea retta dall'edificio: stilobate inarcato
(6 cm sulle fronti, 11 sui fianchi, 17 al centro), colonne inclinate verso
l'interno di 1:171, colonne d'angolo ingrossate del 2,1%, intercolumni
d'angolo contratti. Spegnilo per vedere lo stesso tempio senza correzioni:
e il confronto che spiega perche i Greci si sono presi il disturbo.

`POLYCHROMY.on` estende il colore oltre triglifi e taenia: metope su fondo
rosso e arretrate, timpani su fondo blu, soffitti del geison dipinti, anuli
dei capitelli in minio. Il fregio dell'Eretteo resta a parte, in calcare
grigio di Eleusi, perche non era dipinto ma intarsiato.

Le due opzioni non cambiano il numero dei pezzi ne il costo, tranne la
crepidoma del Partenone, che con la curvatura passa da 36 a 108 blocchi
perche un blocco largo quanto il tempio non puo inarcarsi.

---

## I due innesti da completare

### 1. Sculture fotogrammetrate

`worlds/acropolis/src/kit.js` espone `setSculptureProvider(fn)`. La funzione riceve
`(pose, altezza, contesto)` e restituisce un `Object3D` oppure `null`.
Se restituisce `null` si ricade sulla scultura procedurale.

In `worlds/acropolis/src/main.js` c'è già il blocco commentato che carica i GLB da
`assets/models/` con `GLTFLoader` e registra il provider. Scarica i modelli
del Museo dell'Acropoli, mettili lì, togli i commenti.

### 2. HDRI al posto del cielo analitico

`engine/sky.js` espone `useHDRI(url)`. Carica un `.hdr` con `RGBELoader`,
lo passa al `PMREMGenerator` e sostituisce l'ambiente.

Nota: il cielo analitico ha un vantaggio che l'HDRI non ha — l'ora del giorno
è un parametro continuo, e la posizione del sole viene dalle equazioni solari
reali per la latitudine di Atene. Valuta se ti serve davvero rinunciarci.

---

## Prestazioni

A cantiere completo la scena ha circa 2.500 mesh. Quando una fase si chiude,
`bakePhase()` fonde le sue mesh in una geometria per materiale: le draw call
scendono da qualche migliaio a poche decine. La mappa delle ombre si ricalcola
solo quando un pezzo si posa, mai a ogni frame.

Se il frame rate cala su macchine deboli, i parametri da toccare sono
`FLUTE_SEGMENTS` in `worlds/acropolis/src/config.js` e la dimensione della
shadow map in `engine/scene.js`.
