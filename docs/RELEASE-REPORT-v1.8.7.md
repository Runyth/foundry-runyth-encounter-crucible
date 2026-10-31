# Release report — Encounter Crucible 1.8.7

Version 1.8.7 fixes the public Helper API contract required by a campaign helper. The core now owns Actor collection and authoritative encounter assessment as discoverable capabilities, allowing campaign helpers to remain consumers of Encounter Crucible rather than duplicating its Foundry traversal, normalization, or difficulty logic.

- Module: `1.8.7`
- Helper API: `2.7.5`
- `encounterGeneration`: `1.0.1`
- `collectActors`: `1.0.0`
- `assessEncounter`: `1.0.0`
- Schema: `4`
- Automated tests: `92/92`
- Localization: `138/138` keys aligned between English and German
- Runtime modules validated: `27`
- Deliverables: source, installable, and documentation ZIPs

No world migration is required. Existing public methods and capability contracts remain available.

A licensed Foundry VTT browser runtime was unavailable in the build environment. Static, unit, mocked-runtime, packaging, and reproducibility validation are performed here; final live integration steps remain documented in `TEST-PLAN.md`.
