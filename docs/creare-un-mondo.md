# Creating a world

*Italian version below — versione italiana più sotto.*

This guide takes you from nothing to a world that can be chosen from the home
page and built with tokens. The starting point is the template,
`worlds/_template/`: a stone tower from a fantasy miniature, with a base, a
round body, two balconies, a turret and a shingled roof. It already works,
every part of it is commented, and it shows the cases you almost always need:
straight and round walls, openings, arches made of voussoirs, pieces inside a
group, a roof laid in courses.

## How a world is made

A world lives in `worlds/<id>/` and carries only what makes it itself. Sky,
light, camera, credit, block placement and the building-site panel belong to
the engine, in `engine/`, and are the same for every world.

```
worlds/<id>/
  world.json      the data: name, place, era, duration, sun, status
  index.html      the page: the template's own, it takes its texts from world.json
  src/main.js     builds the pieces and hands them to the engine
  preview.webp    the picture on the world's card in the home page
```

The `id` is the folder name and the name the registry knows the world by:
lowercase letters, digits and hyphens. It never changes after publication.

## 1. Start from the template

```bash
npm run new-world -- babylon "Babylon"
```

This copies the template into `worlds/babylon/`, with a `world.json` marked
*coming*: the home page shows the card but doesn't let anyone choose the world
yet. If the world had already been announced and has its own `world.json` -
like the Giza plateau - the generator leaves it as it is and only adds the
page and the code.

## 2. world.json

| Field | What |
|---|---|
| `id` | the same as the folder name |
| `order` | its position in the home page |
| `name`, `subtitle` | the title and the line below it |
| `place`, `era` | where and when: shown on the card and in the scene header |
| `description` | two lines for the card |
| `status` | `coming` until it's ready, then `available` |
| `weeks` | how long the world lasts, in weeks of full-time work |
| `solar` | latitude and longitude in degrees, time zone, day of the year: the sun is computed from these |
| `preview` | the card's picture file, `preview.webp` or `preview.svg` |

`weeks` sets the price of everything: the world's budget is the weekly quota
(`WEEKLY_TE`, in `engine/config.js`) times the weeks. The Acropolis lasts a
month, `4.2857`; a large world can be worth three months.

## 3. The code: src/main.js

The file does two things: it builds the pieces, and it calls the engine's
`startWorld`.

### The pieces

```js
addPiece(phase, object, weight, mark, description, drop)
```

- **phase**: the key of the phase it belongs to, from `phases`.
- **object**: a three.js `Object3D`, already in its final position.
- **weight**: how much it's worth compared to the other pieces. It isn't a
  price: the engine shares the world's budget out over the weights. A metope
  worth 18 costs four and a half times a column drum worth 4.
- **mark**: the identifier shown in the panel. `mark('DRUM')` numbers it by
  itself: `DRUM-01`, `DRUM-02`...
- **description**: one line for the panel.
- **drop**: how many metres the block falls when it's placed.

**The order of the calls is the order of placement**, and so the chronology of
the building site. The registry remembers how many pieces have been placed,
that is "the first N of the list": **after publication the order must not
change**, or N would point at other pieces. New pieces go at the end.

Whatever was there before the building site - the terrain, the rock - isn't a
piece: it's added to the scene directly and costs nothing.

**Never `Math.random`.** Anything scattered at random must land in the same
spot on every load. The engine has a seeded generator:

```js
import { seeded } from '/engine/random.js';
const rnd = seeded(4790);   // the same sequence on every load
```

### startWorld

```js
startWorld({ meta, build, phases, completion, view, sun, fog, hour, snapshot, focus });
```

| Parameter | What |
|---|---|
| `meta` | the `world.json`, read at the top of the file |
| `build(scene)` | builds the terrain and the pieces |
| `phases` | the phases: `{ k, b, y, n, t }` - key, building, year, name, text |
| `completion` | `{ mark, text }`: what the panel says when the site is finished |
| `view` | `{ az, pol, dist, target }`: horizontal angle, angle from the vertical, distance, point looked at |
| `sun` | `{ center, shadow }`: where the sun points, and how many metres the shadow covers around it |
| `fog` | the colour of the haze |
| `hour` | the time of day when the page opens |
| `snapshot` | `{ hour, view }`: time and framing of the card's picture |
| `focus(phase)` | `{ x, z, dist }`: where the camera flies for that phase; the demo uses it too |

Measures are in metres, with the `y` axis pointing up. The Acropolis uses `+x`
for east and `-z` for north: do the same, because that's how the sun is
computed.

The Greek architecture kit - colonnades, entablatures, pediments - lives in
the Acropolis for now, in `worlds/acropolis/src/kit.js`. When a second world
needs it, it moves to a shared place instead of being copied.

## 4. Look at it

```bash
npm start
```

then, in the browser:

- `/worlds/<id>/?demo=10` - the whole world in ten seconds, with the camera
  following the site: the quickest way to check order and phases. Without a
  number it lasts 90 seconds, like the demo in the home page.
- `/worlds/<id>/?dev` - the building-site controls: single placement, gifted
  credit and *Tutto in 10 s* ("all in 10 s"), which finishes the world from
  wherever it is. For stopping at a given phase, or quickly seeing the result
  of a change. It doesn't touch the registry.
- `/worlds/<id>/?snapshot` - the finished world, still and without panels:
  the framing of the card's picture.

The interface of the scenes is in Italian for now.

Pages reload by themselves when you change a file: the server declares the
version of the files, and open tabs notice.

The home page has the same entrances for the template, in *Il laboratorio*
(the lab), below the worlds.

## 5. The card's picture

When `snapshot` frames the world well:

```bash
npm run previews -- <id>
```

opens the world in a windowless Chrome and saves `worlds/<id>/preview.webp`.
For a world that has been announced but not built yet, a drawn silhouette
takes its place: `preview.svg`, like the ones of Giza and the Forum.

## 6. Publish it

1. In `world.json`, `"status": "available"`.
2. `npm test` and `npm run test:scene`.
3. A commit.

From then on the world can be chosen from the home page. And from then on the
order of the pieces is never touched again.

---
---

# Creare un mondo

*Versione italiana.*

Questa guida porta da zero a un mondo che si sceglie dalla pagina iniziale e
si costruisce coi token. Il modello da cui partire è `worlds/_template/`: una
torre di pietra da miniatura fantasy, con il basamento, il corpo rotondo, due
balconate, la torretta e il tetto di scandole. Funziona già, ogni sua parte è
commentata, e mostra i casi che servono quasi sempre: muri dritti e rotondi,
aperture, archi di conci, pezzi dentro un gruppo, un tetto a filari.

## Com'è fatto un mondo

Un mondo vive in `worlds/<id>/`, e porta solo quello che lo rende se stesso.
Cielo, luce, camera, credito, posa dei blocchi e pannello del cantiere sono del
motore, in `engine/`, uguali per tutti.

```
worlds/<id>/
  world.json      i dati: nome, luogo, epoca, durata, sole, stato
  index.html      la pagina: è quella del modello, i testi li prende da world.json
  src/main.js     costruisce i pezzi e li passa al motore
  preview.webp    l'immagine della scheda nella pagina iniziale
```

L'`id` è il nome della cartella e il nome con cui il registro conosce il
mondo: lettere minuscole, cifre e trattini, e non cambia più dopo la
pubblicazione.

## 1. Comincia dal modello

```bash
npm run new-world -- babilonia "Babilonia"
```

Copia il modello in `worlds/babilonia/`, con un `world.json` segnato *in
arrivo*: la pagina iniziale mostra la scheda, ma non lascia ancora scegliere il
mondo. Se il mondo era già stato annunciato e ha il suo `world.json` - come la
piana di Giza - il generatore lo lascia com'è e aggiunge solo pagina e codice.

## 2. world.json

| Campo | Cosa |
|---|---|
| `id` | lo stesso nome della cartella |
| `order` | la posizione nella pagina iniziale |
| `name`, `subtitle` | il titolo e la riga sotto |
| `place`, `era` | dove e quando: compaiono nella scheda e nell'intestazione della scena |
| `description` | due righe per la scheda |
| `status` | `coming` finché non è pronto, poi `available` |
| `weeks` | quanto dura il mondo, in settimane di lavoro a pieno regime |
| `solar` | latitudine e longitudine in gradi, fuso orario, giorno dell'anno: il sole è calcolato da qui |
| `preview` | il file dell'immagine della scheda, `preview.webp` o `preview.svg` |

`weeks` decide il prezzo di tutto: il budget del mondo è la quota settimanale
(`WEEKLY_TE`, in `engine/config.js`) per le settimane. L'Acropoli dura un mese,
`4.2857`; un mondo grande può valere tre mesi.

## 3. Il codice: src/main.js

Il file fa due cose: costruisce i pezzi, e chiama `startWorld` del motore.

### I pezzi

```js
addPiece(fase, oggetto, peso, marca, descrizione, caduta)
```

- **fase**: la chiave della fase a cui appartiene, da `phases`.
- **oggetto**: un `Object3D` di three.js, già nella sua posizione finale.
- **peso**: quanto vale rispetto agli altri pezzi. Non è un prezzo: il motore
  ripartisce il budget del mondo sui pesi. Una metopa che vale 18 costa
  quattro volte e mezzo un rocchio che vale 4.
- **marca**: l'identificativo che si legge nel pannello. `mark('ROCCHIO')` lo
  numera da sé: `ROCCHIO-01`, `ROCCHIO-02`...
- **descrizione**: una riga per il pannello.
- **caduta**: da quanti metri scende il blocco quando si posa.

**L'ordine delle chiamate è l'ordine di posa**, e quindi la cronologia del
cantiere. Il registro ricorda quanti pezzi sono stati posati, cioè "i primi N
dell'elenco": **dopo la pubblicazione l'ordine non si cambia**, altrimenti N
indicherebbe altri pezzi. Pezzi nuovi si aggiungono in fondo.

Quello che c'era prima del cantiere - il terreno, la roccia - non è un pezzo:
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
est e `-z` a nord: conviene fare lo stesso, perché il sole è calcolato così.

Il kit dell'architettura greca - colonnati, trabeazioni, frontoni - sta per ora
nell'Acropoli, in `worlds/acropolis/src/kit.js`. Quando un secondo mondo ne ha
bisogno, si sposta in un posto comune invece di copiarlo.

## 4. Guardalo

```bash
npm start
```

poi, nel browser:

- `/worlds/<id>/?demo=10` - il mondo intero in dieci secondi, con la camera
  che segue il cantiere: il modo più rapido di controllare ordine e fasi.
  Senza numero dura 90 secondi, come la dimostrazione della pagina iniziale.
- `/worlds/<id>/?dev` - i comandi da cantiere: posa singola, credito regalato
  e *Tutto in 10 s*, che finisce il mondo da dove si trova. Per fermarsi su una
  fase precisa, o vedere in fretta il risultato di una modifica. Non tocca il
  registro.
- `/worlds/<id>/?snapshot` - il mondo completo, fermo e senza pannelli: è
  l'inquadratura dell'immagine della scheda.

Le pagine si ricaricano da sole quando cambi un file: il server dichiara la
versione dei file, e le schede aperte se ne accorgono.

Per la torre di prova, gli stessi ingressi sono nella pagina iniziale, nel
*laboratorio* sotto i mondi.

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

Da lì il mondo si sceglie dalla pagina iniziale. E da lì l'ordine dei pezzi
non si tocca più.
