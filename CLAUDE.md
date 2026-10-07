# TokenStone

Mondi da costruire coi token consumati in Claude Code; il primo e l'Acropoli
di Pericle, in three.js. Node 18 o successivo, nessuna dipendenza. TokenStone
e un nome provvisorio.

- `npm start` avvia la scena col contatore dentro; `npm test` controlla il
  listino ed esegue i test del contatore, del registro e del server;
  `npm run test:scene` prova pagina iniziale e scena in Chrome senza finestra;
  `npm run previews` rifa le immagini delle schede dei mondi.
- Il motore e in `engine/`, comune a tutti i mondi; ogni mondo sta in
  `worlds/<id>/` con il suo `world.json`. Quello che vale per un mondo solo
  non va nel motore. La pagina iniziale e `index.html` con `home/`.
- Un mondo nuovo si comincia con `npm run new-world -- <id> "Nome"`, dal
  modello `worlds/_template/`; la guida e `docs/creare-un-mondo.md`. Quello che
  si sparge a caso usa `seeded` di `engine/random.js`, mai `Math.random`.
- I testi che l'utente legge hanno gli accenti (è, più, così); i commenti del
  codice possono farne a meno.
- Nomi di cartelle, file, funzioni e campi dei dati in inglese; commenti, testi
  dell'interfaccia e documentazione in italiano.
- Non cambiare l'ordine dei pezzi ne il seme dei generatori in
  `worlds/acropolis/src/site.js`:
  il cantiere e "i primi N pezzi dell'elenco", e il registro
  (`state/registry.json`) ricorda N.
- Il registro non si modifica a mano: passa da `/api/registry` o da
  `tools/registry.js`, che hanno i controlli.
- Il contatore legge dai transcript solo `message.usage`, il modello,
  l'orario e la cartella di lavoro. Non fargli leggere il testo dei messaggi.
- `docs/conversazione.md` e il diario delle decisioni: quando una scelta
  cambia, si aggiunge un capitolo, non si riscrivono quelli vecchi.

## Listino dei prezzi

Quando inizi a lavorare in questo progetto, guarda `unknown_models` in
`state/world-state.json`. Se non e vuoto, il cantiere sta stimando dei prezzi:
dillo all'utente e proponi di lanciare il subagente `aggiorna-listino`.

`tools/token-counter/pricing.json` non si modifica a mano ne senza
l'approvazione dell'utente: passa sempre dal subagente, che prima propone e
poi, con il via libera, applica. `tools/token-counter/test/pricing-test.json`
non si tocca mai.
