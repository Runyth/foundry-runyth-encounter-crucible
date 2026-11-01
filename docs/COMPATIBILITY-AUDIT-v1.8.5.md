# Compatibility and interference audit — Runyth Encounter Crucible 1.8.5

## Finding

Runyth Encounter Crucible 1.8.4 initialized normally and exposed Helper API 2.7.2. Runyth Encounter Crucible: Forge then reported that the API lacked helper-module registration. The generation capability added in 1.8.4 was therefore necessary but not sufficient for Forge's complete integration contract.

## Root cause

The public API had extension registries for encounter models, system adapters, and resource providers, but no general companion/helper-module registry. Forge correctly distinguished this missing registration surface from module-version, Helper API-version, and capability checks.

## Corrections

| Affected file | Correction |
|---|---|
| `scripts/core/helper-registry.js` | Added a private Map-backed, frozen public registry namespace with validated registration descriptors and common call signatures |
| `scripts/api.js` | Exposed canonical and compatibility aliases, capability discovery, helper descriptors, and lifecycle hooks |
| `scripts/core/constants.js` | Advanced module and Helper API versions |
| `tests/helper-registry.test.mjs` | Added registry normalization, aliases, idempotence, conflicts, unregister, and malformed-input tests |
| `tests/api.test.mjs` | Added Forge-compatible public-surface and lifecycle regression tests |
| Documentation and packaging | Documented the contract and aligned all three archives with release 1.8.5 |

## Isolation retained

- No Actor-sheet, Item-sheet, Tidy-sheet, Token HUD, canvas-overlay, Chat-render, keybinding, or socket integration was added.
- No global DOM, CSS, Foundry class, or hook monkey patch was added.
- Helper registration mutates only an internal module-owned Map.
- Public namespace and descriptors are frozen.
- Helper registration does not bypass permissions enforced by existing core methods.
- Disabling a helper leaves Runyth Encounter Crucible settings, Journals, flags, Tokens, and Combats unchanged.

## Unrelated errors in the supplied log

The log also identifies failures or deprecations owned by other packages, including duplicate custom-element registration, `html.find` against native HTML, array-shaped Scene Controls mutation, deprecated Chat hooks, deprecated globals, DAE sense paths, missing assets, and V1 applications. Runyth Encounter Crucible does not mask or patch those packages.

No Runyth Encounter Crucible path is present in a deprecation stack or runtime exception in the supplied log. Its only actionable entry is Forge's compatibility rejection, which this release corrects.
