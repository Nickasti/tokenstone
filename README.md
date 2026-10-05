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

```bash
npm start
```

Apre <http://localhost:8000> nel browser. Le opzioni vanno dopo `--`:

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
aspettare i token - e non hanno senso per chi visita. Sono la stessa scena e
lo stesso stato: cambia solo cosa e in mano a chi guarda.

---

## Il contatore di token

Claude Code scrive da solo il transcript di ogni sessione in
`~/.claude/projects/<progetto>/<sessione>.jsonl`. Il contatore,
`tools/token-counter/counter.js`, legge quei file ogni cinque secondi, pesa
il consumo sui prezzi di listino e riscrive `world/world-state.json`. La
scena rilegge lo stato allo stesso ritmo e trasforma la crescita del totale
in credito.

### Cosa legge, e cosa no

Dai transcript prende soltanto quattro cose: i contatori di token in
`message.usage`, il nome del modello, l'orario della risposta e la cartella di
lavoro, che serve a sapere da quale progetto arriva una sessione. **Il testo
dei messaggi - le tue domande, le risposte, il codice - non viene mai letto
ne copiato.** Non va in rete: lo stato resta in `world/` sul tuo disco.

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
3. La scena accredita i TE cosi come sono, senza divisori: solo la differenza
   rispetto a quanto ha gia consegnato, che tiene in `localStorage`.

### Quanto costa un pezzo

I pezzi si pagano direttamente in TE. I numeri di `COST` in `config.js` non
sono prezzi ma **pesi relativi** (un rocchio 4, una metopa 18, la Parthenos
400). All'avvio `priceInTe()` ripartisce il budget del cantiere su quei pesi:

```
budget     = CANTIERE.weeklyTe * CANTIERE.weeks      (un mese = 30/7 settimane)
costo(p)   = peso(p) * budget / somma dei pesi
```

Cosi il totale torna esatto anche se si aggiungono pezzi, e le proporzioni fra
un rocchio e una statua restano quelle decise a mano.

`CANTIERE.weeklyTe` e il valore in TE del 100% della finestra settimanale.
Non e un dato pubblico e dipende dal piano, quindi va misurato. Leggi `/usage`
in Claude Code e annota la percentuale settimanale insieme al `total_te` di
`world/world-state.json`. Dopo qualche ora di lavoro rifai le due letture, poi:

```
weeklyTe = 100 * (TE2 - TE1) / (percentuale2 - percentuale1)
```

Piu e ampio l'intervallo, piu la misura e affidabile. Il valore attuale,
25 milioni, e una stima provvisoria: con quello un rocchio costa circa
17.600 TE, una metopa 79.000, la Parthenos 1,76 milioni, e una sessione
lunga (intorno al milione di TE) posa circa l'1% del cantiere.

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
gia posati e il credito gia consegnato restano - la scena non toglie niente -
ma il cantiere si ferma finche il consumo nuovo non recupera la differenza.
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
  `world/.world-state.bak`. Se lo stato risulta illeggibile, il contatore
  riparte da li e conserva `installed_at` e le sessioni. Se invece lo stato
  manca del tutto, lo tratta come un reset voluto: per ricominciare il
  cantiere da zero basta cancellare `world/world-state.json`.
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

```
index.html            markup, import map, interfaccia
src/config.js         misure reali, layout del sito, fasi storiche, raffinatezze, policromia
src/materials.js      marmo pentelico, policromia, bronzo, oro e avorio
src/sky.js            scattering Rayleigh + Mie, posizione solare, IBL da cubemap
src/terrain.js        heightfield del pianoro e mura di cinta
src/kit.js            libreria modulare: crepidoma, colonnati, trabeazioni, muri, frontoni
src/buildings.js      i cinque monumenti, assemblati dal kit
src/site.js           strada, muro nord, altare, santuari minori, votivi, alberi
src/pieces.js         registro dei pezzi, posa, fusione delle mesh
src/tokens.js         lettore di world-state.json, credito, fallback simulato
src/ui.js             pannelli, fasi, slider solare
src/main.js           scena, camera, loop
package.json          npm start, npm test; nessuna dipendenza
tools/server.js       server della scena, con il contatore dentro
tools/test/           test del server
tools/token-counter/  counter.js (scansione), check-pricing.js, pricing.json, test/
.claude/agents/       aggiorna-listino.md, il subagente che aggiorna i prezzi
CLAUDE.md             istruzioni per Claude Code quando lavora in questo progetto
world/                world-state.json, scritto dal contatore (non versionato)
docs/conversazione.md come è nato il progetto e perché le scelte sono queste
```

---

## Il pianoro

Gli edifici sono meta del recinto. L'altra meta e in `src/site.js`: la via
Panatenaica lastricata, i rocchi del Partenone arcaico murati nel lato nord,
l'altare di Atena Polias, il Brauronion e la Calcoteca sul lato sud, le offerte
votive e la piantumazione.

Una regola tiene insieme la cosa: **la roccia affiorante non si paga**, perche
c'era prima. Tutto il resto e stato portato su a spalla e costa token come ogni
altro blocco. Se aggiungi elementi al pianoro, tieni la stessa linea.

Quello che e sparso a caso - votivi, alberi, macchia, affioramenti - usa un
generatore con seme fisso. Non toccarlo alla leggera: lo stato salvato in
`localStorage` e un indice dentro l'elenco dei pezzi, e se l'elenco cambiasse
ordine quell'indice punterebbe a un altro pezzo.

---

## Raffinatezze ottiche e policromia

Due interruttori in `src/config.js` accendono il Partenone come era davvero.

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

`src/kit.js` espone `setSculptureProvider(fn)`. La funzione riceve
`(pose, altezza, contesto)` e restituisce un `Object3D` oppure `null`.
Se restituisce `null` si ricade sulla scultura procedurale.

In `src/main.js` c'è già il blocco commentato che carica i GLB da
`assets/models/` con `GLTFLoader` e registra il provider. Scarica i modelli
del Museo dell'Acropoli, mettili lì, togli i commenti.

### 2. HDRI al posto del cielo analitico

`src/sky.js` espone `useHDRI(url)`. Carica un `.hdr` con `RGBELoader`,
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
`FLUTE_SEGMENTS` in `config.js` e la dimensione della shadow map in `main.js`.
