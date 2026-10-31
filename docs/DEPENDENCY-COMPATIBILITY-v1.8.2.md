# Dependency compatibility — Encounter Crucible 1.8.2

## Correct detection contract

Dependent modules should resolve the required package through its permanent technical ID:

```javascript
const module = game.modules.get("encounter-crucible");
const api = module?.api;
```

Encounter Crucible 1.8.2 attaches the frozen API object during ES-module evaluation, before Foundry calls dependent `init` callbacks. The same object is attached again idempotently during `init` and remains available during `ready`.

Recommended validation:

```javascript
if (!module?.active || !api) {
  throw new Error("Encounter Crucible is missing or inactive.");
}
api.assertModuleVersion(">=1.8.1");
api.assertApiVersion(">=2.7.1");
await api.whenReady();
```

Do not use lexical string comparison for semantic versions. For example, lexical comparison incorrectly orders `2.10.0` below `2.9.0`. The public compatibility methods use numeric semantic-version components.

## Readiness distinction

API availability and world readiness are separate:

- Early availability permits registration of models, system adapters, and resource providers.
- `await api.whenReady()` is required before operations depending on ready-stage Foundry services.
- `encounterCrucibleReady(api)` still fires once during `init`.
- `encounterCrucibleApiReady(api)` still fires once during `ready`.

## Compatibility aliases

The canonical version property is `api.apiVersion`. Version 1.8.2 also publishes stable aliases for dependants that previously used common alternate names. All aliases identify Helper API `2.7.1`; module identity remains separately available as `api.moduleVersion`.

## Failure diagnosis

A dependant should distinguish:

1. package missing;
2. package installed but inactive;
3. module version below the required floor;
4. API unavailable because another package bypassed manifest dependency ordering;
5. Helper API version incompatible;
6. API available but Foundry not yet ready.

A single generic error should not be shown when the package and API are compatible.
