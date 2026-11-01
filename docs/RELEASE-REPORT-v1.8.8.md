# Release report — Runyth Encounter Crucible 1.8.8

Version 1.8.8 repairs the core runtime loading path. The source repository remains fully modular and editable, while the installable runtime is reduced to two self-contained JavaScript payloads: the main Foundry runtime and the encounter-generation Worker. This removes the child ES-module request chain that could prevent API exposure.

- Module: `1.8.8`
- Helper API: `2.7.5`
- Schema: `4`
- New startup/bundle regressions: included
- Deliverables: source, installable, and documentation ZIPs

No world migration or dependant API change is required.

A licensed Foundry VTT browser runtime was unavailable. Clean-start semantics are validated with the generated bundle under a mocked Foundry v13 lifecycle; final live multi-module qualification remains in `TEST-PLAN.md`.
