# Release report — Runyth Encounter Crucible 1.8.4

## Objective

Restore reliable Runyth Encounter Crucible: Forge integration by supplying the named `encounterGeneration` capability expected by its compatibility gate.

## Result

Runyth Encounter Crucible now exposes a frozen callable generation capability namespace and multiple explicit discovery surfaces. Forge can validate module version, Helper API range, and feature availability independently. Existing API consumers remain compatible because no established method was removed or renamed.

## Identity

- Module: `1.8.4`
- Helper API: `2.7.2`
- Encounter-generation capability: `1.0.0`
- Persistent schema: `4`

## Delivery

- full reproducible source ZIP;
- runtime-only installable ZIP;
- documentation, reports, audit, changelog, checksums, and test-results ZIP.
