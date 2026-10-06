# Acropoli

Scena three.js che costruisce l'Acropoli di Pericle coi token consumati in
Claude Code. Node 18 o successivo, nessuna dipendenza.

- `npm start` avvia la scena col contatore dentro; `npm test` controlla il
  listino ed esegue i test del contatore e del server.
- Commenti, testi dell'interfaccia e documentazione sono in italiano.
- Non cambiare l'ordine dei pezzi ne il seme dei generatori in `src/site.js`:
  il cantiere e "i primi N pezzi dell'elenco", e il registro
  (`world/cantiere.json`) ricorda N.
- Il registro non si modifica a mano: passa da `/api/cantiere` o da
  `tools/cantiere.js`, che hanno i controlli.
- Il contatore legge dai transcript solo `message.usage`, il modello,
  l'orario e la cartella di lavoro. Non fargli leggere il testo dei messaggi.
- `docs/conversazione.md` e il diario delle decisioni: quando una scelta
  cambia, si aggiunge un capitolo, non si riscrivono quelli vecchi.

## Listino dei prezzi

Quando inizi a lavorare in questo progetto, guarda `unknown_models` in
`world/world-state.json`. Se non e vuoto, il cantiere sta stimando dei prezzi:
dillo all'utente e proponi di lanciare il subagente `aggiorna-listino`.

`tools/token-counter/pricing.json` non si modifica a mano ne senza
l'approvazione dell'utente: passa sempre dal subagente, che prima propone e
poi, con il via libera, applica. `tools/token-counter/test/pricing-test.json`
non si tocca mai.
