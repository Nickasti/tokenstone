# Creare un mondo

Questa guida porta da zero a un mondo che si sceglie dalla pagina iniziale e
si costruisce coi token. Il modello da cui partire e `worlds/_template/`: una
torre a gradoni su una piazza lastricata, con qualche albero. Funziona gia, e
ogni sua parte e commentata.

## Com'e fatto un mondo

Un mondo vive in `worlds/<id>/`, e porta solo quello che lo rende se stesso.
Cielo, luce, camera, credito, posa dei blocchi e pannello del cantiere sono del
motore, in `engine/`, uguali per tutti.

```
worlds/<id>/
  world.json      i dati: nome, luogo, epoca, durata, sole, stato
  index.html      la pagina: e quella del modello, i testi li prende da world.json
  src/main.js     costruisce i pezzi e li passa al motore
  preview.webp    l'immagine della scheda nella pagina iniziale
```

L'`id` e il nome della cartella e il nome con cui il registro conosce il
mondo: lettere minuscole, cifre e trattini, e non cambia piu dopo la
pubblicazione.

## 1. Comincia dal modello

```bash
npm run new-world -- babilonia "Babilonia"
```

Copia il modello in `worlds/babilonia/`, con un `world.json` segnato *in
arrivo*: la pagina iniziale mostra la scheda, ma non lascia ancora scegliere il
mondo. Se il mondo era gia stato annunciato e ha il suo `world.json` - come la
piana di Giza - il generatore lo lascia com'e e aggiunge solo pagina e codice.

## 2. world.json

| Campo | Cosa |
|---|---|
| `id` | lo stesso nome della cartella |
| `order` | la posizione nella pagina iniziale |
| `name`, `subtitle` | il titolo e la riga sotto |
| `place`, `era` | dove e quando: compaiono nella scheda e nell'intestazione della scena |
| `description` | due righe per la scheda |
| `status` | `coming` finche non e pronto, poi `available` |
| `weeks` | quanto dura il mondo, in settimane di lavoro a pieno regime |
| `solar` | latitudine e longitudine in gradi, fuso orario, giorno dell'anno: il sole e calcolato da qui |
| `preview` | il file dell'immagine della scheda, `preview.webp` o `preview.svg` |

`weeks` decide il prezzo di tutto: il budget del mondo e la quota settimanale
(`WEEKLY_TE`, in `engine/config.js`) per le settimane. L'Acropoli dura un mese,
`4.2857`; un mondo grande puo valere tre mesi.

## 3. Il codice: src/main.js

Il file fa due cose: costruisce i pezzi, e chiama `startWorld` del motore.

### I pezzi

```js
addPiece(fase, oggetto, peso, marca, descrizione, caduta)
```

- **fase**: la chiave della fase a cui appartiene, da `phases`.
- **oggetto**: un `Object3D` di three.js, gia nella sua posizione finale.
- **peso**: quanto vale rispetto agli altri pezzi. Non e un prezzo: il motore
  ripartisce il budget del mondo sui pesi. Una metopa che vale 18 costa
  quattro volte e mezzo un rocchio che vale 4.
- **marca**: l'identificativo che si legge nel pannello. `mark('ROCCHIO')` lo
  numera da se: `ROCCHIO-01`, `ROCCHIO-02`...
- **descrizione**: una riga per il pannello.
- **caduta**: da quanti metri scende il blocco quando si posa.

**L'ordine delle chiamate e l'ordine di posa**, e quindi la cronologia del
cantiere. Il registro ricorda quanti pezzi sono stati posati, cioe "i primi N
dell'elenco": **dopo la pubblicazione l'ordine non si cambia**, altrimenti N
indicherebbe altri pezzi. Pezzi nuovi si aggiungono in fondo.

Quello che c'era prima del cantiere - il terreno, la roccia - non e un pezzo:
si aggiunge alla scena direttamente e non costa niente.

**Mai `Math.random`.** Quello che si sparge a caso deve cadere nello stesso
punto a ogni caricamento. Il motore ha un generatore con un seme:

```js
import { seeded } from '/engine/random.js';
const rnd = seeded(4790);   // a ogni caricamento, la stessa sequenza
```

### startWorld

```js
startWorld({ meta, build, phases, completion, view, sun, fog, hour, snapshot, focus });
```

| Parametro | Cosa |
|---|---|
| `meta` | il `world.json`, letto all'inizio del file |
| `build(scene)` | costruisce terreno e pezzi |
| `phases` | le fasi: `{ k, b, y, n, t }` - chiave, edificio, anno, nome, testo |
| `completion` | `{ mark, text }`: cosa si legge a cantiere compiuto |
| `view` | `{ az, pol, dist, target }`: angolo orizzontale e dal verticale, distanza, punto guardato |
| `sun` | `{ center, shadow }`: dove guarda il sole, e quanti metri copre l'ombra attorno |
| `fog` | il colore della foschia |
| `hour` | l'ora del giorno all'apertura |
| `snapshot` | `{ hour, view }`: ora e inquadratura dell'immagine della scheda |
| `focus(fase)` | `{ x, z, dist }`: dove vola la camera per quella fase; la usa anche la dimostrazione |

Le misure sono in metri, con l'asse `y` verso l'alto. L'Acropoli usa `+x` a
est e `-z` a nord: conviene fare lo stesso, perche il sole e calcolato cosi.

Il kit dell'architettura greca - colonnati, trabeazioni, frontoni - sta per ora
nell'Acropoli, in `worlds/acropolis/src/kit.js`. Quando un secondo mondo ne ha
bisogno, si sposta in un posto comune invece di copiarlo.

## 4. Guardalo

```bash
npm start
```

poi, nel browser:

- `/worlds/<id>/?demo` - il mondo intero in 90 secondi, con la camera che
  segue il cantiere. E il modo piu rapido di controllare ordine e fasi.
- `/worlds/<id>/?dev` - i comandi da cantiere: posa singola e credito regalato,
  per fermarsi su una fase precisa. Non tocca il registro.
- `/worlds/<id>/?snapshot` - il mondo completo, fermo e senza pannelli: e
  l'inquadratura dell'immagine della scheda.

Le pagine si ricaricano da sole quando cambi un file: il server dichiara la
versione dei file, e le schede aperte se ne accorgono.

## 5. L'immagine della scheda

Quando `snapshot` inquadra bene il mondo:

```bash
npm run previews -- <id>
```

apre il mondo in Chrome senza finestra e salva `worlds/<id>/preview.webp`.
Per un mondo annunciato ma non ancora costruito, al suo posto una sagoma
disegnata: `preview.svg`, come quelle di Giza e del Foro.

## 6. Pubblicalo

1. In `world.json`, `"status": "available"`.
2. `npm test` e `npm run test:scene`.
3. Un commit.

Da li il mondo si sceglie dalla pagina iniziale. E da li l'ordine dei pezzi
non si tocca piu.
