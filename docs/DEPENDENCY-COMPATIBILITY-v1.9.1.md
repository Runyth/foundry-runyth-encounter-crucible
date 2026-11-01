# Dependency compatibility — Encounter Crucible 1.9.1

## Released contract

- Module: `1.9.1`
- Helper API: `2.7.5`
- Encounter-generation capability: `1.0.1`
- Actor-collection capability: `1.0.0`
- Encounter-assessment capability: `1.0.0`
- Helper-module-registry capability: `1.0.0`
- Persistent schema: `4`

## Startup contract

The installable core is now a self-contained ES-module bundle. Evaluating `scripts/main.js` does not require browser requests for `core/encounter.js`, `services/generation-service.js`, `services/actor-normalizer.js`, or any other internal source module. Therefore the public API can be attached before helper modules perform `init`-stage compatibility checks.

Automated startup regression coverage verifies:

- `game.modules.get("encounter-crucible").api` exists immediately after the generated runtime evaluates;
- Helper API is exactly `2.7.5`;
- `encounterGeneration`, `collectActors`, `assessEncounter`, and `helperModuleRegistry` are available;
- Encounter Crucible: Forge can register;
- a campaign helper can register;
- registration remains available before Encounter Crucible's own `init` callback.

Existing dependants requiring module `>=1.8.1` and Helper API `>=2.7.1 <3.0.0` remain compatible.
