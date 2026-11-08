# Cathedral Fusion Tools

Fan-made fusion calculator, skill planner and party builder for Megami Tensei games.
Live: all 41 games of aqiu384's tool, from Kyuuyaku Megami Tensei to SMT V Vengeance (list in `GAMES`, app/meta.ts):
SMT I, II, if..., NINE, III Nocturne, IMAGINE, Strange Journey (+ Redux), IV, IV Apocalypse, V (+ Vengeance);
Persona 1, 2 IS/EP, 3 (+ FES, Answer, Portable, Reload), 4 (+ Golden), 5 (+ Royal, Strikers, Tactica), Q, Q2;
Devil Summoner, Soul Hackers, Raidou 1/2, Raidou Remastered, Soul Hackers 2; Devil Survivor 1/2 (+ Overclocked, Record Breaker);
Majin Tensei 1/2.

## Golden rule

Fusion results must match aqiu384's Megami Tensei Fusion Tools exactly.
We do not reimplement fusion logic. We bundle aqiu384's TypeScript models, fusion
functions and JSON data (public domain, Unlicense) and wrap them behind our own API.
If a result looks wrong, compare with https://aqiu384.github.io/megaten-fusion-tool/ first.

## Setup

```bash
npm install
npm run vendor     # clones aqiu384/megaten-fusion-tool into vendor/ (gitignored)
npm run build      # engines + app into dist/
npm run serve      # http://localhost:8765/index.html
```

`node build-engine.mjs smt5v` rebuilds one game. `npm run build:app` rebuilds only the UI.

## Layout

```
engine/            One bundle per game, built from vendor code
  core.ts          GameEngine: the only API the UI talks to
  vendor-game.ts   registerSmt / registerPersona: GameConfig from a vendor createCompConfig()
  smt3.ts ...      One 3-line file per plugin-based game
  smt5v.ts         Game config, copied from vendor/.../smt5/compendium.module.ts
  p3r.ts, p5r.ts   Same for Persona (wiring copied from vendor/.../pq2/fusion-data.service.ts)
  persona-common.ts
stubs/angular-core.ts   Fake @angular/core so vendor models bundle without Angular
app/
  main.tsx         Preact app: routing, all views
  planner.ts       Skill planner search (ours, not from vendor)
  meta.ts          Element labels, game list, slugify
  style.css        All styles, inlined into dist/index.html at build
  elem-sprites.svg, weapon-sprites.svg  Icon sprites from aqiu384, copied to dist/
  logo.png, favicon.png  Made from logo-source.png (the Magatama badge), copied to dist/
build-engine.mjs   esbuild, alias @src -> vendor/megaten-fusion-tool/src/app
build-app.mjs      esbuild app + writes dist/index.html, copies elem-sprites.svg
dist/              index.html, app.js, games/<id>.js
```

Each `dist/games/<id>.js` is an IIFE that registers `window.MegatenGames[id] = () => new GameEngine(config)`.
The app loads it on demand with a `<script>` tag, so adding a game does not grow the main bundle.

## GameEngine API (engine/core.ts)

- `demonNames()`, `demon(name)` → normalized `DemonView` (resists as `wk | - | rs | nu | rp | dr`)
- `skillNames()`, `skill(name)` → `SkillView` (cost string, effect, `inheritable`, `learnedBy`)
- `reverse(name)` → ingredient pairs; `special(name)` → fixed multi-ingredient recipe
- `forward(name)` → `{ other, result }` pairs
- `unlockGroups`, `toggles`, `setToggles(save)`, `isEnabled(name)` → unlock/DLC settings
- `cfg` → `GameConfig` (family `smt | persona`, resistElems, inheritElems, maxSkillSlots...)

Vendor objects live in `eng.comp` (Compendium) and `eng.cfg.chart` (FusionChart). Avoid using them from the UI.

## Adding a game

No config is copied by hand. `build-engine.mjs` has a `vendor-module` esbuild plugin that loads aqiu384's own
`<game>/compendium.module.ts`, drops its Angular routes and exports `createCompConfig`. Then, by wiring:

- `smt4f` routing (SMT family): `registerSmt` in `engine/vendor-game.ts` (mirrors smt4f/fusion-data.service.ts).
- `pq2` routing (Persona family): `registerPersona` (mirrors pq2/fusion-data.service.ts, incl. p5/p5t overrides and triple fusion).
- Self-contained `FusionDataService` (smt1, p1, kmt1, p5s wirings): `registerService` builds aqiu384's own service
  object (our `@angular/core` stub has no-op `Injectable`/`Inject`) and takes its compendium, charts and calculators.

1. Find the folder in `vendor/megaten-fusion-tool/src/app/` and the key `createCompConfig()` returns (none for smt1/p1-style).
2. Create `engine/<id>.ts`, 3 or 4 lines; copy `engine/smt3.ts` (keyed) or `engine/smt2.ts` (service).
3. Add the id to `GAMES` in `app/meta.ts` (series = homepage group, `noPlanner` for games with fixed skill sets).
   `build-engine.mjs` builds every file in `engine/`; routes come from `GAMES`.
4. New element codes: add the sprite id to the matching icon map in app/meta.ts (`SMT_ICON`, `PER_ICON`, `NES_ICON`,
   `MIB_ICON`; copy from aqiu384's compendium.component.css) and a label to `ELEM_LABEL`.
5. Smoke test in Node: `globalThis.window = globalThis; require('./dist/games/<id>.js')`, then check a recipe.

`smt5v`, `p3r`, `p5r` predate the plugin and keep hand-copied configs.

## Triple fusion

`GameEngine.reverseTriple(name)` uses the game's `triFissionCalc` with its `squareChart` (normal + triple chart).
Recipes show it as "Three demons" under "Made from" (20 easiest, then up to 1000). It is expensive (P4G: ~1.3M trios,
~100 ms per persona), so the planner only uses trios for demons with no two-demon recipe, 40 easiest each.
"Fuses into" lists two-demon fusions only.

## Routing

Hash only, plain ASCII (the artifact host passes only `#name`, never `#/path` or query strings):
`#home`, `#smt5v`, `#smt5v-d-jack-frost`, `#smt5v-skills`, `#smt5v-s-me-patra`, `#smt5v-planner`, `#smt5v-party`, `#smt5v-unlocks`.
Never use `settings`, `sidebar`, `customize`, `upgrade`, `downloads` as a route name.

## Skill planner (app/planner.ts)

Layered DP over fusion recipes. Wanted skills are a bitmask. For each demon we keep the
non-dominated set of masks reachable in k fusions (fewer fusions, then lower highest-level ingredient).
- Persona: a child only inherits a skill if its inheritance type allows the skill's element (`cfg.inheritElems` + demon `affinities`).
- Skills with rank >= 90, innate (`inn`) or `inherit: 'non'` are not inheritable.
- The target is never used as an ingredient inside its own tree.
- Has a 4 second time budget; reports `truncated`.
Known gaps: ignores per-fusion inherit-count limits in Persona, does not prefer demons the player owns.

## Design rules

- Usability before looks. Reference: aqiu384's tool (plain, everything is a table, links look like links).
- System fonts, white/dark background, blue underlined links, 1px gray borders, striped tables. No display fonts,
  no uppercase headings, no decorative accents, shapes or shadows beyond the picker dropdown.
- `#home` (also empty or unknown hash) is the game picker; games are grouped by series in `GAMES` (app/meta.ts).
- Element icons: aqiu384's `elem-sprites.svg` (public domain), copied to `app/` and into `dist/` at build.
  One icon per `<img src="elem-sprites.svg#ID">`; code to ID mapping is `iconUrl()` in app/meta.ts
  (SMT vs Persona variants for dark/almighty/recovery/support/passive). Icons sit on a dark tile for contrast.
- Colors are tokens in `:root` with light and dark variants.
- Must work at 390px wide with no horizontal page scroll; wide tables scroll inside `.tablewrap`.
- localStorage only for per-user conveniences (party, unlocks, planner inputs), always in try/catch.

## Publishing

Currently published as a claude.ai artifact (multi-file: index.html + app.js + elem-sprites.svg + weapon-sprites.svg + logo.png + favicon.png + games/*.js).
For a normal host (GitHub Pages, Netlify), `dist/` is a static site as-is.

## Roadmap

1. Planner: "demons I own" list to bias results, Web Worker so long searches don't block the UI (and can use all trios).
2. "Fuses into" for triple fusion.
3. Party: shareable party links, Nahobino/protagonist slot.
4. Fusion chart view (race x race grid).
5. Compendium: column for unlock condition, filter by "fusable now".
