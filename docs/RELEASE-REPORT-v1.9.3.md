# Release report — Runyth Encounter Crucible 1.9.3

Version 1.9.3 fixes the combat tracker banner duplication reported after the Runyth rebrand: the dedupe guard could never match the banner the module mounted itself (attribute spelling drift from the rebrand), so tracker re-renders kept mounting additional banners until the tracker column flooded. The guard now matches the written attribute and every render purges historic banners.

- Module: `1.9.3`
- Helper API: `2.7.5`
- Schema: `4`
- New banner regression: included
- Deliverables: source, installable, and documentation ZIPs

No world migration or dependant API change is required. Worlds that already show duplicated banners receive a single banner at the next tracker render after updating.

A licensed Foundry VTT browser runtime was unavailable. Banner behavior is validated with a DOM-mocked tracker render harness; final live multi-module qualification remains in `TEST-PLAN.md`.
