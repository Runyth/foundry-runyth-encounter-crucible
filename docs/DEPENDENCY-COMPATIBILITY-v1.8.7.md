# Dependency compatibility — Encounter Crucible 1.8.7

## Released contract

- Module: `1.8.7`
- Helper API: `2.7.5`
- Encounter-generation capability: `1.0.1`
- Actor-collection capability: `1.0.0`
- Encounter-assessment capability: `1.0.0`
- Helper-module-registry capability: `1.0.0`
- Persistent schema: `4`

## a campaign helper compatibility

a campaign helper requires the public Helper API capabilities `collectActors` and `assessEncounter`. Version 1.8.7 implements and advertises both capabilities through every supported discovery surface.

`collectActors` gives helper modules an authorized core-owned Actor collection path without requiring direct traversal of Foundry collections or duplication of Encounter Crucible's recursive folder logic. Raw Actor Documents are returned by default so campaign helpers can inspect their own metadata; optional normalization delegates to Encounter Crucible's existing participant normalizer.

`assessEncounter` delegates to Encounter Crucible's authoritative assessment engine. Helper preview calls are side-effect-safe by default: they do not remember the encounter or emit assessment hooks unless explicitly requested.

## Capability discovery

The canonical capabilities are available through:

- direct public API functions such as `api.collectActors` and `api.assessEncounter`;
- `api.features.<capability>`;
- `api.capabilities.includes("<capability>")`;
- `api.capabilities.<capability>`;
- `api.capabilityMap.<capability>`;
- `api.getCapability("<capability>")`;
- `api.getCapabilityDescriptor("<capability>")`;
- `api.hasCapability("<capability>", "<version-range>")`.

Existing dependants requiring module `>=1.8.1` and Helper API `>=2.7.1 <3.0.0` remain compatible.
