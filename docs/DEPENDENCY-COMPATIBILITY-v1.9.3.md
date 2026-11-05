# Dependency compatibility — Runyth Encounter Crucible 1.9.3

## Released contract

- Module: `1.9.3`
- Helper API: `2.7.5`
- Encounter-generation capability: `1.0.1`
- Actor-collection capability: `1.0.0`
- Encounter-assessment capability: `1.0.0`
- Helper-module-registry capability: `1.0.0`
- Persistent schema: `4`

## Startup contract

The installable core remains a self-contained ES-module bundle; the 1.9.3 fix touches only the combat tracker banner integration (guard selector, panel attribute, purge step). Public API attachment, helper registration, and hook timing are unchanged and re-verified by the automated suite.
