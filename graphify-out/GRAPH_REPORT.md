# Graph Report - acropoli  (2026-10-16)

## Corpus Check
- 53 files · ~76,691 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 825 nodes · 1192 edges · 152 communities (36 shown, 116 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `323338b5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- Il piano
- aggiorna-listino.md
- Modalita applicazione (con rollback)
- Modalita proposta (listino candidato)
- pricing.candidate.json
- Regole: non inventare, non dedurre da proporzioni
- Controllo unknown_models a inizio lavoro
- docs/conversazione.md come diario delle decisioni (append-only)
- Regola: cio che vale per un mondo solo non va nel motore
- Il registro non si modifica a mano
- Altar of Athena Polias
- Analytic sky (Rayleigh + Mie scattering, PMREMGenerator IBL)
- Anathemata (74 votive offerings, rejection sampling)
- ancientathens3d.com (Dimitris Tsalkanis)
- Angle contraction of corner intercolumniations
- bakePhase() mesh merging
- Bedrock is free, everything carried up is paid
- Brauronion and Chalkotheke
- Column inward inclination (1:171, per-face)
- Thicker corner columns (1.945 vs 1.905 m)
- COST as relative weights, not prices
- Progress computed from credit (not saved)
- Demo mode (?demo, real-time clock)
- Determinism via fixed-seed generator
- Engine/world separation (engine/ vs worlds/acropolis/, startWorld)
- Erechtheion frieze inlay (friezeMat in entablature())
- GLB node hierarchy vs triangles
- Hookless scanning of ~/.claude/projects
- Initial gift as 1.25% budget share
- installed_at: start from zero
- Double-click launchers and PWA service worker
- Mason marks (marche da cantiere, e.g. KIWN 14/d)
- Multi-world platform (Acropolis, Giza, Roman Forum)
- new-world generator (npm run new-world)
- Single language: Node server with in-process counter
- North wall with Themistocles' reused drums
- Optical refinements (REFINEMENTS in config.js)
- Panathenaic Way (Catmull-Rom, 17 points)
- Parametric heightfield plateau
- parthenon3d.com (Juan de Lara)
- Parthenon prototype (1,089 pieces, real measures)
- Periclean complex (Promachos, Propylaea, Athena Nike, Erechtheion)
- Polychromy (POLYCHROMY.on)
- Pricing list (pricing.json, unknown_models, model_fallbacks, fast_multiplier)
- Procedural geometry generation
- Recompute, never sum (idempotent counter)
- Registry (state/registry.json, formerly world/cantiere.json)
- Headless scene test (npm run test:scene)
- setSculptureProvider() photogrammetry hook
- Server security (localhost only, no traversal/hidden files, JSON-only writes)
- Single-threaded static server bug ('Failed to fetch dynamically imported module')
- La Acrópolis de Atenas (Sketchfab, CC-BY 4.0)
- Snapshot mode and preview cards
- State backup copy (corrupt vs absent state)
- Streaming dedup: one row per message.id
- Stylobate curvature (makeCurve)
- Token Equivalent (TE, te_per_usd = 200,000)
- Token-to-stone ghost block placement
- TOKENS_PER_PERCENT = 240
- TokenStone home page (world selection)
- Transcript-based usage counter
- Unfinished Propylaea south wing
- /usage estimation bridge (usage_store.py)
- Scene file version fingerprint and auto-reload
- Measured weekly quota (66 million TE)
- Weekly quota scale (CANTIERE.weeklyTe, one month per Acropolis)
- world.json world metadata
- World template (worlds/_template, fantasy tower)
- addPiece(phase, object, weight, mark, description, drop)
- Greek architecture kit (worlds/acropolis/src/kit.js)
- npm run new-world
- Piece order invariant after publication
- npm run previews (card picture)
- Publishing a world (status available, npm test, test:scene, commit)
- Seeded generator (engine/random.js, never Math.random)
- Template world (worlds/_template stone tower)
- View modes (?demo=10, ?dev, ?snapshot)
- World folder layout (world.json, index.html, src/main.js, preview.webp)
- world.json fields (id, order, status, weeks, solar, preview)
- TokenStone come app installabile (PWA)
- Prestazioni: bakePhase e ombre su posa
- I blocchi posati si calcolano, non si salvano
- Mondo in arrivo: Foro Romano
- HDRI al posto del cielo analitico (useHDRI)
- Hook Stop e server Python/FastAPI (versioni precedenti)
- Listino prezzi modelli (pricing.json)
- Modalita dimostrativa (?demo)
- Ordine dei pezzi e generatore con seme fisso
- Mondo in arrivo: Piana di Giza
- Policromia (POLYCHROMY)
- Quando un prezzo scende
- Prezzo dei pezzi da pesi relativi (priceInTe)
- Raffinatezze ottiche (REFINEMENTS)
- Registro dei mondi (state/registry.json)
- Ricarica automatica su nuova versione / scollegato dal cantiere
- La roccia affiorante non si paga
- Sculture fotogrammetrate (setSculptureProvider)
- Scritture del registro solo locali, JSON, da pagine TokenStone
- Tratti di credito (un mondo attivo alla volta)
- unknown_models e model_fallbacks
- Misura di CANTIERE.weeklyTe (66 milioni TE)
- Decisioni prese (6 ottobre 2026)
- Fase 1: il cantiere si calcola dal credito
- Fase 2: piu mondi nella struttura (engine/ + worlds/)
- Fase 3: la pagina iniziale
- Fase 4: il modello per i mondi nuovi
- Fase 5: rifiniture dell'Acropoli
- Fase 6: la piana di Giza (kit egizio)
- Fase 7: il Foro Romano (kit romano)
- npx tokenstone (avvio senza clonare)
- ornaments.js
- config.js
- graph-clean.js
- launcher-tests.js
- Creating a world
- TokenStone
- Provare TokenStone
- Il primo mondo: l'Acropoli

## God Nodes (most connected - your core abstractions)
1. `mk()` - 40 edges
2. `Come è nato questo progetto` - 34 edges
3. `box()` - 30 edges
4. `G()` - 22 edges
5. `buildAll()` - 16 edges
6. `scanOnce()` - 15 edges
7. `colonnade()` - 15 edges
8. `parthenon()` - 13 edges
9. `gable()` - 13 edges
10. `startWorld()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `bakePhase()` --indirect_call--> `mesh()`  [INFERRED]
  engine/pieces.js → worlds/_template/src/main.js
- `parthenonFrieze()` --indirect_call--> `el()`  [INFERRED]
  worlds/acropolis/src/frieze.js → home/home.js
- `worlds/acropolis/index.html (pagina scena Acropoli)` --implements--> `Mondo: Acropoli di Pericle`  [INFERRED]
  worlds/acropolis/index.html → README.md
- `scene()` --indirect_call--> `BASE`  [INFERRED]
  worlds/acropolis/src/frieze.js → worlds/_template/src/main.js
- `Sezione contatore (#total, #state, #usd)` --shares_data_with--> `Token Equivalenti (TE)`  [INFERRED]
  index.html → README.md

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

## Communities (152 total, 116 thin omitted)

### Community 0 - "Edifici dell'Acropoli"
Cohesion: 0.12
Nodes (66): buildAll(), erechtheion(), nike(), parthenon(), PEDIMENTS, promachos(), propylaea(), siteGroup() (+58 more)

### Community 1 - "Credito e pannello della scena"
Cohesion: 0.07
Nodes (25): CreditSource, fmt(), bakePhase(), counters, GHOST, initPieces(), mergedByPhase, mergeList() (+17 more)

### Community 2 - "Contatore dei token"
Cohesion: 0.08
Nodes (49): errors, file, fs, ids, missing, path, { validatePricing, PRICING_PATH, STATE_PATH }, acquireLock() (+41 more)

### Community 3 - "Server e migrazione"
Cohesion: 0.06
Nodes (45): fs, migrateLegacyState(), MOVES, path, ROOT, CLIENT_PATHS, clientVersion, counter (+37 more)

### Community 4 - "Test del contatore"
Cohesion: 0.05
Nodes (37): A, alfa, assente, ATTESO, avvio, B, C, CHECK (+29 more)

### Community 5 - "Scelte di progetto del cantiere"
Cohesion: 0.20
Nodes (10): 1. Comincia dal modello, 2. world.json, 3. Il codice: src/main.js, 4. Guardalo, 5. L'immagine della scheda, 6. Pubblicalo, Com'è fatto un mondo, Creare un mondo (+2 more)

### Community 6 - "Registro dei mondi"
Cohesion: 0.10
Nodes (31): BACKUP_PATH, choose(), completed(), counter, creditOf(), fs, knownWorld(), LEGACY_IDS (+23 more)

### Community 7 - "Chrome senza finestra e scatti"
Cohesion: 0.05
Nodes (35): attendi(), connect(), findBrowser(), fs, launch(), path, { spawn, spawnSync }, waitFor() (+27 more)

### Community 8 - "Diario: fonti e raffinatezze"
Cohesion: 0.06
Nodes (34): 10. Dalla stima al conto vero, 11. Quanto costa l'Acropoli, 12. Senza hook, 13. Un linguaggio solo, 14. Il listino che si aggiorna, 15. Aprirla senza terminale, 16. Il cantiere si calcola dal credito, 17. Un motore, piu mondi (+26 more)

### Community 9 - "Torre di prova (codice)"
Cohesion: 0.19
Nodes (21): arch(), balcony(), BASE, BODY, build(), COST, crown(), curveCache (+13 more)

### Community 10 - "Generatore di icone"
Cohesion: 0.12
Nodes (19): base, chunk(), colorAt(), CRC, crc32(), files, fs, hex() (+11 more)

### Community 11 - "README: mondi e resa"
Cohesion: 0.20
Nodes (10): Aggiornare il listino, Comandi utili, Cosa conta, Cosa legge, e cosa no, Dai token al credito, I prezzi dei modelli, Il contatore di token, Le scelte che proteggono il conto (+2 more)

### Community 12 - "Test del server"
Cohesion: 0.12
Nodes (11): fs, http, net, os, path, PRICING, PROJECTS, SERVER (+3 more)

### Community 14 - "Pagina iniziale (codice)"
Cohesion: 0.35
Nodes (15): $(), card(), conferma(), durata(), el(), fmt(), load(), milioni() (+7 more)

### Community 15 - "package.json e script"
Cohesion: 0.13
Nodes (14): description, engines, node, name, private, scripts, diagnosi, graph (+6 more)

### Community 16 - "Test del generatore"
Cohesion: 0.15
Nodes (9): fs, giza, m, NEW_WORLD, os, path, r, { spawnSync } (+1 more)

### Community 17 - "Pagine scena e laboratorio"
Cohesion: 0.13
Nodes (18): index.html (pagina iniziale TokenStone), Dialogo di conferma cambio mondo (#confirm), Sezione contatore (#total, #state, #usd), Sezione laboratorio (#lab), Griglia dei mondi (#worlds), offline.html (TokenStone spento), Mondo: Acropoli di Pericle, Avvio a doppio clic (TokenStone.cmd / .command / tokenstone.sh) (+10 more)

### Community 18 - "Regole di CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Listino dei prezzi, TokenStone

### Community 20 - "Generatore di mondi"
Cohesion: 0.20
Nodes (8): announced, dir, fs, [id, name], metaPath, path, ROOT, TEMPLATE

### Community 22 - "Anteprima Acropoli"
Cohesion: 0.32
Nodes (8): Acropolis World Preview Render, Athena Promachos-style Bronze Statue, Erechtheion-style Secondary Temple, Procedural Hilltop Terrain with Perimeter Path, Low-poly Instanced Scene Style, Parthenon-style Peripteral Temple, Paved Processional Way (Panathenaic path), Propylaea / Western Building Cluster

### Community 23 - "Icone dell'app"
Cohesion: 0.48
Nodes (7): apple-touch-icon.png (iOS home screen icon), icon.svg (vector app icon), icon-192.png (PWA icon 192px), icon-512.png (PWA icon 512px), Brand Palette (navy #0b141d, parchment #e9ddc3, terracotta #be5b40), Greek Temple (Acropolis) Logo Mark, icon-maskable-512.png (maskable PWA icon)

### Community 25 - "Sagome Giza e Foro"
Cohesion: 0.33
Nodes (7): World Preview Placeholder Silhouette, Forum World Preview (Roman Forum silhouette), Temple Columns with surviving entablature, Triumphal Arch (three fornici + attic), Giza World Preview (Giza plateau silhouette), Great Sphinx, Three Pyramids (Menkaure, Khafre, Khufu)

### Community 26 - "Anteprima torre di prova"
Cohesion: 0.33
Nodes (7): Template World Preview Image, Conical Slate Roof with Open Belfry, Cylindrical Turret with Lattice Window, Flat Ground Plane with Sky Gradient, Spiral Balconies / External Stair, Square Stone Base with Arched Door, Stone Tower Model (Template World)

### Community 33 - "Il piano"
Cohesion: 0.11
Nodes (17): Bloccato, Decisioni aperte, Decisioni prese, Fase 1 — Il cantiere si calcola dal credito *(fatta, 6 ottobre)*, Fase 2 — Piu mondi nella struttura, niente di visibile *(fatta, 6 ottobre)*, Fase 3 — La pagina iniziale *(fatta, 6 ottobre)*, Fase 4 — Il modello per i mondi nuovi *(fatta, 7 ottobre)*, Fase 5 — Rifiniture dell'Acropoli *(fatta, 15 ottobre)* (+9 more)

### Community 34 - "aggiorna-listino.md"
Cohesion: 0.50
Nodes (3): Applicazione, Modalita, Proposta

### Community 143 - "ornaments.js"
Cohesion: 0.06
Nodes (32): ERECHTHEION, FOCUS, NIKE, PADS, PARTHENON, PHASES, PLATEAU, POLYCHROMY (+24 more)

### Community 144 - "config.js"
Cohesion: 0.22
Nodes (7): fs, os, path, r, ROOT, { spawnSync }, TMP

### Community 145 - "graph-clean.js"
Cohesion: 0.22
Nodes (8): fs, graphFile, ids, OUT, path, renames, ROOT, SYMBOLS

### Community 146 - "launcher-tests.js"
Cohesion: 0.22
Nodes (10): env, fs, os, path, prova(), ROOT, { spawn, spawnSync }, stop() (+2 more)

### Community 147 - "Creating a world"
Cohesion: 0.20
Nodes (10): 1. Start from the template, 2. world.json, 3. The code: src/main.js, 4. Look at it, 5. The card's picture, 6. Publish it, Creating a world, How a world is made (+2 more)

### Community 148 - "TokenStone"
Cohesion: 0.22
Nodes (9): Avvio rapido, Come app, Con un doppio clic, Da terminale, Dentro un mondo, I mondi e il registro, La pagina iniziale, Struttura (+1 more)

### Community 149 - "Provare TokenStone"
Cohesion: 0.25
Nodes (8): Aggiornarlo, Come segnalare, Cosa provare, Cosa serve, Il primo avvio, Installarlo, Provare TokenStone, Togliere TokenStone

### Community 150 - "Il primo mondo: l'Acropoli"
Cohesion: 0.25
Nodes (8): 1. Sculture fotogrammetrate, 2. HDRI al posto del cielo analitico, Frontoni e fregio, I due innesti da completare, Il pianoro, Il primo mondo: l'Acropoli, Prestazioni, Raffinatezze ottiche e policromia

## Ambiguous Edges - Review These
- `Acropolis World Preview Render` → `Propylaea / Western Building Cluster`  [AMBIGUOUS]
  worlds/acropolis/preview.webp · relation: references

## Knowledge Gaps
- **415 isolated node(s):** `GHOST`, `counters`, `mergedByPhase`, `KR`, `worlds` (+410 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **116 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Acropolis World Preview Render` and `Propylaea / Western Building Cluster`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `scene()` connect `ornaments.js` to `Torre di prova (codice)`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `BASE` connect `Torre di prova (codice)` to `ornaments.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `mesh()` connect `Torre di prova (codice)` to `Credito e pannello della scena`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `GHOST`, `counters`, `mergedByPhase` to the rest of the system?**
  _447 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Edifici dell'Acropoli` be split into smaller, more focused modules?**
  _Cohesion score 0.117102615694165 - nodes in this community are weakly interconnected._
- **Should `Credito e pannello della scena` be split into smaller, more focused modules?**
  _Cohesion score 0.06966618287373004 - nodes in this community are weakly interconnected._