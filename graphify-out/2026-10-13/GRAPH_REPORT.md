# Graph Report - .  (2026-10-13)

## Corpus Check
- 58 files · ~61,906 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 615 nodes · 1059 edges · 33 communities (29 shown, 4 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.75)
- Token cost: 394,093 input · 1,500 output

## Community Hubs (Navigation)
- Edifici dell'Acropoli
- Credito e pannello della scena
- Contatore dei token
- Server e migrazione
- Test del contatore
- Scelte di progetto del cantiere
- Registro dei mondi
- Chrome senza finestra e scatti
- Diario: fonti e raffinatezze
- Torre di prova (codice)
- Generatore di icone
- README: mondi e resa
- Test del server
- Diario: conto dei token
- Pagina iniziale (codice)
- package.json e script
- Test del generatore
- Pagine scena e laboratorio
- Regole di CLAUDE.md
- Pagina iniziale e decisioni
- Generatore di mondi
- Agente del listino
- Anteprima Acropoli
- Icone dell'app
- Token equivalenti e misura
- Sagome Giza e Foro
- Anteprima torre di prova
- Fregio e sculture mancanti
- Avvio Linux
- Modalita dev
- Ulivo sacro

## God Nodes (most connected - your core abstractions)
1. `mk()` - 30 edges
2. `box()` - 24 edges
3. `G()` - 16 edges
4. `scanOnce()` - 15 edges
5. `colonnade()` - 15 edges
6. `buildAll()` - 14 edges
7. `parthenon()` - 13 edges
8. `TODO TokenStone: piano a fasi` - 13 edges
9. `walls()` - 12 edges
10. `votives()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Subagente aggiorna-listino` --conceptually_related_to--> `TODO TokenStone: piano a fasi`  [AMBIGUOUS]
  .claude/agents/aggiorna-listino.md → TODO.md
- `bakePhase()` --indirect_call--> `mesh()`  [INFERRED]
  engine/pieces.js → worlds/_template/src/main.js
- `Fase 5: rifiniture dell'Acropoli` --references--> `Mondo: Acropoli di Pericle`  [INFERRED]
  TODO.md → README.md
- `worlds/acropolis/index.html (pagina scena Acropoli)` --implements--> `Mondo: Acropoli di Pericle`  [INFERRED]
  worlds/acropolis/index.html → README.md
- `CLAUDE.md istruzioni progetto` --references--> `Privacy: solo message.usage, modello, orario, cartella`  [INFERRED]
  CLAUDE.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Parthenon optical refinements** — docs_conversazione_optical_refinements, docs_conversazione_stylobate_curvature, docs_conversazione_column_inclination, docs_conversazione_corner_column_thickening, docs_conversazione_angle_contraction [EXTRACTED 1.00]
- **Token accounting pipeline (transcripts to TE to building credit)** — docs_conversazione_transcript_counter, docs_conversazione_pricing_list, docs_conversazione_token_equivalent, docs_conversazione_weekly_quota_scale, docs_conversazione_cost_weights, docs_conversazione_credit_derived_progress, docs_conversazione_registry [INFERRED 0.85]
- **World authoring workflow** — docs_creare_un_mondo_new_world_command, docs_creare_un_mondo_world_json_schema, docs_creare_un_mondo_addpiece, docs_creare_un_mondo_startworld, docs_creare_un_mondo_view_modes, docs_creare_un_mondo_previews_command, docs_creare_un_mondo_publish_steps [EXTRACTED 1.00]
- **Governance del listino prezzi (proposta, approvazione, applicazione)** — claude_controllo_unknown_models, _claude_agents_aggiorna_listino, _claude_agents_aggiorna_listino_modalita_proposta, _claude_agents_aggiorna_listino_modalita_applicazione, readme_unknown_models, readme_listino_prezzi_modelli [EXTRACTED 1.00]
- **Dai token ai blocchi posati** — readme_contatore_di_token, readme_token_equivalenti, readme_registro_dei_mondi, readme_prezzo_pezzi_pesi_relativi, readme_cantiere_calcolato_dal_credito [EXTRACTED 1.00]
- **Guscio comune delle pagine scena (dock, boot handler, service worker)** — worlds__template_index, worlds_acropolis_index, worlds_acropolis_index_scene_dock, worlds__template_index_fallito, worlds_acropolis_index_fallito [INFERRED 0.85]
- **PWA / home-screen icon set derived from the temple logo** — assets_icons_icon, assets_icons_icon_192, assets_icons_icon_512, assets_icons_icon_maskable_512, assets_icons_apple_touch_icon [INFERRED 0.85]
- **Stacked Tower Composition (base, turret, balconies, roof)** — worlds__template_preview_square_base, worlds__template_preview_cylindrical_turret, worlds__template_preview_spiral_balconies, worlds__template_preview_conical_roof [INFERRED 0.85]
- **Acropolis sacred precinct layout on hilltop plateau** — worlds_acropolis_preview_parthenon_temple, worlds_acropolis_preview_erechtheion_building, worlds_acropolis_preview_propylaea_complex, worlds_acropolis_preview_athena_statue, worlds_acropolis_preview_processional_way, worlds_acropolis_preview_hilltop_terrain [INFERRED 0.85]

## Communities (33 total, 4 thin omitted)

### Community 0 - "Edifici dell'Acropoli"
Cohesion: 0.10
Nodes (69): buildAll(), erechtheion(), nike(), parthenon(), promachos(), propylaea(), siteGroup(), COST (+61 more)

### Community 1 - "Credito e pannello della scena"
Cohesion: 0.07
Nodes (24): CreditSource, fmt(), bakePhase(), counters, GHOST, initPieces(), mergedByPhase, mergeList() (+16 more)

### Community 2 - "Contatore dei token"
Cohesion: 0.08
Nodes (49): errors, file, fs, ids, missing, path, { validatePricing, PRICING_PATH, STATE_PATH }, acquireLock() (+41 more)

### Community 3 - "Server e migrazione"
Cohesion: 0.06
Nodes (43): fs, migrateLegacyState(), MOVES, path, ROOT, CLIENT_PATHS, clientVersion, counter (+35 more)

### Community 4 - "Test del contatore"
Cohesion: 0.05
Nodes (37): A, alfa, assente, ATTESO, avvio, B, C, CHECK (+29 more)

### Community 5 - "Scelte di progetto del cantiere"
Cohesion: 0.08
Nodes (32): Altar of Athena Polias, Analytic sky (Rayleigh + Mie scattering, PMREMGenerator IBL), Anathemata (74 votive offerings, rejection sampling), Bedrock is free, everything carried up is paid, COST as relative weights, not prices, Progress computed from credit (not saved), Demo mode (?demo, real-time clock), Determinism via fixed-seed generator (+24 more)

### Community 6 - "Registro dei mondi"
Cohesion: 0.11
Nodes (28): BACKUP_PATH, choose(), completed(), counter, creditOf(), fs, knownWorld(), LEGACY_IDS (+20 more)

### Community 7 - "Chrome senza finestra e scatti"
Cohesion: 0.10
Nodes (23): attendi(), connect(), findBrowser(), fs, launch(), path, { spawn, spawnSync }, waitFor() (+15 more)

### Community 8 - "Diario: fonti e raffinatezze"
Cohesion: 0.08
Nodes (25): Come è nato questo progetto (conversazione.md), ancientathens3d.com (Dimitris Tsalkanis), Angle contraction of corner intercolumniations, bakePhase() mesh merging, Brauronion and Chalkotheke, Column inward inclination (1:171, per-face), Thicker corner columns (1.945 vs 1.905 m), Erechtheion frieze inlay (friezeMat in entablature()) (+17 more)

### Community 9 - "Torre di prova (codice)"
Cohesion: 0.19
Nodes (21): arch(), balcony(), BASE, BODY, build(), COST, crown(), curveCache (+13 more)

### Community 10 - "Generatore di icone"
Cohesion: 0.12
Nodes (19): base, chunk(), colorAt(), CRC, crc32(), files, fs, hex() (+11 more)

### Community 11 - "README: mondi e resa"
Cohesion: 0.16
Nodes (16): README TokenStone, Mondo: Acropoli di Pericle, Prestazioni: bakePhase e ombre su posa, Mondo in arrivo: Foro Romano, HDRI al posto del cielo analitico (useHDRI), Mondo in arrivo: Piana di Giza, Policromia (POLYCHROMY), Raffinatezze ottiche (REFINEMENTS) (+8 more)

### Community 12 - "Test del server"
Cohesion: 0.12
Nodes (11): fs, http, net, os, path, PRICING, PROJECTS, SERVER (+3 more)

### Community 13 - "Diario: conto dei token"
Cohesion: 0.14
Nodes (15): aggiorna-listino subagent (propose then apply), Hookless scanning of ~/.claude/projects, installed_at: start from zero, Double-click launchers and PWA service worker, Single language: Node server with in-process counter, Pricing list (pricing.json, unknown_models, model_fallbacks, fast_multiplier), Recompute, never sum (idempotent counter), Server security (localhost only, no traversal/hidden files, JSON-only writes) (+7 more)

### Community 14 - "Pagina iniziale (codice)"
Cohesion: 0.40
Nodes (12): $(), card(), conferma(), durata(), el(), fmt(), load(), nome() (+4 more)

### Community 15 - "package.json e script"
Cohesion: 0.15
Nodes (12): description, engines, node, name, private, scripts, new-world, previews (+4 more)

### Community 16 - "Test del generatore"
Cohesion: 0.15
Nodes (9): fs, giza, m, NEW_WORLD, os, path, r, { spawnSync } (+1 more)

### Community 17 - "Pagine scena e laboratorio"
Cohesion: 0.24
Nodes (12): Sezione laboratorio (#lab), offline.html (TokenStone spento), TokenStone come app installabile (PWA), Avvio a doppio clic (TokenStone.cmd / .command / tokenstone.sh), Il laboratorio (torre di prova), Modalita sviluppo (?dev), Fase 4: il modello per i mondi nuovi, worlds/_template/index.html (pagina scena del modello) (+4 more)

### Community 18 - "Regole di CLAUDE.md"
Cohesion: 0.22
Nodes (11): CLAUDE.md istruzioni progetto, docs/conversazione.md come diario delle decisioni (append-only), Regola: cio che vale per un mondo solo non va nel motore, Il registro non si modifica a mano, I blocchi posati si calcolano, non si salvano, Ordine dei pezzi e generatore con seme fisso, Registro dei mondi (state/registry.json), Scritture del registro solo locali, JSON, da pagine TokenStone (+3 more)

### Community 19 - "Pagina iniziale e decisioni"
Cohesion: 0.20
Nodes (10): Convenzione: nomi in inglese, testi in italiano, index.html (pagina iniziale TokenStone), Dialogo di conferma cambio mondo (#confirm), Griglia dei mondi (#worlds), Modalita dimostrativa (?demo), Pausa e avanzo del credito, Privacy: solo message.usage, modello, orario, cartella, Ricarica automatica su nuova versione / scollegato dal cantiere (+2 more)

### Community 20 - "Generatore di mondi"
Cohesion: 0.20
Nodes (8): announced, dir, fs, [id, name], metaPath, path, ROOT, TEMPLATE

### Community 21 - "Agente del listino"
Cohesion: 0.33
Nodes (9): Subagente aggiorna-listino, Modalita applicazione (con rollback), Modalita proposta (listino candidato), pricing.candidate.json, Regole: non inventare, non dedurre da proporzioni, Controllo unknown_models a inizio lavoro, Listino prezzi modelli (pricing.json), Quando un prezzo scende (+1 more)

### Community 22 - "Anteprima Acropoli"
Cohesion: 0.32
Nodes (8): Acropolis World Preview Render, Athena Promachos-style Bronze Statue, Erechtheion-style Secondary Temple, Procedural Hilltop Terrain with Perimeter Path, Low-poly Instanced Scene Style, Parthenon-style Peripteral Temple, Paved Processional Way (Panathenaic path), Propylaea / Western Building Cluster

### Community 23 - "Icone dell'app"
Cohesion: 0.48
Nodes (7): apple-touch-icon.png (iOS home screen icon), icon.svg (vector app icon), icon-192.png (PWA icon 192px), icon-512.png (PWA icon 512px), Brand Palette (navy #0b141d, parchment #e9ddc3, terracotta #be5b40), Greek Temple (Acropolis) Logo Mark, icon-maskable-512.png (maskable PWA icon)

### Community 24 - "Token equivalenti e misura"
Cohesion: 0.33
Nodes (7): Sezione contatore (#total, #state, #usd), Contatore di token (transcript Claude Code), Hook Stop e server Python/FastAPI (versioni precedenti), Prezzo dei pezzi da pesi relativi (priceInTe), Le scelte che proteggono il conto, Token Equivalenti (TE), Misura di CANTIERE.weeklyTe (66 milioni TE)

### Community 25 - "Sagome Giza e Foro"
Cohesion: 0.33
Nodes (7): World Preview Placeholder Silhouette, Forum World Preview (Roman Forum silhouette), Temple Columns with surviving entablature, Triumphal Arch (three fornici + attic), Giza World Preview (Giza plateau silhouette), Great Sphinx, Three Pyramids (Menkaure, Khafre, Khufu)

### Community 26 - "Anteprima torre di prova"
Cohesion: 0.33
Nodes (7): Template World Preview Image, Conical Slate Roof with Open Belfry, Cylindrical Turret with Lattice Window, Flat Ground Plane with Sky Gradient, Spiral Balconies / External Stair, Square Stone Base with Arched Door, Stone Tower Model (Template World)

## Ambiguous Edges - Review These
- `TODO TokenStone: piano a fasi` → `Subagente aggiorna-listino`  [AMBIGUOUS]
  .claude/agents/aggiorna-listino.md · relation: conceptually_related_to
- `Acropolis World Preview Render` → `Propylaea / Western Building Cluster`  [AMBIGUOUS]
  worlds/acropolis/preview.webp · relation: references

## Knowledge Gaps
- **218 isolated node(s):** `GHOST`, `counters`, `mergedByPhase`, `KR`, `worlds` (+213 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `TODO TokenStone: piano a fasi` and `Subagente aggiorna-listino`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Acropolis World Preview Render` and `Propylaea / Western Building Cluster`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `bakePhase()` connect `Credito e pannello della scena` to `Torre di prova (codice)`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `mesh()` connect `Torre di prova (codice)` to `Credito e pannello della scena`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `La Acrópolis de Atenas (Sketchfab, CC-BY 4.0)` connect `Diario: fonti e raffinatezze` to `Scelte di progetto del cantiere`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **What connects `GHOST`, `counters`, `mergedByPhase` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Edifici dell'Acropoli` be split into smaller, more focused modules?**
  _Cohesion score 0.09911141490088858 - nodes in this community are weakly interconnected._