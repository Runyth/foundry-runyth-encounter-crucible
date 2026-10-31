# Dependency compatibility — Encounter Crucible 1.8.4

## Released contract

- Module version: `1.8.4`
- Helper API: `2.7.2`
- Persistent schema: `4`
- Required capability supplied: `encounterGeneration`
- Capability version: `1.0.0`
- Canonical API: `game.modules.get("encounter-crucible")?.api`
- Existing aliases: `game.encounterCrucible` and `game.encounterCrucibleApi`

Encounter Crucible: Forge requires module `1.8.1` or newer, Helper API `2.7.1` or newer within major version `2`, and the `encounterGeneration` capability. Version 1.8.4 satisfies all three requirements.

## Recommended dependency check

```javascript
const api = game.modules.get("encounter-crucible")?.api;
if (!api) throw new Error("Encounter Crucible is unavailable.");
api.assertModuleVersion(">=1.8.1");
api.assertApiVersion(">=2.7.1 <3.0.0");
api.assertCapability("encounterGeneration");
await api.whenReady();
```

The API object is exposed before dependent `init` callbacks and remains the same frozen object through `init` and `ready`.

## Capability lookup compatibility

All of the following identify the same supported capability:

```javascript
api.encounterGeneration;
api.features.encounterGeneration;
api.helperApi.encounterGeneration;
api.capabilities.includes("encounterGeneration");
api.supportedCapabilities.includes("encounterGeneration");
api.capabilityMap.encounterGeneration;
api.hasCapability("encounterGeneration");
api.getCapability("encounterGeneration");
```

The namespace contains both current and compatibility-oriented names:

- `generate` and `generateAsync` point to the Worker-backed browser-safe generator;
- `generateSync` points to the synchronous pure generator;
- `generateEncounter` and `generateEncounterAsync` retain the established names;
- construction, difficulty-budget, normalization, party, Actor-folder, analysis, persistence, placement, and Combat helpers are grouped under the namespace;
- every pre-existing top-level API method remains present.

GM-only functions retain the same permission enforcement whether invoked from the top-level API or the capability namespace.
