# Public API

The canonical API is available as soon as Encounter Crucible's ES module has loaded:

```javascript
const api = game.modules.get("encounter-crucible")?.api;
```

Aliases:

```javascript
const api = game.encounterCrucible;
const sameApi = game.encounterCrucibleApi;
```

- Module version: `1.8.8`
- Helper API version: `2.7.5`
- Persistent encounter schema: `4`

The early object is the same frozen API object used during `init` and `ready`. Registration methods can be used immediately. A dependant that needs registered settings, documents, canvas state, or other ready-stage services should call `await api.whenReady()`.

## Version and readiness contract

Stable fields and aliases:

| Property | Value | Purpose |
|---|---|---|
| `version` | `2.7.5` | Compatibility alias for Helper API version |
| `apiVersion` | `2.7.5` | Canonical Helper API version |
| `helperApiVersion` | `2.7.5` | Descriptive alias |
| `helperAPIVersion` | `2.7.5` | Legacy-capitalization alias |
| `helperVersion` | `2.7.5` | Concise alias |
| `API_VERSION` | `2.7.5` | Constant-style alias |
| `HELPER_API_VERSION` | `2.7.5` | Explicit constant-style alias |
| `moduleVersion` | `1.8.8` | Installed module version |
| `coreVersion` | `1.8.8` | Core-module alias |
| `MODULE_VERSION` | `1.8.8` | Constant-style module alias |
| `schemaVersion` | `4` | Persistent encounter schema |
| `helperApi` | Frozen descriptor | API, module, and schema versions |
| `compatibility` | Frozen descriptor | Module ID and compatibility versions |
| `isReady` | Boolean getter | Whether Foundry `ready` completed |

Methods:

- `whenReady()` returns a Promise resolving to the same API object.
- `getCompatibility()` returns a detached compatibility descriptor.
- `isApiVersionSupported(requirement)` checks exact or ranged Helper API compatibility.
- `assertApiVersion(requirement)` throws on an incompatible Helper API.
- `isModuleVersionSupported(requirement)` checks the installed core version.
- `assertModuleVersion(requirement)` throws on an incompatible core version.

Requirements may be exact (`2.7.1`), comparative (`>=2.7.1`), bounded (`>=2.7.1 <3.0.0`), caret, tilde, wildcard, inclusive hyphen ranges, or `{ minimum, maximum }` objects.

Recommended dependant startup:

```javascript
const api = game.modules.get("encounter-crucible")?.api;
if (!api) throw new Error("Encounter Crucible is unavailable.");
api.assertModuleVersion(">=1.8.1");
api.assertApiVersion(">=2.7.1");
await api.whenReady();
```

No existing method signature or extension contract changed in this patch.

## Capability discovery

Encounter Crucible 1.8.8 exposes the named `encounterGeneration` capability required by Forge and other generation helpers:

```javascript
const api = game.modules.get("encounter-crucible")?.api;
api.assertApiVersion(">=2.7.1 <3.0.0");
api.assertCapability("encounterGeneration");
const generation = api.encounterGeneration;
```

Stable discovery surfaces:

- `api.encounterGeneration` — frozen callable generation capability namespace.
- `api.capabilities` and `api.supportedCapabilities` — frozen capability-name arrays which also expose named capability properties such as `api.capabilities.encounterGeneration`.
- `api.capabilityMap.encounterGeneration` — boolean lookup.
- `api.capabilityVersions.encounterGeneration` — capability-version lookup.
- `api.capabilityDescriptors.encounterGeneration` — immutable descriptor with `id`, `version`, `available`, and `api`.
- `api.features.encounterGeneration` — namespace lookup.
- `api.helperApi.encounterGeneration` — Helper API descriptor lookup.
- `api.compatibility.capabilities` — dependency metadata.
- `api.hasCapability(name, requirement?)`, `api.getCapability(name)`, `api.getCapabilityDescriptor(name)`, `api.getCapabilityVersion(name)`, and `api.assertCapability(name, requirement?)` — runtime and version checks.

The namespace has capability version `1.0.1` and exposes:

- `createEncounterDefinition`
- `resolveCompositionMode`
- `targetBudgetForDifficulty`
- `generate` and `generateAsync` — aliases of browser-safe `generateEncounterAsync`
- `generateSync` — alias of synchronous `generateEncounter`
- `generateEncounter` and `generateEncounterAsync`
- normalization, party discovery, Actor-folder browsing, analysis, persistence, placement, and Combat helpers

Existing top-level methods are retained with the same signatures. GM-only methods remain permission checked in both locations.

## Actor collection and assessment capabilities

Encounter Crucible 1.8.8 exposes two additional Helper API capabilities used by campaign-specific helpers such as a campaign helper:

- `collectActors` (`1.0.0`) — GM-authorized Actor collection. With no options it returns world Actor Documents. It accepts a folder id or `{ folderId, recursive, types, normalized, side, contribution }`. Set `normalized: true` to return Encounter Crucible participant data using the core normalizer. Existing `actorCandidates()` remains the normalized NPC-only convenience API.
- `assessEncounter` (`1.0.0`) — authoritative Encounter Crucible assessment for a caller-supplied encounter definition. It delegates to the normal calculation engine and defaults to `remember: false` and `emitHooks: false`, preventing helper previews from persisting transient candidates or emitting duplicate lifecycle hooks. Explicit caller options may override those defaults.

Both are available through direct API properties, `helperApi`, `features`, `capabilities`, `capabilityMap`, `capabilityVersions`, and `capabilityDescriptors`. Their function objects also expose `supports(requirement)` and `assertVersion(requirement)`.

```javascript
const core = game.modules.get("encounter-crucible")?.api;
core.assertCapability("collectActors");
core.assertCapability("assessEncounter");

const actors = core.collectActors({ folderId, recursive: true });
const normalized = core.collectActors({ actors, normalized: true });
const assessment = await core.assessEncounter(encounter);
```

## Helper-module registry

Encounter Crucible exposes a lifecycle-safe helper registry for Forge and other companion modules. The canonical registration form is:

```javascript
const core = game.modules.get("encounter-crucible")?.api;
const registration = core.registerHelperModule({
  id: "encounter-crucible-forge",
  version: "1.0.0",
  api: forgeApi,
  capabilities: ["encounterGeneration"]
});
```

Supported registration signatures:

- `registerHelperModule(descriptor)`
- `registerHelperModule(moduleId, api)`
- `registerHelperModule(moduleId, version, api)`
- `registerHelperModule(moduleId, api, options)`

Stable surfaces:

- `registerHelperModule()` and `registerHelper()`
- `unregisterHelperModule()` and `unregisterHelper()`
- `getHelperModule()` and `getHelper()`
- `hasHelperModule()` and `hasHelper()`
- `listHelperModules()` and `listHelpers()`
- `helperModules`, `helperRegistry`, and `helpers` — the same frozen registry namespace
- `helperApi.registerHelperModule` and `helperApi.helperModuleRegistry`
- `getCapability("helperModuleRegistry")`

Registration descriptors are frozen snapshots containing `id`, `moduleId`, `version`, `moduleVersion`, `api`, `capabilities`, and `metadata`. Re-registering the same API object with the same version and capabilities is idempotent. A conflicting duplicate ID is rejected unless the caller explicitly supplies `replace: true`.

## Permissions

Methods which inspect hidden world content or change Foundry Documents require the current user to be a GM. This includes active-Combat and selected-Token analysis, Actor-folder browsing, saved-encounter listing, Journal persistence, Token placement, Combat creation, and both module applications.

`analyseDefinition` and pure construction or normalization helpers may be used with caller-supplied data. They do not grant Document permissions.

## Analysis

- `analyseCombat(combat?, options?)`
- `analyseTokens(tokens?, options?)`
- `analyseDefinition(encounter, options?)`

Supported analysis options include:

| Option | Effect |
|---|---|
| `includeCurrentResources` | Overrides the world resource-setting for this analysis |
| `includeDefeated` | Overrides defeated-combatant inclusion |
| `remember: false` | Does not write the hidden last-encounter setting |
| `emitHooks: false` | Suppresses before/after integration hooks for passive previews |
| `extensionModels: false` | Suppresses third-party model execution for passive previews |

Combat Tracker previews use all three passive options so a render cannot persist state, execute extension models, or emit analysis hooks. Identical Combat states reuse one cached preview promise until relevant Combat, Actor, resource, or settings data changes.

## Assessment serialization

`assessment.context` is a detached, JSON-serializable snapshot of the encounter inputs. It never contains the live encounter object or a prior `assessment`. Repeated analysis therefore remains safe for world settings, Journal flags, cloning, and JSON transport.

## Actor and party helpers

- `normalizeActor(actor, options?)`
- `normalizeToken(tokenDocument, overrides?)`
- `normalizeUuid(uuid, options?)`
- `discoverParty()`
- `discoverPartyActors()`
- `actorCandidates(folderId?, recursive?)` — GM only
- `actorsInFolder(folderId, recursive?)` — GM only
- `descendantActorFolders(folder)` — GM only

## Encounter construction

- `createEncounterDefinition(data?)`
- `resolveCompositionMode(options?)`
- `generateEncounter(options)` — synchronous pure helper for integrations already running outside the browser main thread
- `generateEncounterAsync(options, runtimeOptions?)` — preferred browser-safe generator

`generateEncounterAsync` uses a dedicated same-origin ES-module Worker when supported. Runtime options accept `signal`, `onProgress`, and `preferWorker`. The Promise rejects with an `AbortError` when the supplied `AbortSignal` is cancelled. When Worker construction is unavailable, the same search runs through a cooperative yielding fallback so Foundry can continue painting and processing input.

Composition-mode truth table:

| Prefer quantity | Prefer strength | Fixed size | Result |
|---|---|---:|---|
| Off | Off | 0 | `neutral` |
| On | Off | 0 | `quantity` |
| Off | On | 0 | `strength` |
| On | On | 0 | `hybrid` |
| Any | Any | >0 | `fixed` |

## Persistence and placement

- `saveEncounter(encounter, options?)` — GM only
- `encounterFromJournal(journal)`
- `listSavedEncounters()` — GM only
- `placeEncounter(encounter, options?)` — GM only
- `createCombatFromTokens(tokens, options?)` — GM only
- `placeAndCreateCombat(encounter, options?)` — GM only

Document creation uses Foundry v13 namespaced document classes under `foundry.documents`. Placement and Combat creation are transactional by default: partial Combats and newly placed Tokens are rolled back when the combined operation fails. Pass `rollbackOnFailure: false` to `placeAndCreateCombat` only when intentionally retaining placed Tokens.

## UI

- `openDashboard(encounter?)` — GM only
- `openWorkshop(encounter?)` — GM only

The applications use ApplicationV2 and module-owned `ec-*` actions. Repeated and partial renders replace listeners through an owned `AbortController`.

## Extensions

- `registerModel(model)` / `unregisterModel(id)` / `listModels()`
- `registerSystemAdapter(adapter)` / `getSystemAdapter(id?)`
- `registerResourceProvider(provider)` / `listResourceProviders()`

A model has a stable non-built-in `id`, an optional sync or async `supports(context, options)` predicate, and an async `calculate(context, options)` method. Built-in model IDs are reserved. Independent extension models are evaluated concurrently and merged back in registration order. A failed optional predicate or calculation is reported and isolated from the core result.

## Hooks

- `encounterCrucibleReady(api)` during `init`
- `encounterCrucibleApiReady(api)` during `ready`
- `encounterCrucibleBeforeAnalyse(subject, options)` before active-Combat analysis; returning `false` vetoes it
- `encounterCrucibleAfterAnalyse(assessment, encounter)` after a completed analysis
- `encounterCrucibleHelperRegistered(descriptor, previous)` after helper registration or replacement
- `encounterCrucibleHelperUnregistered(descriptor)` after helper removal

Each lifecycle hook is emitted once. Passive Combat Tracker previews suppress analysis hooks.

## Sockets

Encounter Crucible v1.8.8 registers no socket channel or socket messages. `module.json` declares `"socket": false`.
