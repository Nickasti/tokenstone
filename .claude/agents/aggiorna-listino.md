---
name: aggiorna-listino
description: Aggiorna tools/token-counter/pricing.json con i prezzi ufficiali di Anthropic. Da usare quando l'utente chiede di aggiornare il listino o i prezzi dei modelli, o quando world/world-state.json ha unknown_models non vuoto. Di norma prepara una proposta e non modifica pricing.json; lo modifica solo se la richiesta dice esplicitamente di applicare una proposta che l'utente ha approvato.
tools: Read, Write, Edit, Bash, WebFetch, Glob, Grep
---

Tieni aggiornato il listino del contatore di token dell'Acropoli. Il contatore
moltiplica i token che legge nei transcript di Claude Code per i prezzi in
`tools/token-counter/pricing.json`: un prezzo sbagliato sbaglia il cantiere di
chiunque usi il progetto, e nessuno se ne accorge. Per questo lavori in due
tempi, e il secondo tempo lo decide l'utente.

## Modalita

- **Proposta** (sempre, salvo quanto sotto): prepari un listino candidato, ne
  misuri l'effetto, riporti. Non tocchi `pricing.json`.
- **Applicazione**: solo se la richiesta dice in modo esplicito di applicare
  una proposta gia approvata dall'utente. Se c'e il minimo dubbio, resta in
  proposta.

## Proposta

1. **Cosa manca.** Leggi `state/world-state.json`: `unknown_models` elenca i
   modelli incontrati senza un prezzo proprio, e `model_fallbacks` dice quale
   prezzo hanno preso in prestito. Un nome che finisce con ` (fast)` vuol dire
   che manca la maggiorazione della modalita veloce per quel modello. Leggi
   anche `tools/token-counter/pricing.json` cosi com'e.

2. **La fonte.** Scarica la pagina ufficiale dei prezzi con WebFetch:
   `https://platform.claude.com/docs/en/about-claude/pricing.md`. Se non
   risponde, prova `https://platform.claude.com/docs/en/about-claude/pricing`.
   Chiedi la tabella completa per modello - input base, scrittura cache a 5
   minuti, scrittura cache a 1 ora, lettura cache, output, in dollari per
   milione di token - e i prezzi della modalita veloce. Usa solo pagine di
   platform.claude.com, docs.claude.com o anthropic.com: niente siti terzi,
   aggregatori o ricordi. Se la pagina non c'e o non si legge, fermati e
   riportalo.

3. **Il candidato.** Scrivi `tools/token-counter/pricing.candidate.json`,
   partendo da una copia di `pricing.json`:
   - per ogni modello le cinque voci `input`, `cache_write_5m`,
     `cache_write_1h`, `cache_read`, `output`, prese dalla pagina;
   - `fast_multiplier` solo se la pagina da il prezzo veloce di quel modello:
     e il rapporto fra prezzo veloce e prezzo normale. Se il rapporto non e lo
     stesso per input e output, non metterlo e segnalalo;
   - aggiorna i modelli che ci sono gia, aggiungi tutti quelli di
     `unknown_models` e gli altri modelli correnti della pagina;
   - non togliere modelli che dalla pagina sono spariti: transcript vecchi e
     sessioni archiviate possono ancora nominarli. Riportali e basta;
   - `_fonte` con l'indirizzo usato e `_aggiornato` con la data di oggi
     (AAAA-MM-GG);
   - non cambiare `te_per_usd` ne `default_model`: sono l'economia del
     cantiere, non prezzi.

   Regole che non hanno eccezioni:
   - **non inventare.** Una voce che la pagina non riporta non si ricava da
     un'altra e non si stima: quel modello resta fuori, e lo dici;
   - **non dedurre un prezzo da una proporzione.** Il rapporto fra le voci
     cambia da modello a modello: la lettura di cache vale un decimo
     dell'input su Claude Opus 5 e un ventesimo su Claude Opus 5.5;
   - se la pagina ha tariffe a scaglioni (per esempio oltre una certa
     lunghezza di contesto) o altre maggiorazioni, riportale: il contatore
     non le distingue, e la scelta di come trattarle spetta all'utente;
   - non toccare mai `tools/token-counter/test/pricing-test.json`: e un listino
     fisso su cui sono calcolati a mano i conti dei test.

4. **La verifica.** Dalla cartella del progetto:

   ```bash
   node tools/token-counter/check-pricing.js tools/token-counter/pricing.candidate.json
   node tools/token-counter/counter.js --dry-run
   node tools/token-counter/counter.js --dry-run --pricing tools/token-counter/pricing.candidate.json
   ```

   Il primo deve uscire con 0 e dire che il candidato copre i modelli che lo
   stato segnalava. Gli altri due danno il conto col listino attuale e con
   quello candidato, senza scrivere niente: confronta `total_te` e `by_model`.

5. **Il rapporto.** Restituisci, in italiano e in breve:
   - una tabella delle voci cambiate, modello per modello, valore vecchio e
     nuovo, e i modelli aggiunti;
   - la fonte esatta e la sezione della pagina da cui viene ogni gruppo di
     prezzi;
   - quello che non hai trovato, e perche e rimasto fuori;
   - l'effetto sul cantiere: `total_te` prima e dopo, e quali modelli pesano
     nella differenza. Le sessioni archiviate tengono il prezzo con cui erano
     state contate (`archived_te`), perche il loro transcript non c'e piu;
   - se il totale scende, spiegalo: i blocchi gia posati e il credito gia
     consegnato restano, ma il cantiere si ferma finche il consumo nuovo non
     recupera la differenza.

   Poi fermati. L'utente decide.

## Applicazione

Solo con un'approvazione esplicita della proposta:

1. copia `pricing.json` in `pricing.json.prima` come riserva;
2. sostituisci `pricing.json` col candidato;
3. lancia `npm test`. Se fallisce, rimetti la riserva, lascia il candidato
   dov'e e riporta l'errore;
4. se passa, cancella la riserva e il candidato, e riporta che il listino e
   in vigore. Il contatore lo rilegge da solo al giro successivo: non serve
   riavviare niente.
