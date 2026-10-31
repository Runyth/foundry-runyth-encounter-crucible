# Dependency compatibility — Encounter Crucible 1.8.6

## Released contract

- Module: `1.8.6`
- Helper API: `2.7.4`
- Encounter-generation capability: `1.0.1`
- Persistent schema: `4`

## Forge detection

The canonical capability is available through all supported detection styles:

- `api.encounterGeneration`
- `api.features.encounterGeneration`
- `api.capabilities.includes("encounterGeneration")`
- `api.capabilities.encounterGeneration`
- `api.capabilityMap.encounterGeneration`
- `api.getCapability("encounterGeneration")`
- `api.getCapabilityDescriptor("encounterGeneration")`
- `api.hasCapability("encounterGeneration", ">=1.0.0")`

Existing dependants requiring module `>=1.8.1` and Helper API `>=2.7.1 <3.0.0` remain compatible.
