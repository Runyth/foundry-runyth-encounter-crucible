# Compatibility and performance audit — Runyth Encounter Crucible 1.8.3

## Scope

The complete 1.8.2 production tree was reviewed for Foundry v13 lifecycle behavior, browser main-thread stalls, excessive render work, serial asynchronous operations, repeated normalization, large collection traversal, cache invalidation, cancellation, listener ownership, DOM isolation, and packaging.

## Findings

1. Encounter generation was CPU-bound and synchronous on the browser main thread.
2. The generation algorithm allocated and sorted substantially more data than the retained beam required.
3. Actor-folder descendant traversal was quadratic in folder count.
4. NPC normalization and folder labels were repeated across Workshop renders.
5. Combat and Actor update bursts could request multiple Foundry renders within one frame.
6. Combat Tracker preview fingerprints serialized complete resource subtrees.
7. Extension models and Token-prototype preparation used avoidable sequential awaits.
8. Generation had no cancellation or progress UI.

## Corrections

- Added `scripts/workers/encounter-generator-worker.js` and `scripts/services/generation-service.js`.
- Added `generateEncounterAsync()` without removing or changing `generateEncounter()`.
- Added cooperative browser yielding as a Worker fallback.
- Added compact beam states and bounded-heap selection.
- Added progress and cancellation to the ApplicationV2 Workshop.
- Added Actor-folder and candidate caches with Foundry hook invalidation.
- Coalesced runtime refreshes through `requestAnimationFrame`.
- Added compact Combat preview fingerprints.
- Added concurrent extension-model and Token preparation paths with deterministic ordering.
- Kept all module CSS scoped and all listener ownership abortable and idempotent.

## Compatibility invariants

- Foundry VTT minimum 13, verified 13.351, maximum 13.
- D&D 5e minimum 4.2.0, verified 5.2.2, declared maximum 5.3.x.
- Helper API `2.7.1` unchanged.
- Persistent schema `4` unchanged.
- No socket channel, global keyboard listener, jQuery dependency, deprecated Chat render hook, generic Application render hook, Actor-sheet injection, Item-sheet injection, Token HUD injection, or PIXI overlay was introduced.
- Existing settings, Journal flags, saved encounters, API aliases, extension registration methods, and dependency checks remain compatible.

## Files primarily affected

- `scripts/core/encounter.js`
- `scripts/services/generation-service.js`
- `scripts/workers/encounter-generator-worker.js`
- `scripts/apps/workshop.js`
- `templates/workshop.hbs`
- `styles/runyth-encounter-crucible.css`
- `scripts/services/folder-service.js`
- `scripts/integrations/runtime-refresh.js`
- `scripts/combat-tracker.js`
- `scripts/api.js`
- `scripts/services/placement-service.js`
- `scripts/services/actor-normalizer.js`

## External errors

No external package error was masked or monkey-patched. The release modifies only Runyth Encounter Crucible-owned runtime paths and supported Foundry integration hooks.
