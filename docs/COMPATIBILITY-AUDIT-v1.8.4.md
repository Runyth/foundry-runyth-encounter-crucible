# Compatibility audit — Encounter Crucible 1.8.4

## Reported defect

Encounter Crucible exposed Helper API `2.7.1` and working top-level generation methods, but Encounter Crucible: Forge rejected the integration because the API did not expose the named `encounterGeneration` capability.

## Root cause

The core API advertised versions and individual generation methods but had no explicit capability namespace or capability-discovery metadata. Forge correctly distinguished API-version compatibility from feature availability and reported the missing capability.

## Corrections

Affected runtime files:

- `module/encounter-crucible/scripts/api.js`
- `module/encounter-crucible/scripts/core/constants.js`

Corrections:

1. Added a frozen callable `api.encounterGeneration` namespace.
2. Added frozen `capabilities` and `supportedCapabilities` name arrays.
3. Added `capabilityMap`, `features`, `hasCapability()`, and `assertCapability()`.
4. Added capability metadata to `helperApi` and `compatibility`.
5. Grouped established generation and related helper methods under the namespace without removing or renaming top-level methods.
6. Added async-preferred `generate`/`generateAsync` aliases and a `generateSync` alias.
7. Advanced Helper API to `2.7.2` because the public API gained an additive capability.
8. Advanced the module patch version to `1.8.4`; persistent schema remains `4`.

## Compatibility preserved

- Existing top-level methods and signatures remain unchanged.
- Existing API lookup paths remain unchanged.
- Early API exposure, readiness Promise, lifecycle hooks, and version assertions remain unchanged.
- Worker-backed generation, progress, cancellation, and cooperative fallback remain unchanged.
- Existing settings, Actor flags, Token flags, Scene flags, Journal flags, and saved encounters require no migration.
- GM permission checks remain active for world-content browsing and Document-changing operations.
- No Actor-sheet, Item-sheet, Token HUD, canvas, socket, keybinding, or Chat-render integration was added.

## External errors

No workaround was added for the separate Forge `sliderToTarget` defect or for errors attributed to unrelated modules. This patch corrects only Encounter Crucible's missing capability contract.
