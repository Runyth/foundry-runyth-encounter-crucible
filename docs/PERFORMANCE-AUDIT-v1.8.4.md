# Performance audit — Runyth Encounter Crucible 1.8.4

The v1.8.3 performance architecture remains intact:

- encounter generation runs in a dedicated ES-module Worker where available;
- the fallback yields cooperatively to the browser;
- progress and cancellation remain supported;
- generation uses bounded search-state retention;
- Actor candidates and folder indexes remain cached with precise invalidation;
- UI refreshes remain coalesced;
- extension models and Token prototype resolution remain concurrent where safe.

The new capability namespace adds constant-size frozen descriptors and direct references to existing functions. It does not duplicate engines, caches, listeners, Workers, hooks, or Foundry Documents. Capability detection is constant time through `capabilityMap` and `hasCapability()`.

No performance regression was identified in the complete production source scan. The synchronous generator remains available only as an explicit compatibility and off-main-thread helper; browser integrations should use `encounterGeneration.generate()` or `generateEncounterAsync()`.
