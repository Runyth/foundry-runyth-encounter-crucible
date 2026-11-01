# Manual Foundry compatibility test plan

Use cloned Foundry v13.351 worlds with D&D 5e 5.2.2 and the latest 5.3.x release available to you. Test with one GM browser and one player browser. Preserve the original world as a backup.

## Installation and lifecycle

1. Extract the installable ZIP into `Data/modules/`; verify exactly `Data/modules/runyth-encounter-crucible/module.json`.
2. Enable the module and reload the world.
3. Verify no error, unhandled Promise rejection, or deprecation warning originates from a path under `modules/runyth-encounter-crucible/`.
4. Refresh both browsers, reload the world, disable the module, re-enable it, and reload again.
5. Confirm settings, the Scene Control, the Combat Tracker panel, and `game.modules.get("runyth-encounter-crucible").api` each initialize once.
6. Confirm disabling the module neither deletes nor rewrites Actors, Tokens, Scenes, Items, Journal Entries, or settings data.

## GM and player permissions

1. As GM, open the Workshop from Module Settings and Token Scene Controls.
2. As player, confirm neither launcher nor Combat Tracker panel is shown.
3. As player, call privileged API methods from the console in the test world and confirm they reject without modifying Documents.
4. Test hidden, vague, and full Chat-summary visibility. Verify hidden cards whisper only to GMs and vague cards disclose no CR, XP, hidden participants, or model detail.
5. Verify one click creates exactly one Chat card.

## ApplicationV2 behavior

1. Open Dashboard and Workshop; resize and move both.
2. Close and reopen them; verify position and size persistence.
3. Repeatedly rerender each window and switch between generated encounters.
4. Confirm every click or form submission executes once and no controls duplicate.
5. Test narrow and large window sizes; verify no overlap, clipping, unusable wrapping, or low-contrast text. Confirm long translated labels wrap inside buttons and participant tables scroll horizontally when needed.
6. Filter at least 200 Actor folders by path and search at least 300 NPC candidates. Verify selections and minimum/maximum counts survive rerenders and filters.
7. Confirm Foundry's native ellipsis and close controls remain farthest right and unchanged.

## Sheet and dialog non-interference

Open each interface with Runyth Encounter Crucible enabled and confirm no Runyth Encounter Crucible control, style, listener, or layout change appears:

- core D&D 5e character sheet;
- core D&D 5e NPC sheet;
- core D&D 5e Item sheet;
- Tidy 5e Modern character and NPC sheets;
- Tidy 5e Classic character and NPC sheets;
- a custom or unsupported Actor sheet;
- linked-Token Actor sheet;
- unlinked synthetic-Token Actor sheet;
- character level-up window;
- advancement selection dialog;
- roll popup;
- short-rest and long-rest dialogs;
- activity-use dialog;
- Active Effect editor;
- importer or migration dialog when available.

Partially rerender supported and unsupported sheets. Verify no duplicate controls and no effect on the module's independent launchers.

## Token HUD and Canvas

1. Open and rerender the Token HUD for linked, unlinked, owned, and unowned Tokens.
2. Test one selected Token and multiple selected Tokens.
3. Confirm Runyth Encounter Crucible adds no Token HUD control or listener.
4. Change Scenes, refresh the canvas, hide and delete Tokens, and confirm no Runyth Encounter Crucible display object, label, nameplate modification, or stale canvas object exists.
5. Use representative Token HUD and canvas modules and confirm their controls remain usable.

## Scene Controls

1. As GM, select Token Controls and verify exactly one Runyth Encounter Crucible tool.
2. Rerender Scene Controls, switch control groups, change Scenes, refresh, and reload the world.
3. Verify the tool remains single, opens the Workshop once, and does not replace or reorder unrelated tools unexpectedly.
4. As player, verify the tool is absent.
5. Test with representative modules that also register Token tools.

## Combat Tracker

1. Open the tracker with no active Combat and verify one launcher panel.
2. Create an active Combat and verify one preview panel and one assessment summary.
3. Update relevant Actor HP and combatants; verify refresh occurs without duplicate panels or listeners.
4. Update an unrelated Actor; verify the tracker is not needlessly rerendered by Runyth Encounter Crucible.
5. Repeatedly rerender and switch Combats; verify one panel and one action per click.
6. Confirm preview rendering does not write `lastEncounter`, run extension models, or emit analysis hooks.

## Encounter functionality regression

1. Discover the current party without duplicate Actors.
2. Generate neutral, quantity, strength, hybrid, and fixed-size encounters.
3. Confirm fixed size overrides both preference checkboxes.
4. Analyse a Combat containing PCs, friendly NPCs, hostiles, neutral Tokens, hidden Tokens, and defeated combatants.
5. Compare 2024 XP, 2014 adjusted XP, CR ratio, action economy, resource pressure, and tactical context.
6. Reduce HP and spell slots; confirm resource strength changes.
7. Save an encounter and verify Journal folders, ownership, pages, flags, and schema `4`.
8. Place linked and unlinked Tokens and confirm disposition, hidden-state option, Actor linkage, and layout.
9. Place and create Combat; confirm combatants reference the created Tokens.
10. Enable and disable last-encounter retention and verify setting writes follow the configured behavior.
11. Register a custom model through API `2.7.5`; verify one before-hook veto and one after hook per explicit analysis.

## Localization and module coexistence

1. Repeat representative workflows in English and German.
2. Enable a representative set of active modules, including Tidy 5e Sheets, Midi-QOL, DAE, a Token HUD module, a Chat module, and a Scene Controls module.
3. Attribute every warning to its package path. Do not treat another module's deprecated hook or DOM error as an Runyth Encounter Crucible defect unless the stack originates from `modules/runyth-encounter-crucible/`.

## Acceptance record

Record Foundry version, D&D 5e version, other enabled module versions, browser, GM/player result, console output, and any failed step. A licensed Foundry runtime was unavailable to the release builder, so this checklist is the required browser-runtime qualification step.

## Transaction and persistence regressions

1. Analyse and remember the same generated encounter repeatedly; reload the world and confirm the hidden last-encounter setting remains readable.
2. Save an encounter to a Journal and confirm its stored encounter flag contains the final `journalUuid`.
3. Force a Journal final-flag write failure in a disposable test world and confirm the partial Journal is removed.
4. Force Combat creation failure after Token placement and confirm newly placed Tokens are removed.
5. Repeat with `rollbackOnFailure: false` through the API and confirm Tokens intentionally remain.
6. Attempt placement with no resolvable Actor UUIDs and confirm the operation reports failure instead of a false success.

## Dependent-module detection regression

1. Install Runyth Encounter Crucible 1.8.7 and Runyth Encounter Crucible: Forge requiring module 1.8.1+ and Helper API 2.7.1+ within major version 2.
2. Reload the world and verify the dependant does not emit the prior false requirement error.
3. In the dependant's top-level ES module and again during `init`, inspect `game.modules.get("runyth-encounter-crucible")?.api`; confirm the same object exists both times.
4. Confirm all documented Helper API aliases report `2.7.5` and all module aliases report `1.8.7`.
5. Confirm `isModuleVersionSupported(">=1.8.1")` and `isApiVersionSupported(">=2.7.1")` return true.
6. Confirm `whenReady()` resolves to the same API object after Foundry `ready`.
7. Disable Runyth Encounter Crucible and verify the dependant reports a genuinely missing/inactive dependency rather than an API mismatch.
8. In a disposable copy, lower the required API to a compatible range and raise it to an incompatible range; verify only the incompatible range fails.
9. Confirm `api.encounterGeneration`, `api.features.encounterGeneration`, and `api.helperApi.encounterGeneration` reference the same frozen namespace.
10. Confirm `api.capabilities.includes("encounterGeneration")`, `api.capabilityMap.encounterGeneration`, and `api.hasCapability("encounterGeneration")` all succeed.
11. Open Forge and verify it no longer reports `Missing capabilities: encounterGeneration`.
12. Generate once through Forge, once through `api.encounterGeneration.generate(...)`, and once through the legacy top-level `api.generateEncounterAsync(...)`; verify all complete normally.
13. Confirm Forge registers through `api.registerHelperModule(...)` without reporting `helper-registry-missing`.
14. Confirm `api.helperModules`, `api.helperRegistry`, and `api.helpers` are the same frozen namespace.
15. Reload the world and verify an identical helper registration remains idempotent and produces one registered descriptor.
16. Disable Forge and verify Runyth Encounter Crucible remains fully usable and stored encounter data remains intact.

## Performance and responsiveness — v1.8.7

1. Open the Workshop with at least 300 eligible NPC Actors and a maximum group size of 30.
2. Press **Generate Encounter** and immediately move, resize, filter, scroll, and interact with the Workshop and other Foundry applications.
3. Confirm Foundry continues repainting and accepting input while the progress indicator advances.
4. Press **Cancel** during generation and confirm the operation stops without an error notification or stale result.
5. Generate again and confirm exactly one result appears.
6. Change an NPC Actor and confirm the next candidate render reflects the update without restarting the world.
7. Rapidly update Combatant HP and confirm the Combat Tracker and open module windows refresh at most once per animation frame.
8. Place an encounter with many distinct Actors and confirm Token order remains deterministic.
9. Test with browser Worker support deliberately disabled and confirm the cooperative fallback remains responsive.

## 1.8.8 clean-start runtime loading

1. Fully stop Foundry after replacing Runyth Encounter Crucible files; do not rely on a world reload alone.
2. Start Foundry v13.351 and open a world with Runyth Encounter Crucible, Runyth Encounter Crucible: Forge, and a campaign helper enabled.
3. Open the browser Network panel before the world view initializes.
4. Confirm Runyth Encounter Crucible loads `modules/runyth-encounter-crucible/scripts/main.js` successfully.
5. Confirm there are no requests for `scripts/core/encounter.js`, `scripts/services/generation-service.js`, `scripts/services/actor-normalizer.js`, or other Runyth Encounter Crucible source modules during core startup.
6. Confirm `scripts/workers/encounter-generator-worker.js` is requested only when encounter generation uses the Worker path.
7. In the console, confirm `game.modules.get("runyth-encounter-crucible")?.api?.apiVersion` is `2.7.5`.
8. Confirm Forge and a campaign helper do not report `core/API unavailable`, `helper registry missing`, or missing capability errors.
9. Confirm both helpers appear in `game.modules.get("runyth-encounter-crucible").api.listHelperModules()` after their registration lifecycle.
10. Repeat once with Foundry served under a configured URL route prefix and verify Worker generation succeeds.
