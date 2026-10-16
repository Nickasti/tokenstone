# Come è nato questo progetto

Registro della conversazione da cui il codice deriva, con le decisioni prese
e il motivo per cui sono state prese. Serve a ritrovare il filo fra sei mesi,
quando i perché saranno svaniti e resterà solo il come.

---

## 1. La domanda di partenza

> Dove trovo una ricostruzione grafica 3D dell'Acropoli di Atene all'epoca di
> Pericle? Mi serve per un progetto in cui una persona, spendendo token,
> costruisce e dà vita all'Acropoli step by step. Voglio appoggiarmi a un
> progetto esistente, non crearne uno da zero.

Ricognizione delle fonti disponibili, divise per cosa servono davvero.

**Base 3D scaricabile e licenziabile**
- *La Acrópolis de Atenas* su Sketchfab (studio Jaol per ASPAYM) —
  CC-BY 4.0, gratuito, 117k triangoli, comprende Partenone, Propilei e altri
  templi. Licenza compatibile con l'uso commerciale, basta l'attribuzione.

**Riferimento scientifico**
- [ancientathens3d.com](https://ancientathens3d.com/classical-acropolis/) di
  Dimitris Tsalkanis — non scaricabile, ma è la migliore documentazione visiva
  dell'Acropoli classica. Ha un Patreon: è una persona contattabile.
- [parthenon3d.com](https://parthenon3d.com/) di Juan de Lara (Oxford, UCL,
  British School at Athens) — quattro anni di lavoro, il modello più rigoroso
  del Partenone. Pubblicato sull'*Annual of the British School at Athens*.

**A pagamento, per edificio**
- Free3D e TurboSquid hanno Propilei, Chalkotheke, Brauroneion, Athena
  Promachos e le statue dei frontoni venduti separatamente. Tra 59 e 249
  dollari a edificio.

**Kit modulari game-ready**
- *Ancient Temple Modular Asset Kit* e simili su Fab, in FBX convertibile
  in glTF.

---

## 2. «Il modello è fatto di triangoli: posso scomporli uno per uno?»

No, ed è un equivoco che vale la pena chiarire perché cambia tutto
l'approccio.

Ogni mesh 3D è fatta di triangoli: è il modo in cui la GPU disegna qualsiasi
superficie. Un triangolo non corrisponde a un blocco di marmo, è mezza faccia
di un cilindro. Scomporre 117.000 triangoli darebbe 117.000 schegge prive di
senso.

Quello che conta è la **gerarchia dei nodi** dentro il GLB. In Blender:
- `P` → *Separate by Loose Parts* separa le isole di geometria non connessa
- `P` → *Separate by Material* dà una prima segmentazione grossolana
- selezione manuale + `P` → *Selection* funziona sempre

Per 60-80 pezzi si parla di qualche ora di lavoro. Due cose emergono
facendolo: separando gli elementi vengono fuori i buchi (le facce interne non
sono mai state modellate), e 117k triangoli per l'intero complesso significa
circa 10k per edificio — le colonne saranno cilindri semplici, senza
scanalature.

---

## 3. La svolta: generazione procedurale

Se la granularità deve essere reale — rocchio per rocchio — nessun modello
scaricabile la dà, perché nessuno modella i singoli rocchi. Ma quella parte si
genera da codice.

**Architettura scelta:** modello scaricato per il contesto ambientale,
geometria procedurale per tutto ciò che l'utente costruisce attivamente.

Poi, costruendo, il modello scaricato è stato eliminato del tutto: la
scansione fotogrammetrica disponibile è dell'Acropoli *di oggi*, con i muri di
contenimento ottocenteschi e ventiquattro secoli di erosione. Per una scena
ambientata nel 440 a.C. è l'oggetto sbagliato. Un heightfield parametrico dà
un pianoro modificabile e storicamente coerente.

---

## 4. Primo prototipo: il solo Partenone

1.089 pezzi generati da codice a partire dalle misure reali.

- stilobate 30,88 × 69,51 m
- colonne alte 10,43 m, 8 sulle fronti e 17 sui fianchi
- ogni fusto è una pila di 11 rocchi con entasi: il raggio scende da 0,95 a
  0,74 m con un rigonfiamento sinusoidale a metà altezza
- 20 scanalature doriche scavate deformando i vertici del cilindro, non
  dipinte con una texture
- 92 metope — il numero esatto: 14 per fronte, 32 per fianco
- triglifi in blu egizio, taenia in minio, come nell'originale

**Marche da cantiere.** Ogni pezzo ha un identificativo in greco
(`KIWN 14/d`, `METOPH-47`, `GEISON-12`) perché gli scalpellini greci
marcavano davvero i blocchi per l'assemblaggio.

**Il momento token → pietra.** Il blocco arriva dall'alto come fantasma
verderame e si solidifica in marmo quando si posa. È storicamente corretto:
i blocchi venivano issati con gru e ulivelle.

---

## 5. Espansione al complesso pericleo

Aggiunti Athena Promachos, Propilei, Tempio di Atena Nike ed Eretteo, tutti
costruiti dallo stesso kit modulare esteso all'ordine ionico.

**Posizioni reali sul pianoro** (origine al centro del Partenone,
+X est, −Z nord):

| monumento        | x    | z   | note                             |
|------------------|------|-----|----------------------------------|
| Partenone        | 0    | 0   | asse lungo est-ovest             |
| Eretteo          | −41  | −25 | tre livelli diversi              |
| Athena Promachos | −84  | −14 | fra Propilei e Partenone         |
| Propilei         | −147 | −3  | estremità occidentale            |
| Atena Nike       | −166 | 17  | sul bastione, +8,6 m             |

**I Propilei sono incompiuti sul serio.** L'ala nord-ovest, la Pinacoteca, è
completa perché lo era davvero. L'ala sud si ferma alle fondazioni, e i pochi
corsi sopra usano materiale grezzo con le bugne di sollevamento ancora
attaccate: è così che si riconosce un cantiere greco fermato a metà.

**Cielo analitico invece di HDRI.** Scattering singolo Rayleigh + Mie, con lo
spessore ottico calcolato separatamente per la direzione di vista e per quella
del sole. La posizione solare viene dalle equazioni reali per la latitudine di
Atene (37,97° N). Il cielo viene poi renderizzato in cubemap e passato al
`PMREMGenerator`: illuminazione basata su immagine, generata a runtime.

Il vantaggio rispetto a un HDRI: l'ora del giorno è un parametro continuo.
Alle 18:40 il sole rosso attraversa il colonnato da ovest perché l'atmosfera
ha davvero rimosso il blu dalla sua luce, non perché sono stati interpolati
due colori.

**Fusione delle mesh.** A cantiere completo la scena ha circa 2.500 mesh.
Quando una fase si chiude, `bakePhase()` fonde le sue mesh in una geometria
per materiale: le draw call scendono da qualche migliaio a poche decine.

---

## 6. Il ponte con i token reali

Il consumo di Claude Code non è esposto via API: si legge con `/usage`, che
dà una percentuale e l'orario di azzeramento della finestra. Fra una lettura
e l'altra il consumo va stimato.

`server/usage_store.py` implementa un modello volutamente semplice: due
calibrazioni consecutive danno un tasso di consumo, estrapolato fino alla
lettura successiva e azzerato al reset della finestra. Ogni stima porta con sé
quanto tempo è passato dall'ultima misura reale, così chi legge sa quanto
fidarsi.

La conversione è `TOKENS_PER_PERCENT = 240`: un punto percentuale di consumo
vale 240 blocchi di credito. Con un costo totale del cantiere intorno ai
18.000 token, una finestra piena costruisce buona parte dell'Acropoli. È il
parametro economico da tarare sul consumo reale.

---

## 7. Le linee che non sono rette

Nel Partenone non esiste una linea retta significativa. Non e imprecisione:
sono correzioni deliberate contro l'illusione ottica, e sono la ragione per
cui l'edificio sembra vivo dove una copia ortogonale sembra morta.

Quattro deviazioni, tutte in `REFINEMENTS` dentro `config.js`, tutte
disattivabili con `on: false` per vedere il confronto.

**La curvatura dello stilobate.** Il piano di posa si inarca verso l'alto:
6 cm a meta delle fronti, 11 cm a meta dei fianchi, 17 cm al centro dove i
due archi si sommano. Agli angoli e zero. `makeCurve()` restituisce quella
superficie come funzione di `(x, z)`, piu la sua pendenza locale: serve
perche ogni blocco va anche *inclinato*, non solo alzato, altrimenti resta
orizzontale su un piano che non lo e piu.

La conseguenza pratica e che tutto quello che poggia sullo stilobate deve
conoscere la curva: colonne, muri della cella, trabeazione, frontoni. Un
blocco largo quanto il tempio non puo seguire un arco trasversale, quindi
la crepidoma e passata da 36 a 108 pezzi, tagliati anche nel senso della
larghezza.

**L'inclinazione delle colonne.** Nessuna colonna e verticale: pendono tutte
verso l'interno di circa 6 cm sui 10,43 m del fusto, cioe 1:171. E il valore
da cui viene la cifra che si cita sempre — i fianchi opposti, prolungati, si
incontrerebbero 2,4 km piu in alto.

Qui il primo tentativo era sbagliato. Far convergere *tutti* gli assi in un
unico punto sopra il centro dell'edificio da una pendenza proporzionale alla
distanza: le colonne d'angolo, a 36 m dal centro, sarebbero rientrate di
157 mm invece dei ~65 attestati. L'inclinazione e invece costante per faccia,
perpendicolare a quella faccia. Le colonne d'angolo appartengono a due facce
e pendono in diagonale, 86 mm. E la sola che rientra di piu, ed e corretto.

Siccome ogni rocchio resta un pezzo indipendente — e tutto il progetto sta
li — l'inclinazione va applicata rocchio per rocchio: la quota locale sposta
il centro verso l'interno, un quaternione ruota il blocco. Lo spin attorno
all'asse del fusto viene composto *prima* della pendenza, altrimenti se la
trascina in un piano sbagliato.

**Le colonne d'angolo piu grosse.** 1,945 m di diametro contro 1,905, il
2,1% in piu. Si stagliano contro il cielo invece che contro il muro della
cella, e la luce che le contorna le farebbe sembrare piu magre.

**La contrazione angolare.** I due intercolumni d'angolo sono piu stretti
degli altri: sulla fronte 3,57 m contro 4,18. Serve a far cadere il triglifo
sullo spigolo della trabeazione senza lasciare mutila la metopa d'angolo. Le
colonne d'angolo restano ferme, sono quelle interne a spostarsi in fuori.

---

## 8. Il marmo non era bianco

Il bianco e un equivoco moderno: e quello che resta quando il pigmento se ne
va. Fino a qui erano dipinti solo i triglifi e la taenia, cioe il minimo
indiscutibile. `POLYCHROMY.on` estende il programma a quello che le tracce
attestano.

- **fondo delle metope in rosso**, con la lastra arretrata di quattro
  centimetri rispetto alla faccia dei triglifi. Le figure scolpite restavano
  in marmo: e il contrasto col fondo a farle leggere da terra.
- **fondo del timpano in blu**, per la stessa ragione, a venti metri d'altezza
- **soffitto del geison in blu** — l'unica superficie dipinta che si vede
  camminando sotto il colonnato
- **anuli dei capitelli in minio**, una fascia sottile sotto l'echino

Un caso a parte e l'Eretteo, il cui fregio non era dipinto affatto: lastre di
calcare grigio di Eleusi con le figure di marmo bianco fissate sopra a parte.
Intarsio, non pittura. In `entablature()` e il parametro `friezeMat`.

Nessuno di questi e un pezzo nuovo: sono dettagli dentro pezzi che esistono
gia, quindi il costo del cantiere non cambia. Le metope su fondo rosso sono
140 — 92 del Partenone, il numero esatto, e 48 dei Propilei.

---

## 9. Il pianoro

Cinque edifici su una spianata vuota non sono l'Acropoli: sono cinque
edifici. Il recinto vero era affollato, e Pausania, che ci cammina sei
secoli dopo, prova a elencare le statue una per una e si stanca prima di
finire.

**La linea di demarcazione.** La roccia affiorante non e un pezzo del
cantiere e non ha un costo: c'era prima. Tutto il resto e stato portato su
a spalla, e quindi si paga. E una distinzione che vale la pena tenere
netta, perche e la regola che rende leggibile il gioco: quello che vedi,
o l'hai comprato o e geologia.

**La via Panatenaica.** Sale dall'Agora, entra dai Propilei, passa a sud
dell'Athena Promachos, gira attorno alla fronte occidentale del Partenone,
ne costeggia il fianco e finisce davanti all'altare. Non davanti alla
porta del tempio: nei templi greci non entrava nessuno se non i sacerdoti,
e la processione si fermava dove si sacrificava.

Il tracciato e una Catmull-Rom su diciassette punti, scritta a mano perche
serviva una curva sola. Ogni fila e di tre lastre di larghezza diseguale —
il basolato greco non era un pavimento, erano pietre accostate — e ognuna
prende quota e pendenza dal terreno sotto di se. Al primo tentativo le
lastre erano staccate di dieci centimetri e su ogni dosso si apriva una
fessura: ora si sovrappongono appena.

**Il muro nord.** Quando i Persiani bruciano l'Acropoli nel 480 trovano il
Partenone precedente ancora in cantiere. I rocchi gia squadrati restano a
terra, e Temistocle li fa murare nel lato nord in un corso continuo,
allineati e sporgenti dalla faccia. Non e riuso per risparmiare: si vedono
da sotto, dalla citta, ed e un memoriale.

Anche qui il primo tentativo era sbagliato in un modo istruttivo. I rocchi
erano posati a `terrainH(x, z) + 3.5`, cioe a una quota relativa al
terreno — e siccome al ciglio il terreno sta gia precipitando, restavano
appesi a mezz'aria sopra il pendio, sparsi invece che allineati. Vanno
messi *dentro* la faccia del muro, a quota assoluta, e la quota del
coronamento e ora una funzione sola in `terrain.js` che usano sia
l'estrusione delle mura sia i blocchi.

Un secondo dettaglio: l'angolo non e proporzionale alla distanza percorsa
su un'ellisse. Spaziando i rocchi in modo uniforme nel parametro angolare
venivano fitti alle estremita e radi al centro, e la fila non si leggeva.
Serve una tabella di lunghezze d'arco e la sua inversa.

**L'altare di Atena Polias.** Il vero centro del culto. Il tempio
custodiva la statua, l'altare riceveva il sangue: qui finiva la
processione e qui si sacrificavano le cento vacche dell'ecatombe. Base a
tre gradini, piano del fuoco, parapetto su tre lati e rampa a est, perche
le vittime salivano sulle proprie zampe.

**Brauronion e Calcoteca.** Due edifici che non sono templi, addossati al
muro sud: un recinto con portici per i doni ad Artemide, e il magazzino
dove finivano i bronzi votivi quando non c'era piu posto per esporli.
Costruiti con lo stesso kit dei monumenti maggiori, il che e la verifica
che il kit funziona anche fuori dai cinque casi per cui e nato.

**Gli anathemata.** Chi vinceva una gara, una causa o una guerra lasciava
un'offerta, e non la si poteva togliere perche apparteneva alla dea. Ce ne
sono settantaquattro, di cinque tipi: korai su colonnetta, tripodi
bronzei, erme, stele iscritte, perirranteri. Sparsi con rifiuto: fuori
dagli ingombri dei monumenti, a piu di quattro metri e mezzo dalla strada
perche la processione deve passare, e a piu di cinque l'uno dall'altro.

**Il verde.** L'Acropoli era una roccia, non un parco. Il verde sta dove
lo mettono le fonti: l'ulivo di Atena nel Pandroseion, qualche albero nei
recinti, macchia bassa lungo le mura dove la terra si e accumulata.
L'ulivo sacro e il primo pezzo del cantiere, datato 479 — Erodoto racconta
che i Persiani lo bruciarono e che il giorno dopo il ceppo aveva gia
rimesso un getto lungo un cubito. L'Acropoli riparte da li, e cosi anche
la sequenza di posa.

**Determinismo.** Tutto quello che e sparso a caso usa un generatore con
seme fisso. Non e pignoleria: lo stato salvato in `localStorage` e un
indice dentro l'elenco dei pezzi, e se l'elenco cambiasse ordine a ogni
ricarica quell'indice punterebbe a un altro pezzo.

**Il conto.** Il cantiere passa da 2.333 a 3.280 pezzi e da 17.419 a
24.349 token. Con `TOKENS_PER_PERCENT = 240` una finestra piena di consumo
ne vale 24.000: costruire l'Acropoli intera costa ora esattamente una
finestra. E una coincidenza, ma e la coincidenza giusta, e conviene tarare
il parametro per mantenerla.

---

## 10. Dalla stima al conto vero

Il bridge del capitolo 6 estrapolava: due letture di `/usage` davano un
tasso, e fra una lettura e l'altra il consumo si indovinava. Funzionava, ma
chiedeva di ricordarsi di calibrare, e il numero era tanto buono quanto
l'ultima lettura.

Il consumo vero c'e gia sul disco. Ogni risposta di Claude Code finisce nel
transcript della sessione con i suoi contatori: token di input, scritture e
letture di cache, token di output, e il modello che li ha prodotti. Basta
moltiplicarli per il listino.

**Il token equivalente.** I token non valgono tutti uguale: l'output di Opus
costa cinque volte l'input, la lettura di cache un decimo. Sommarli alla
cieca premierebbe una sessione che rilegge molto contesto e punirebbe una
che scrive molto codice. Il contatore li converte in dollari col listino, e i
dollari in TE con `te_per_usd = 200.000`: cosi un TE e esattamente il costo
di un token di input di Opus, e il numero ha un senso fisico.

**Ricalcolo, mai somma.** Il contatore non aggiunge il consumo nuovo al
totale vecchio: ricostruisce ogni volta il totale da capo. E la scelta che
rende il sistema innocuo da ripetere. Un contatore che somma, se scatta due
volte, conta due volte; uno che ricalcola, se scatta cento volte, da cento
volte lo stesso numero.

**Lo streaming.** Il transcript riscrive lo stesso messaggio a ogni passo
dello streaming, con i contatori che crescono. Sommare ogni riga gonfierebbe
il conto di un fattore tre o quattro. Vale una riga per `message.id`, quella
con piu output, perche e l'unica completa.

**Il guasto che non si vedeva.** Il primo banco di prova aveva un controllo
che falliva: con lo stato corrotto, il contatore ripartiva da zero e fissava
`installed_at` al momento presente, scartando come "precedente
all'installazione" tutto lo storico. Un incidente al file costava l'intero
cantiere. Ora ogni scrittura riuscita aggiorna anche una copia di riserva, e
uno stato illeggibile riparte da li. Uno stato *assente* invece resta un
reset voluto: e la distinzione fra un guasto e una scelta.

---

## 11. Quanto costa l'Acropoli

Il primo cambio era un divisore: 250 TE per un token di cantiere. Teneva i
numeri piccoli, ma diceva poco: un rocchio costava 4 di una moneta
inventata.

**Pesi, non prezzi.** I valori di `COST` sono diventati pesi relativi - un
rocchio 4, una metopa 18, la Parthenos 400 - e il prezzo vero, in TE, nasce
dividendo un budget su quei pesi. Le proporzioni fra un blocco e una statua
restano quelle decise a mano; la scala la decide una sola grandezza.

**La scala e un mese.** L'Acropoli intera deve costare un mese di lavoro a
pieno regime: quattro settimane e qualcosa in cui si esaurisce ogni volta il
100% dell'utilizzo settimanale di Claude Code. E una misura che chi usa il
progetto capisce senza spiegazioni, e che lega il cantiere al ritmo reale del
lavoro. Quanti TE valga una settimana non e pubblico e dipende dal piano:
`CANTIERE.weeklyTe` va misurato confrontando due letture di `/usage` con il
totale del contatore. Finche non lo si misura, resta una stima.

**Il credito che spariva.** Il saldo si salvava solo quando si posava un
blocco o si muoveva il sole. Il credito arrivato dal contatore veniva segnato
come "gia consegnato" ma non scritto: ricaricando la pagina prima di posare,
i TE guadagnati evaporavano. Ora il credito si salva nell'istante in cui
arriva.

**Chi guarda e chi costruisce.** I primi comandi - posa il blocco, cantiere
continuo, credito regalato - erano strumenti di lavoro finiti
nell'interfaccia di tutti. Il cantiere ora si posa da solo, al ritmo dei
token, e i comandi compaiono solo aggiungendo `?dev` all'indirizzo. Si era
pensato a due progetti separati, uno per i visitatori e uno per lo sviluppo;
si e scelto un progetto solo con un interruttore, perche due copie dello
stesso codice divergono in una settimana.

**Il server che serviva una richiesta alla volta.** Due volte la scena e
rimasta bloccata sulla schermata d'avvio, e la seconda volta l'errore -
"Failed to fetch dynamically imported module" - ha portato alla causa. Il
server statico era a thread singolo: bastava che il browser aprisse una
connessione in anticipo senza usarla, cosa che fa sempre, perche ogni altra
richiesta restasse in coda. Con la scena che chiede lo stato ogni cinque
secondi, la coda non si liberava piu. Il server ora e multithread, e la
schermata d'avvio, se qualcosa fallisce, scrive l'errore invece di restare
muta: e stato proprio quel messaggio a trovare il guasto in un minuto.

---

## 12. Senza hook

Il contatore e nato come hook `Stop`: Claude Code lo lanciava alla fine di
ogni risposta, passandogli il percorso del transcript. Per chi l'ha scritto
andava benissimo. Per chi trova il progetto su GitHub voleva dire aprire
`~/.claude/settings.json`, incollarci un blocco JSON col percorso assoluto
della cartella clonata, e lasciare che uno script scritto da uno sconosciuto
girasse a ogni risposta in ogni progetto. E il punto in cui un estraneo
ragionevole chiude la pagina.

**L'hook non era necessario.** Diceva al contatore *quando* guardare e
*dove*, ma i dati non venivano dall'hook: venivano dai transcript, che Claude
Code scrive comunque in `~/.claude/projects`. Il contatore ora guarda da se
quella cartella ogni cinque secondi, e il server della scena lo avvia
accanto a se. Si clona, si avvia il server, si lavora: nessun file toccato
fuori dalla cartella del progetto, e disinstallare vuol dire cancellarla.

**Si parte da zero.** Al primo avvio la scansione trova anche i mesi di
lavoro precedenti. Si poteva regalarli come credito iniziale, e chi installa
dopo un mese intenso si sarebbe ritrovato mezza Acropoli in piedi. Si e
scelto di no: il cantiere comincia quando arriva il progetto. Il primo giro
fissa `installed_at`, e tutto quello che c'era prima resta fuori.

**Quello che la scansione deve sapere e l'hook no.** Guardare tutta la
cartella, invece di un file per volta, porta tre problemi nuovi.

- *Le sessioni riprese.* Una sessione ripresa puo ricopiare la conversazione
  precedente in un file nuovo. Con l'hook ogni sessione si contava da sola;
  con la scansione lo stesso messaggio comparirebbe due volte. Vale una
  volta, nella sessione dove e apparso per primo.
- *Le cancellazioni.* Claude Code elimina da solo i transcript vecchi. Se lo
  stato seguisse il disco alla lettera, una sessione sparita si porterebbe
  via i suoi blocchi. Una sessione che non c'e piu resta nello stato,
  archiviata: il consumo c'e stato.
- *Il costo.* Rileggere tutti i transcript ogni cinque secondi crescerebbe
  col tempo. I transcript pero crescono solo in coda: il contatore ricorda
  fin dove ha letto ogni file e legge soltanto le righe nuove, e salta del
  tutto i file non toccati da prima dell'installazione. Una riga a meta
  scrittura si aspetta al giro dopo.

**Il confronto.** Sui dati veri, la prima scansione ha dato per le sessioni
concluse esattamente gli stessi TE dell'hook, al token. La sessione in corso
risultava piu alta, ed era giusto: l'hook l'aveva contata alla fine della
risposta precedente, la scansione vedeva gia quella in corso. E una sessione
che l'hook non aveva mai registrato si e rivelata precedente
all'installazione: esclusa correttamente, non persa.

**Il contatore muore col server.** Un processo lanciato in background che
sopravvive al suo padre resta li a leggere file per sempre. Il server passa
al contatore una pipe, e il contatore se ne va quando la pipe si chiude:
anche se il server viene ucciso di colpo, senza passare dalla chiusura
ordinata.

**I modelli nuovi.** Il listino riconosceva i modelli per prefisso, e
prendeva la prima voce che combaciava: `claude-opus-5-5` veniva prezzato come
`claude-opus-5` senza dire niente. Ora vince la voce piu specifica, una data
in coda al nome e lo stesso modello, e una versione che nel listino non c'e
viene prezzata con la voce piu vicina ma segnalata in `unknown_models`, con
`model_fallbacks` a dire quale prezzo ha preso in prestito. Il contatore
rilegge il listino a ogni giro: aggiornarlo vale subito.

---

## 13. Un linguaggio solo

Tolto l'hook, il progetto parlava due lingue. Il server era Python, novanta
righe che servivano file; il contatore era JavaScript, eseguito da Node; la
scena, JavaScript nel browser. Chi lo installava doveva avere Python *e*
Node, e il server doveva lanciare il contatore come programma separato e
sorvegliarlo - la pipe del capitolo precedente esisteva solo per questo.

**Si riscrive la parte piccola.** Unificare voleva dire riscriverne una. Con
Python si sarebbe riscritto il contatore, le novecento righe collaudate caso
per caso: sessioni riprese, subagenti, righe a meta, copia di riserva. Con
Node bastava riscrivere il server. Si e scelto Node: e la stessa lingua della
scena, e si butta via la parte banale invece di quella difficile.

**Cosa e cambiato davvero.** Il contatore ora gira dentro il server, nello
stesso processo: niente pipe, niente processi orfani possibili per
costruzione. Node gestisce da se molte connessioni insieme, quindi il guasto
del server a richiesta singola non puo ripresentarsi. Il progetto ha un
`package.json` senza dipendenze, e si avvia con `npm start`, come chiunque si
aspetta da un progetto JavaScript.

**Due cose trovate strada facendo.** Il server Python ascoltava su tutte le
interfacce: lo stato - quanto lavori e su quali progetti - era leggibile da
chiunque sulla stessa rete. Quello nuovo ascolta solo sul computer locale, e
per aprirlo alla rete serve chiederlo. E il Python su Windows, con
`allow_reuse_address`, poteva aprire la stessa porta insieme a un altro
processo, dividendo a caso le connessioni fra i due: e il sospetto piu
serio per un "Failed to fetch" comparso una volta sola e mai piu riprodotto.
Node rifiuta una porta occupata, e lo dice.

**La sicurezza dei file.** Un server statico deve servire la scena e
nient'altro. Quello nuovo rifiuta i percorsi che risalgono fuori dalla
cartella, i file e le cartelle nascoste - `.git`, la copia di riserva dello
stato - anche quando l'indirizzo prova ad aggirare la regola con una barra
rovesciata, che su Windows e un separatore. Ogni caso ha il suo test.

---

## 14. Il listino che si aggiorna

Il contatore e esatto quanto il listino che usa, e i modelli escono spesso.
Il giorno in cui si e passati a Claude Opus 5.5, il listino conosceva solo
Opus 5 e Sonnet 5: Opus 5.5 veniva prezzato come Opus 5, per prefisso, e
segnalato fra i modelli sconosciuti.

**Quanto sbagliava.** Opus 5.5 costa meno del predecessore, e soprattutto la
lettura di cache costa $0,20 invece di $0,50. Nel lavoro con Claude Code la
lettura di cache e piu di meta del conto, perche ogni risposta rilegge tutto
il contesto. Sugli ottantacinque messaggi Opus 5.5 contati fino a quel
momento, il cantiere segnava circa 3,5 milioni di TE dove ne valevano 2: il
74% in piu.

**La regola che sembrava giusta.** Per proteggere il listino da un errore si
era pensato a un controllo di coerenza: la lettura di cache vale un decimo
dell'input. Su Opus 5 e vero, su Opus 5.5 vale un ventesimo, su Fable 5.1 un
quarantesimo. Quel controllo avrebbe rifiutato proprio i prezzi giusti. Il
listino si verifica nella forma - cinque voci, numeri, niente di mancante -
e i valori li dice solo la pagina ufficiale.

**Nessuna API per i prezzi.** L'API dei modelli di Anthropic restituisce
nome, data, contesto e capacita, non quanto costano. La fonte e la pagina
dei prezzi, che esiste anche in Markdown. Leggerla e un lavoro da agente:
uno script si romperebbe al primo cambio di impaginazione, un agente legge
come una persona.

**Proporre, poi applicare.** Il subagente `aggiorna-listino` vive nel
repository, quindi lo ha chiunque cloni il progetto. Scrive un listino
candidato, lo controlla, ne misura l'effetto con una prova a secco del
contatore - stesso calcolo, nessuna scrittura - e si ferma. Sostituisce
`pricing.json` solo con un via libera esplicito, e se dopo i test qualcosa
non torna rimette il listino di prima. Un prezzo sbagliato sbaglia il conto
di tutti senza che nessuno se ne accorga: la decisione resta a una persona.

**Il segnale.** Un agente che va chiamato a mano si dimentica. La scena
mostra sotto il credito quali prezzi sono stimati, e `CLAUDE.md` chiede a
Claude Code di controllarlo quando inizia a lavorare nel progetto e di
proporre l'agente.

**Quello che i transcript dicevano e il contatore no.** Guardando i campi
veri di `usage` sono emerse due cose. La modalita veloce, registrata in
`speed`, costa il doppio su Opus 5.5 e Opus 5: il listino ora porta un
`fast_multiplier`, e una risposta veloce senza moltiplicatore viene
segnalata invece di essere contata a meta prezzo in silenzio. E Claude Code
scrive messaggi `<synthetic>`, senza un modello dietro, che finivano fra i
modelli sconosciuti e avrebbero tenuto acceso l'avviso per sempre: ora non
contano. Due maggiorazioni della pagina restano fuori di proposito, perche
nei transcript di un abbonamento non compaiono: l'elaborazione vincolata agli
Stati Uniti e le ricerche web lato server.

**Quando un prezzo scende.** Il contatore ricalcola tutto, quindi il totale
scende. La scena non toglie i blocchi posati ne il credito consegnato: si
ferma, e riparte quando il consumo nuovo ha recuperato la differenza. E il
comportamento giusto - il cantiere non deve mai disfarsi - ma va detto prima,
perche visto da fuori sembra un guasto.

---

## 15. Aprirla senza terminale

Fino a qui la scena si apriva con `npm start`, o chiedendo a Claude di
avviarla. Per chi la usa ogni giorno, e per chi la scarica da GitHub senza
essere uno sviluppatore, e troppo.

**Il server non deve stare acceso.** E la scoperta che ha deciso il resto.
Il cantiere non vive nel server: vive nei transcript che Claude Code salva
comunque. Spento il server per una notte, alla riaccensione il contatore ha
recuperato i 776.746 TE consumati nel frattempo, al token. Il server serve a
guardare, non a contare; quindi non serve farlo partire con il computer, ne
installare niente che resti acceso.

**Un doppio clic.** Un file di avvio per sistema - `Acropoli.cmd`,
`Acropoli.command`, `acropoli.sh` - accende il server in una finestra e apre
la scena; chiusa la finestra, si spegne. Il doppio clic doveva funzionare
anche la seconda volta: il server ora risponde a un indirizzo con cui si fa
riconoscere, e un secondo avvio che trova la porta occupata dal cantiere apre
la pagina invece di dare errore.

**Come app.** Un manifesto e un'icona - la fronte di un tempio, disegnata da
uno script cosi da poterla rifare - bastano a Chrome ed Edge per installare la
scena come app. Un service worker fa una cosa sola: se l'app si apre a server
spento, mostra una pagina che spiega come accenderlo invece dell'errore del
browser. Non tiene copie della scena, che resterebbero vecchie dopo un
aggiornamento.

**Due inciampi della verifica.** Il primo: in un profilo di prova dal percorso
lunghissimo Chrome non riusciva ad aprire la propria cache, e il service
worker falliva l'installazione. Non era un difetto della scena, ma ha mostrato
una fragilita vera: ora, se la cache non si apre, il worker si installa lo
stesso e si perde solo la pagina d'aiuto. Il secondo: una ricarica forzata
scavalca apposta il service worker, quindi per vedere la pagina d'aiuto la
prova deve aprire la pagina come fa l'utente, non forzarla.

---

## 16. Il cantiere si calcola dal credito

L'Acropoli non resta sola: dopo verranno la piana di Giza, il Foro Romano, e
forse mondi moderni o inventati. Chi usa il progetto sceglie un mondo, lo
costruisce in settimane o mesi, e quando l'ha finito - o quando vuole cambiare
- ne comincia un altro. Le decisioni, prese prima di scrivere codice: un mondo
si puo mettere in pausa; il credito che avanza a mondo completato passa al
successivo; ogni mondo ha la sua durata.

**Il problema che c'era gia.** L'avanzamento viveva nel browser: ogni browser
aveva il suo cantiere, e un profilo nuovo ripartiva da zero mentre i TE
restavano. Con un mondo solo era un fastidio, con piu mondi sarebbe stato un
caos di cantieri divergenti.

**Il rovesciamento.** I blocchi posati non si salvano piu: si calcolano. Ogni
mondo conosce il costo dei suoi pezzi in ordine, e dato il credito sa quanti
ne puo pagare. E un conto, e lo stesso conto da lo stesso cantiere in ogni
browser. Nella verifica, un secondo profilo di Chrome mai usato ha mostrato
subito i 208 blocchi che il primo aveva appena posato, con lo stesso credito
residuo al TE e lo stesso pezzo successivo.

**Il registro.** Resta da ricordare poco, e lo ricorda il server in
`world/cantiere.json`: quale mondo riceve i token, e da quando. Il totale del
contatore viene diviso in tratti, un intervallo per ogni periodo in cui un
mondo e stato attivo; la pausa chiude un tratto, la ripresa ne apre un altro.
Quando un mondo completato cede il posto, il suo avanzo passa al nuovo. Per
ogni mondo si ricorda anche il punto piu alto raggiunto - un listino corretto
puo abbassare il totale, ma il cantiere non deve disfarsi - e quanto costa,
perche senza il costo l'avanzo non si calcola.

**Il server comincia a scrivere.** Fino a qui era di sola lettura. Ora accetta
due scritture, "scegli mondo" e "riporta avanzamento", con tre controlli: solo
dal computer locale, solo come JSON, solo dalla pagina della scena. Il secondo
non e un dettaglio: qualunque sito aperto nel browser puo mandare richieste a
`localhost`, ma non puo mandare JSON a un altro indirizzo senza chiederne il
permesso, e questo server il permesso non lo da mai.

**Quello che cambia per chi guarda.** Niente, quasi. *Riparti* non azzera piu
il credito, che non e della scena: rivede la costruzione dall'inizio. Il
credito regalato di `?dev` resta in quel browser e non tocca il registro, e
cosi si chiude un punto rimasto aperto da settimane: quel pulsante mescolava
credito vero e finto.

---

## 17. Un motore, piu mondi

Il codice era nato per un monumento solo, e lo diceva in ogni file: la scena
leggeva la latitudine di Atene, il pannello le fasi di Pericle, la camera
partiva puntata sul pianoro. Per ospitare la piana di Giza o il Foro Romano
bisognava separare quello che e di ogni mondo da quello che e dell'Acropoli.

**La linea di separazione.** Nel motore, `engine/`, va quello che e uguale
ovunque: il registro dei pezzi e la loro posa, il credito, il cielo, il
pannello, il ciclo della scena, lo stile. Nel mondo, `worlds/acropolis/`, va
quello che lo rende se stesso: le misure, gli edifici, il pianoro, il
terreno, le fasi, l'inquadratura, le parole della fine. Il motore espone una
funzione sola, `startWorld(mondo)`, e il mondo gliela chiama passando i suoi
pezzi. Il sole e un parametro: basta cambiare latitudine per stare a Giza.

**Il kit greco resta all'Acropoli.** Colonnati, trabeazioni e frontoni
potrebbero servire al Foro, che ha ordini suoi ma parenti. Estrarli adesso
avrebbe voluto dire indovinare di che forma ha bisogno un mondo che non
esiste ancora: si spostano quando il secondo mondo li chiede.

**I nomi in inglese.** Cartelle, file e campi dei dati sono passati
all'inglese, perche e la lingua in cui legge chi apre un repository, mentre
commenti, interfaccia e documentazione restano in italiano. La cartella dello
stato e diventata `state/` - `world/` si confondeva con `worlds/` - e il
registro `registry.json`. Chi aveva gia il progetto non deve fare niente: al
primo avvio il server sposta lo stato e converte il registro, compreso il
nome del mondo, da `acropoli` ad `acropolis`. Provata prima su una copia, la
migrazione ha conservato al TE il credito e i 208 blocchi raggiunti.

**`world.json`.** Ogni mondo ha un file di dati che il motore e la futura
pagina iniziale leggono: nome, luogo, epoca, descrizione, durata in
settimane, posizione del sole, stato - disponibile o in arrivo - e
un'anteprima. Il registro conosce i mondi da quei file, e rifiuta di
attivarne uno che non e ancora disponibile. La quota settimanale invece
esce dai mondi e va nel motore: dipende da chi lavora, non da dove.

**La prova della scena.** Fino a qui la scena la verificavo a mano, pilotando
Chrome dal protocollo di debug. Ora e un test, `npm run test:scene`: apre la
scena in un Chrome senza finestra, controlla che la radice porti al mondo,
che non ci siano errori, che un transcript nuovo diventi blocchi posati e che
il registro li ricordi. Dove Chrome non c'e, si salta e lo dice.

---

## 18. La scheda rimasta indietro

Due finestre sulla stessa Acropoli, e due cantieri diversi: in una la via
Panatenaica era a 48 lastre su 303, nell'altra a 239. Il conto vero, fatto
coi costi dei pezzi e col credito del registro, dava 289 blocchi e 50 lastre:
la prima aveva ragione, ed era solo ancora in corsa.

La seconda era una scheda aperta la mattina, prima della fase 1, mai
ricaricata. Eseguiva il codice di allora, quello del saldo tenuto nel
browser, che con piu schede aperte o dopo un *Riparti* poteva accreditare due
volte lo stesso credito. Con la fase 2 gli indirizzi del server erano
cambiati, e da li la scheda era rimasta scollegata del tutto: ma non lo
diceva, e continuava a posare blocchi con un saldo che si era gonfiata da
sola, quasi il doppio di quelli pagati.

Il difetto non era nel codice di oggi, ma nel modo di sparire. Due rimedi.
Il server dichiara in ogni risposta la versione dei file della scena, un'impronta
di nomi, dimensioni e date: una scheda che la vede cambiare sa che il suo
codice e vecchio, e si ricarica. E una scheda che non riceve risposte per tre
giri smette di sembrare collegata e scrive *scollegato dal cantiere*. Le
schede aperte prima di questa correzione non possono saperlo, perche il
codice che eseguono non lo prevede: quelle vanno ricaricate a mano, una volta.

---

## 19. La pagina iniziale

Con piu mondi serviva un posto da cui sceglierli. Le decisioni, prese prima di
scrivere: il nome provvisorio, TokenStone, va ovunque - pagina, app, file di
avvio - perche un'identita provvisoria ma coerente vale piu di nessuna; Giza e
il Foro compaiono gia, come "in arrivo", perche l'idea della piattaforma si
capisce solo vedendo piu di un mondo; le immagini delle schede sono scatti
della scena vera; e chi installa il progetto sceglie da se il primo mondo.

**Nessun mondo attivo, all'inizio.** Fino a qui un registro nuovo dava tutto
all'Acropoli. Ora parte vuoto: i TE si accumulano in attesa, e il primo mondo
scelto li riceve tutti, dall'installazione in poi. I registri gia esistenti
non cambiano.

**Visitare non e scegliere.** Si entra in qualunque mondo disponibile senza
cambiare quello che riceve i token. Scegliere e un gesto a parte, con una
conferma che dice cosa succede al credito: il mondo lasciato a meta va in
pausa e tiene tutto, quello compiuto passa il suo avanzo al nuovo.

**La dimostrazione.** Chi apre il progetto senza Claude Code, o vuole sapere
dove porta un mondo, guarda la costruzione intera in un minuto e mezzo, con la
camera che segue il cantiere fase per fase. Il credito e finto e resta nella
pagina: il registro non se ne accorge, e la prova lo verifica.

**Gli scatti.** La stessa scena, in un'altra modalita: tutto costruito, niente
pannelli, un'ora e un'inquadratura scelte dal mondo. Uno script la apre in
Chrome senza finestra e salva l'immagine della scheda. Il primo scatto aveva
meta immagine di cielo; il secondo guarda piu in basso, e il recinto riempie
la scheda. Una volta su due, all'inizio, il browser senza finestra si
inceppava al primo caricamento: lo script ora lo dice e riprova. Per Giza e il
Foro, che una scena ancora non l'hanno, due sagome disegnate a mano: le tre
piramidi con la Sfinge, un arco e le colonne di un tempio.

**I dollari in una nota.** La pagina mostra i TE. Il loro valore a prezzo di
listino sta sotto, piccolo, con una spiegazione: con un abbonamento non e
quello che si paga, ma il modo di pesare allo stesso modo i token di modelli
diversi. Mostrato in grande, "68 dollari" sarebbe stato letto come una spesa.

**La prova, come la farebbe una persona.** Il test della scena ora parte dalla
pagina iniziale: vede tre schede e l'invito a scegliere, preme *Comincia*,
conferma, entra nel mondo, lo guarda crescere con un transcript nuovo, torna
indietro e trova l'Acropoli in costruzione; poi la dimostrazione, che corre
senza toccare il registro.

---

## 20. Il modello dei mondi

Il motore separato dal mondo, la pagina iniziale, il registro: tutto era
pronto per un secondo mondo, ma l'unico esempio di mondo era l'Acropoli,
tremila pezzi e cinque file. Per cominciare la piana di Giza - o per chi,
scaricato il progetto, volesse costruire il suo - serviva un punto di
partenza piccolo.

**Un mondo minimo, ma vero.** `worlds/_template/` e una torre a gradoni su una
piazza lastricata, con un anello di alberi: centoquindici pezzi, tre fasi, un
file solo. Non e uno scheletro vuoto: si apre, si costruisce, ha la sua
dimostrazione. Ogni parte e commentata, perche e da li che si impara cosa
deve fornire un mondo. Il trattino basso nel nome lo tiene fuori dal registro
e dalla pagina iniziale.

**Il generatore.** `npm run new-world -- <id> "Nome"` copia il modello e
segna il mondo *in arrivo*. Per Giza, che ha gia il suo world.json, aggiunge
solo pagina e codice. Non sovrascrive mai un mondo che ha gia una pagina.

**La pagina di un mondo e sempre la stessa.** Nome, luogo, epoca, l'ora e la
data del sole: il motore li prende da world.json e li scrive negli elementi
segnati `data-world`. Un mondo nuovo non riscrive la sua pagina.

**Due cose salite nel motore.** Il generatore con seme, che l'Acropoli usava
per spargere alberi e offerte, serve a qualunque mondo che spargera qualcosa:
e passato in `engine/random.js`, identico riga per riga, perche cambiarlo
avrebbe spostato ogni albero del pianoro. E il dono iniziale: valeva 300 unita
di peso, che per l'Acropoli sono l'1% del mondo e per la torre di prova il
70%. Ora e una quota del budget, l'1,25%, uguale per tutti.

**La dimostrazione e il tempo vero.** Il motore tronca il tempo di ogni
fotogramma, perche un fotogramma lungo - dopo un cambio di scheda - non faccia
saltare la scena. Su un computer lento, coi fotogrammi radi, la dimostrazione
di 90 secondi diventava di tre minuti. In dimostrazione ora conta il tempo
vero. L'ha trovato la prova della scena, fallendo: misurava una velocita in un
Chrome senza finestra che disegna tremila pezzi col processore.

**La guida.** `docs/creare-un-mondo.md` porta dal modello alla pubblicazione:
world.json campo per campo, i pezzi e il loro ordine - che dopo la
pubblicazione non si cambia piu - i parametri del motore, come guardare il
mondo, come fargli l'immagine della scheda.

---

## 21. La torre di prova

Provare il modello voleva dire aspettare: anche in dimostrazione, novanta
secondi per vedere l'effetto di una modifica sono troppi. Due modalita per chi
sviluppa. `?demo=10` fa la dimostrazione in dieci secondi, o in quanti se ne
vogliono. In `?dev`, *Tutto in 10 s* finisce il mondo da dove si trova, con il
credito finto di `?dev`: il registro non se ne accorge.

**Il modello cambia faccia.** La torre a gradoni mostrava il meccanismo, ma
non i casi che un mondo vero incontra quasi subito. Al suo posto, una torre
copiata da una miniatura fantasy: un basamento quadrato col portale, un corpo
rotondo con due balconate, una torretta snella con la finestra a losanghe, una
lanterna e un tetto conico di scandole. Cinquecento pezzi che insegnano i muri
dritti e quelli rotondi a conci sfalsati, le aperture lasciate nei corsi, gli
archi fatti di conci veri - posati uno per uno, dentro un gruppo girato verso
la loro parete - le balconate, un tetto a filari.

**Guardarla, non solo scriverla.** La prima fotografia ha mostrato due errori
che il codice non diceva: i vani erano larghi il doppio degli archi che li
chiudevano, e la composizione era a specchio rispetto alla miniatura, con la
torretta nascosta dietro il corpo rotondo. Corretti, la seconda fotografia
somiglia all'originale: le balconate a sinistra, la torretta che sale a destra
col suo rigonfiamento.

**Una funzione che nessuno vede non esiste.** `?dev` e `?demo=10` si
trovavano solo sapendo cosa scrivere nell'indirizzo. Ora la pagina iniziale
ha, sotto i mondi, il laboratorio: la torre di prova con la sua fotografia e
quattro ingressi - guardarla in dieci secondi, aprirla in modalita sviluppo,
aprire cosi anche l'Acropoli, leggere la guida. La guida si apre nel
browser: il server ora manda i file `.md` come testo semplice, invece di
farli scaricare. E `npm run previews -- _template` fotografa anche la torre,
che nell'elenco dei mondi non c'e. La guida, che ora chi visita apre con un
clic, e in inglese, con la versione italiana sotto.

---

## 22. La settimana misurata

Il prezzo dei blocchi dipende da una sola grandezza: quanti TE vale il 100%
della quota settimanale di Claude Code. Non e un dato pubblico, quindi si
misura: la percentuale di /usage, l'ora del reset, e il contatore che sa
quanti TE sono caduti da allora.

La prima misura, il 5 ottobre, aveva dato 31 milioni, ma era sporca: quella
settimana si era usato anche claude.ai, che consuma la stessa quota senza
lasciare transcript. Cosi la settimana dopo e stata tenuta pulita, solo
Claude Code, con due letture nella stessa settimana, il 7 ottobre: 12% la
mattina con 7.729.500 TE, 19% il pomeriggio con 12.681.526, ognuna col totale
da inizio settimana.
/usage arrotonda all'intero, quindi ogni lettura e un intervallo - 61,8-67,2
milioni la prima, 65,0-68,5 la seconda - e il valore vero sta dove si
sovrappongono, fra 65,0 e 67,2. Nel progetto: 66 milioni.

Il valore vecchio era la meta di quello vero, e i prezzi raddoppiano: un
rocchio passa da 21.800 a 46.000 TE, e l'Acropoli intera vale 283 milioni.
I blocchi gia posati restano dove sono - il cantiere non arretra mai - ma il
credito non li copre piu tutti: il cantiere si ferma finche i token non
recuperano il prezzo nuovo, e poi riprende.

Il pannello pero lo diceva male: il credito sotto zero, -8,4 milioni di TE,
sembrava un debito. Ora, quando i blocchi posati costano piu del credito,
il pannello scrive *Mancano* e quanti TE servono perche il cantiere riparta,
con una riga che spiega che i prezzi sono saliti.

---

## 23. La mappa del progetto

Il progetto e cresciuto abbastanza perche rileggerlo costi: ogni sessione che
parte da zero spende contesto - cioe token - per ritrovare dove sta cosa. Con
graphify il progetto ha ora una mappa: codice, documenti e immagini diventano
un grafo di 615 nodi e 1.059 collegamenti, raggruppati in 33 comunita - gli
edifici dell'Acropoli, il contatore, il registro, il diario, la pagina
iniziale. `CLAUDE.md` dice di interrogare il grafo prima di aprire i file.

Il codice lo legge graphify da solo, senza modelli. Documenti e immagini
invece vanno capiti: doveva farlo Gemini, gratis, ma il piano gratuito si e
fermato a venti richieste al giorno, e il lavoro l'hanno fatto sei subagenti
di Claude - circa 394.000 token, finiti anche loro nel cantiere.

La mappa ha trovato subito un errore vero: il subagente del listino citava
ancora `world/world-state.json`, il percorso di prima dello spostamento in
`state/`. E un collegamento "ambiguo" fra il listino e il TODO, segnalato
proprio perche non tornava.

Gli hook che graphify aggiunge per ricordare di usare il grafo puntano
all'installazione di questo computer: stanno nelle impostazioni locali, non
nel repository. E prima di pubblicare va pulito un nodo che porta nel nome
il percorso completo della cartella.

---

## 24. Il terreno sopra il marmo

Da vicino la via Panatenaica non era una strada: le lastre andavano a
zig-zag, e fra l'una e l'altra passava la sabbia. La causa era un segno.
L'angolo della strada si misurava con `atan2` sul piano x-z, dove z cresce
verso sud, mentre la rotazione di three gira nel verso opposto: ogni lastra
stava nel punto giusto, ma girata a specchio. Sui tratti dritti quasi non si
vedeva; sulle curve, dove l'angolo e grande, si.

C'era anche un secondo errore, piu nascosto. La pendenza del terreno si
applicava come se il pezzo non fosse girato, e la rotazione arrivava dopo:
un pezzo girato si inclinava sulla pendenza sbagliata e un suo bordo
affondava. Ora `layOnGround` riceve l'orientamento e misura la pendenza
lungo gli assi del pezzo gia girato. Le lastre poi sporgono di 22 cm
invece di 15, e il terreno non le copre piu.

Guardando meglio e venuto fuori il resto. Il pianoro ondula di un metro
abbondante, e sotto il Partenone l'onda arrivava a 94 cm: copriva il primo
gradino e meta del secondo. Lo stesso, in piccolo, sotto l'Athena Promachos
e l'altare. Ma i Greci non posavano un tempio su un'onda: tagliavano la
roccia e riempivano fino a un piano. Cosi il terreno ha ora dei piani
spianati (`PADS`), uno per edificio, raccordati al pianoro in pochi metri.

Niente di questo cambia l'ordine dei pezzi o i loro prezzi: il registro
resta valido, e i blocchi gia posati si rimettono dove erano, solo meglio
appoggiati. Restava un caso, l'Eretteo: il suo portico nord stava 2,8 m piu
in basso, come in realta, ma il terreno davanti non scendeva, e le colonne
sembravano affondate.

---

## 25. L'Eretteo allo specchio

Il portico affondato era solo il sintomo. L'Eretteo e costruito nel suo
sistema locale e poi girato di novanta gradi; con quella rotazione l'asse x
locale positivo punta a nord. Il portico nord era stato messo a x negativo:
cioe a sud. E la loggia delle Cariatidi, che guarda il Partenone, guardava
invece le mura. Tutto il tempio era allo specchio.

E non solo: era quasi attaccato al Partenone, poco piu di un metro fra i
gradini dei due. Il portico nord, girato a sud, finiva dentro l'angolo
nord-ovest del Partenone, col pavimento sepolto 2,8 m sotto il suo piano.
Nella realta fra i due templi ci sono decine di metri, e in mezzo stavano le
fondazioni del tempio arcaico di Atena.

Girare i portici non bastava: le Cariatidi sarebbero finite contro il
Partenone. Cosi l'Eretteo si e spostato di dodici metri a nord e nove a
ovest, piu vicino alle mura settentrionali, dov'era; l'ulivo sacro lo ha
seguito nel Pandroseion, il recinto a ovest del tempio. Il portico nord ora
ha davanti le sue quattro colonne e scende sul terrazzo piu basso, e fra i
due piani c'e un gradino di roccia di 3,2 m: roccia, non pezzi, quindi non
costa niente. Le Cariatidi stanno quattro davanti e due dietro, verso sud.

Ordine e numero dei pezzi non cambiano. Cambia invece la disposizione degli
ulivi e dei mirti gia piantati: sono sparsi a caso con un seme fisso, ma
evitano gli ingombri degli edifici, e l'ingombro dell'Eretteo si e spostato.

---

## 26. Il colore oltre le campiture

La lista della fase 5 l'abbiamo decisa insieme: ornati dipinti, sculture
dei frontoni, il fregio del Partenone, le prestazioni. In quest'ordine, con
le prestazioni per ultime, per misurare anche il peso di quello che si
aggiunge.

Il primo passo e il colore. Fin qui la policromia era fatta di campiture:
triglifi blu, fondi rossi, anuli in minio. Ma le modanature portavano motivi
ripetuti, e sono quelli che fanno leggere un edificio greco da lontano. Ora
i geison hanno la foglia d'acqua e sotto il meandro; le cornici rampanti la
foglia d'acqua; gli architravi ionici e gli echini dei capitelli l'ovolo;
lungo le gronde corre la fila delle antefisse a palmetta, e in cima ai
frontoni stanno gli acroteri. I motivi sono disegnati una volta su piccole
tele e ripetuti come strisce sottili davanti ai blocchi: nessun pezzo nuovo,
nessun prezzo cambiato. Il motore, quando fonde i pezzi posati, ora
conserva le coordinate di texture, che prima scartava.

Cercando dove appoggiare le antefisse e venuto fuori un altro errore di
segno, gemello di quello delle lastre: le file di tegole pendevano al
contrario, e il tetto era una serie di listelli con le fessure in mezzo.
Ora e pieno.

---

## 27. Chi sta nei frontoni

Le sei figure di ogni frontone erano corpi generici - in piedi al centro,
sedute a meta, distese negli angoli - e da terra non dicevano niente. Un
frontone greco si leggeva dagli attributi. Ora a ovest Atena, con l'elmo,
la lancia e lo scudo, e Poseidone, con il tridente, si allontanano in una V,
e fra loro cresce l'ulivo che vince la contesa per l'Attica; ai lati
Cecrope col suo serpente e i cavalli del carro di Poseidone, negli angoli i
due fiumi. A est Zeus in trono, Atena appena nata e gia armata, Dioniso e
le dee sedute, e negli angoli le teste dei cavalli del Sole che sorge e
della Luna che tramonta. Il pannello del cantiere li chiama per nome.

Guardando il frontone est e venuto fuori perche fosse sempre sembrato
vuoto: le figure stavano sulla faccia interna della lastra del timpano. A
ovest quella faccia e anche l'esterna, a est no, e le statue erano dentro
il tempio. Ora stanno tutte sul piano del geison, davanti al timpano.

---

## 28. Il fregio che arriva per ultimo

Il fregio ionico delle Panatenee mancava del tutto: centosessanta metri di
processione in cima ai muri della cella. Ora c'e, con il suo programma:
dall'angolo sud-ovest i cortei corrono lungo i due fianchi verso est -
cavalieri, carri, anziani e musici, in testa le vittime - e sulla fronte
est le fanciulle arrivano dai due lati davanti agli dei seduti, mentre al
centro si consegna il peplo. Ogni scena e disegnata una volta su una tela e
ripetuta sulle lastre del suo tratto, a specchio quando il corteo va verso
sinistra.

E il primo caso della regola scritta nella guida dei mondi: dopo la
pubblicazione i pezzi nuovi si aggiungono in fondo. Il registro conta "i
primi N pezzi", e i 568 gia posati devono restare quelli. Cosi il fregio,
scolpito fra il 442 e il 438, si posa per ultimo, dopo le offerte votive,
in una fase sua. Il mondo passa da 3280 a 3326 pezzi; il budget resta lo
stesso, e ogni pezzo costa un poco meno.

Una scelta contro la storia: il fregio vero stava a filo dell'architrave
esterno, e da terra se ne vedeva appena una striscia. Ma la camera di
questo cantiere non scende sotto i ventidue metri, e un fregio invisibile
non racconta niente: e stato abbassato di 75 cm, con le colonne dei due
portici, e ora si legge fra le colonne del peristilio.

---

## 29. Misurare prima di alleggerire

L'ultimo punto della fase 5 erano le prestazioni, e si e cominciato
misurando. Le draw call erano gia poche, circa 160, perche ogni fase chiusa
si fonde in una geometria per materiale. I triangoli, a cantiere completo,
sono 420.000: due terzi nelle colonne e nei muri, 80.000 nel terreno. Per
una scheda grafica vera non e molto.

Su un computer debole costano invece i pixel, e due abitudini del motore.
La scena si disegnava fino a 1,75 volte la risoluzione dello schermo,
sempre. La mappa delle ombre, 4096 per 4096, si ridisegnava a ogni blocco
che atterrava: quando il cantiere smaltisce una coda, una quindicina di
volte al secondo. E a cantiere fermo si disegnavano comunque sessanta
fotogrammi al secondo per una camera che gira di un grado e mezzo.

Cosi ora il motore si regola da solo. Se i fotogrammi scendono sotto i 33
al secondo, la risoluzione cala a gradini, e dal terzo gradino anche la
mappa delle ombre; se abbondano, risale, e il gradino si ricorda. Le ombre
si rifanno al massimo ogni 160 ms. A riposo si disegna un fotogramma su
due.

Una cosa questa sessione non ha potuto misurare: il browser di prova emula
la scheda grafica sul processore, dove pesano i triangoli e non i pixel.
Li le due versioni vanno uguali, e la qualita adattiva scende fino in fondo
come deve. Il guadagno vero va provato su un computer vero.

---

## 30. Il piano di ognuno

Prima di farlo provare agli amici e venuto fuori un conto che non tornava. I
66 milioni di TE della settimana sono stati misurati su un abbonamento Pro:
chi ha Max 5x ne consuma cinque volte tanti, e con i prezzi di Pro
finirebbe l'Acropoli in meno di una settimana. Chi avesse un piano piu
piccolo del valore scritto nel codice, al contrario, non la finirebbe mai.

Cosi il valore della settimana non sta piu nel codice ma nell'installazione.
I piani stanno in `engine/plans.json`: Pro misurato, Max 5x e Max 20x in
proporzione, cinque e venti volte, come Anthropic li dichiara rispetto a
Pro. Al primo avvio la pagina iniziale chiede il piano prima di ogni altra
cosa, e non lo si salta con Esc; il registro lo ricorda; la scena lo legge
prima di fissare i prezzi. Cambiarlo dopo ricalcola tutto, e la finestra lo
dice: i blocchi posati restano, ma con un piano piu grande il cantiere
aspetta.

Un mondo dura cosi lo stesso numero di settimane per tutti. E' l'idea del
progetto: non conta quanto si spende, conta quanto si lavora.

---

## 31. Per chi prova

Gli amici che proveranno TokenStone non avranno questa conversazione alle
spalle. Per loro c'e `docs/prova.md`: cosa serve, come si installa sui tre
sistemi, il primo avvio, come si aggiorna, una lista di cose da provare e
come dire cosa non va. Le segnalazioni passano dalle Issues di GitHub, con
due modelli - "qualcosa non funziona" e "impressioni" - o da un messaggio,
che va benissimo lo stesso.

Per i problemi c'e `npm run diagnosi`: le versioni di TokenStone, di Node,
di Claude Code e del sistema, cosa sa il contatore e cosa ricorda il
registro, le ultime righe del suo diario. Senza niente di personale: niente
nomi di progetti ne di sessioni, e la cartella dell'utente diventa ~. Una
prova lo controlla, dandole uno stato con un nome di progetto finto e
verificando che non esca.

E il grafo: graphify chiamava un nodo col percorso completo di questo
computer - la funzione `$()` di `home/home.js`, che senza lettere nel nome
coincideva con il file. Ora `npm run graph` aggiorna il grafo e lo ripulisce,
e la cache delle estrazioni, piena di percorsi, resta fuori dal repository.

---

## 32. Cosa resta da fare

*Al 16 ottobre 2026, a fase 5 chiusa.*

**Due mondi.** La piana di Giza e il Foro Romano sono annunciati nella
pagina iniziale, ma non costruiti. Si faranno dopo.

**Prima di farlo provare.** Il piano di ognuno c'e (capitolo 30). Servono
ancora un modo di consegnare il progetto a chi lo prova, le prove su macOS e
Linux, e un modo di raccogliere quello che ne pensa: e la fase T del TODO.

**Prima di pubblicarlo.** Licenza e attribuzioni alle fonti, il README per
GitHub con le immagini, il nome definitivo, e la pulizia del grafo, che in
un nodo porta il percorso di questo computer.

**Piu avanti.** Le sculture fotogrammetrate del Museo dell'Acropoli
(`setSculptureProvider()` e pronto); l'HDRI al posto del cielo analitico;
`npx tokenstone`, per provarlo senza clonarlo.
