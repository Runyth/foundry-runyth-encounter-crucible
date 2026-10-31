# Compatibility and API exposure audit — Encounter Crucible 1.8.2

## Trigger

Dependent modules reported that Encounter Crucible 1.8.1 or newer with Helper API 2.7.1 was required even while the core logged that exact module/API combination.

## Root causes

1. The reproducible package metadata available to this release process still identified the module as 1.4.2, below the dependants' 1.8.1 minimum.
2. The public API was constructed and attached only inside Encounter Crucible's `init` callback.
3. Foundry does not guarantee the relative order of separately registered callbacks merely because both use `init`; a dependant could inspect before the core callback ran.
4. The API exposed only `apiVersion`, leaving dependants using common legacy aliases without a stable compatibility value.
5. No public semantic-version helper or readiness Promise existed, encouraging ad hoc comparison and lifecycle assumptions.

## Corrections

- Released module version 1.8.2.
- Exposed one frozen API object during ES-module evaluation.
- Reattached the same object idempotently during `init` and `ready`.
- Added `whenReady()` and `isReady` without moving or duplicating existing hooks.
- Added stable API and module version aliases.
- Added immutable compatibility descriptors.
- Added numeric semantic-version range checking and assertion methods.
- Retained every existing public operation, setting, flag, hook, model, schema, and permission boundary.
- Kept all ApplicationV2, native DOM, scoped CSS, Scene Controls, Chat, transaction, and isolation corrections from the prior audited source.

## Files affected

- `module/encounter-crucible/module.json`
- `module/encounter-crucible/scripts/main.js`
- `module/encounter-crucible/scripts/api.js`
- `module/encounter-crucible/scripts/core/constants.js`
- `module/encounter-crucible/scripts/core/lifecycle.js`
- `module/encounter-crucible/scripts/core/version.js`
- tests, release documentation, and deterministic packaging tooling

## Intentionally unchanged

- Helper API remains 2.7.1.
- Encounter data schema remains 4.
- D&D 2024/2014, CR, action-economy, resources, tactical, volatility, and confidence calculations are unchanged.
- Encounter generation, normalization, persistence, Token placement, Combat creation, settings, flags, permissions, and hook signatures are unchanged.
- No socket, Actor-sheet, Item-sheet, Token HUD, canvas-overlay, Chat-render, or raw keyboard integration was added.
- No world migration or eager Document write was added.

## External errors

No workaround, monkey patch, deprecated-API shim, or error suppression was added for unrelated packages. Dependent modules should be patched separately when their own checks perform lexical version comparison, inspect before dependency loading, or reject a compatible alias incorrectly.

## Runtime boundary

Static, mocked-lifecycle, unit, manifest, archive, and reproducibility qualification was completed. A licensed Foundry browser runtime was unavailable; final in-world verification remains listed in `TEST-PLAN.md`.
