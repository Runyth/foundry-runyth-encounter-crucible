# Runyth Encounter Crucible

Runyth Encounter Crucible is a Foundry VTT v13 and D&D 5e encounter-analysis module. It compares D&D 2024 and 2014 XP methods with CR, action economy, current resources, tactical context, volatility, and confidence. It also generates encounters, saves them to Journals, places Tokens, and creates Combats.

## Supported versions

- Foundry VTT: minimum 13, verified 13.351, maximum 13
- D&D 5e: minimum 4.2.0, verified 5.2.2, declared maximum 5.3.x
- Runyth Encounter Crucible module: 1.9.3
- Runyth Encounter Crucible Helper API: 2.7.5
- Encounter data schema: 4

Version 1.8.8 hardens clean startup. The editable source remains modular, but the installable module is built as one self-contained core/runtime ES-module bundle plus one self-contained generation Worker bundle. This prevents a failed browser fetch for an internal source module from suppressing the core API and downstream helper integrations.

## Install or upgrade

1. Disable Runyth Encounter Crucible in the target world.
2. Remove or replace `Data/modules/runyth-encounter-crucible/`.
3. Extract `runyth-encounter-crucible-v1.9.3-mod.zip` into `Data/modules/`.
4. Confirm `Data/modules/runyth-encounter-crucible/module.json` exists.
5. Restart Foundry after replacing module files, then enable the module and reload the world.

No manual data migration is required. Existing settings and saved Journal flags remain compatible.

## Dependency integration

```javascript
const api = game.modules.get("runyth-encounter-crucible")?.api;

if (!api?.isModuleVersionSupported(">=1.8.1")) {
  throw new Error("Runyth Encounter Crucible 1.8.1 or newer is required.");
}
api.assertApiVersion(">=2.7.1");
api.assertCapability("encounterGeneration", ">=1.0.0");
api.assertCapability("collectActors", ">=1.0.0");
api.assertCapability("assessEncounter", ">=1.0.0");
api.assertCapability("helperModuleRegistry");
api.registerHelperModule({ id: "my-helper", version: "1.0.0", api: myHelperApi });
await api.whenReady();
```

The canonical lookup remains `game.modules.get("runyth-encounter-crucible")?.api`. The API is exposed as soon as the generated runtime bundle evaluates, before Runyth Encounter Crucible's own `init` callback.

## Use

GM entry points:

1. Combat Tracker → **Runyth Encounter Crucible**.
2. Token Scene Controls → scale icon.
3. Configure Settings → Module Settings → Runyth Encounter Crucible → **Open Encounter Workshop**.

The Dashboard analyses the active Combat. Without an active Combat, control Scene Tokens and press **Refresh**. The Workshop discovers the current player party and NPC Actors, supports scalable folder and candidate filtering, generates a roster, then saves, places, or creates a Combat.

Encounter analysis and authoring interfaces are GM-only. The `playerVisibility` setting controls only the visibility of Chat summaries deliberately posted by a GM.

## Development

Requirements:

- Node.js `22.13.0` or newer, below Node.js 27
- Python 3.10 or newer for deterministic ZIP creation

```text
npm ci
npm test
npm run build
npm run validate:build
npm run package
```

Run the complete gate and produce all three release ZIPs:

```text
npm run release
```

Artifacts are written to `dist/`:

```text
runyth-encounter-crucible-v1.9.3-mod.zip
runyth-encounter-crucible-v1.9.3-src.zip
runyth-encounter-crucible-v1.9.3-doc.zip
runyth-encounter-crucible-v1.9.3-SHA256SUMS.txt
```

## Repository layout

```text
module/runyth-encounter-crucible/           Authoritative editable Foundry source
module/runyth-encounter-crucible/scripts/   Modular ApplicationV2, API, integrations, services, engine, and Worker source
module/runyth-encounter-crucible/templates/ Handlebars templates
module/runyth-encounter-crucible/styles/    Runtime CSS
module/runyth-encounter-crucible/lang/      English and German localisation
tests/                               Unit, compatibility, startup, isolation, and repository tests
tools/                               Dependency-free runtime bundler, build, validation, and deterministic packaging
docs/                                API, compatibility, audit, persistence, and test documentation
build/                               Generated runtime-only module and documentation staging trees
dist/                                Generated release archives
```

The source code remains normal editable ES modules. `npm run build` uses the repository's dependency-free deterministic bundler to produce the installable runtime. The installable contains only `scripts/main.js` and `scripts/workers/encounter-generator-worker.js` as JavaScript payloads, eliminating startup-time fetches for the internal source graph.

## Validation scope

The automated gate checks JavaScript syntax, manifest references, localization parity, version consistency, bundled startup, API exposure before `init`, Forge and a campaign helper helper registration, semantic dependency checks, readiness, calculations, Worker-backed and cooperative generation, cancellation, progress reporting, concurrent extension models, concurrent Token preparation, cache invalidation, permissions, duplicate actions, hook scope, native DOM use, Scene Controls shape, Chat cardinality, transactional Journal/Token/Combat workflows, CSS isolation, runtime imports, and deterministic three-archive layout.

A licensed Foundry browser runtime is unavailable in the build environment. Complete `docs/TEST-PLAN.md` in a cloned v13 world before replacing a production installation.

## Documentation

- `docs/API.md`
- `docs/COMPATIBILITY.md`
- `docs/DEPENDENCY-COMPATIBILITY-v1.9.1.md`
- `docs/COMPATIBILITY-AUDIT-v1.9.1.md`
- `docs/PERFORMANCE-AUDIT-v1.9.1.md`
- `docs/SETTINGS-AND-FLAGS.md`
- `docs/TEST-PLAN.md`
- `docs/VALIDATION-v1.9.1.md`
- `docs/AUTOMATED-TEST-RESULTS-v1.9.1.md`

## Licence
Copyright © 2026  [Daniel Braniewski](https://brani.dev/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
