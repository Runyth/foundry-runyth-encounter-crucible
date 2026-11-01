# Release report — Runyth Encounter Crucible 1.8.5

## Objective

Restore complete Runyth Encounter Crucible: Forge integration after live Foundry logs showed `helper-registry-missing` despite compatible core and Helper API versions and a present generation capability.

## Result

Runyth Encounter Crucible now exposes a versioned helper-module registry through canonical and compatibility aliases. Forge can register itself without mutating the frozen core API or relying on initialization order. All existing module behavior and persistent data remain compatible.

## Release identity

- Module: `1.8.5`
- Helper API: `2.7.3`
- Schema: `4`
- Foundry target: `13.351`
- D&D 5e declared range: `4.2.0` through `5.3.x`

## Delivery

- Complete reproducible source ZIP
- Runtime-only installable ZIP
- Documentation, audits, changelog, validation, and test-results ZIP
