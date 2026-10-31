# Dependency compatibility — Encounter Crucible 1.8.5

## Resolved failure

The supplied Foundry startup log showed Encounter Crucible 1.8.4 initializing successfully with Helper API 2.7.2, followed by Encounter Crucible: Forge rejecting the integration with reason `helper-registry-missing`.

The module and API versions already satisfied Forge's minimums, and `encounterGeneration` was present. The missing contract was helper-module registration.

## Released contract

- Encounter Crucible module: `1.8.5`
- Helper API: `2.7.3`
- Persistent schema: `4`
- Encounter-generation capability: `1.0.0`
- Helper-module registry: `1.0.0`

Canonical Forge-style registration:

```javascript
const core = game.modules.get("encounter-crucible")?.api;
core.assertModuleVersion(">=1.8.1");
core.assertApiVersion(">=2.7.1 <3.0.0");
core.assertCapability("encounterGeneration");
core.assertCapability("helperModuleRegistry");

const registration = core.registerHelperModule({
  id: "encounter-crucible-forge",
  version: "1.0.0",
  api: forgeApi,
  capabilities: ["encounterGeneration"]
});
```

The following access paths are equivalent:

```javascript
core.registerHelperModule;
core.registerHelper;
core.helperModules.register;
core.helperRegistry.register;
core.helpers.register;
core.helperApi.registerHelperModule;
```

The API also supplies corresponding unregister, lookup, presence, and list operations.

## Compatibility behavior

- Existing top-level API methods are unchanged.
- Existing Helper API requirements such as `>=2.7.1 <3.0.0` remain satisfied.
- Registration can occur immediately after the core ES module is evaluated, before dependent `init` callbacks.
- Registering the same helper API, version, and capabilities again returns the existing descriptor.
- A conflicting duplicate ID throws unless `replace: true` is explicit.
- Registration requires no socket and grants no additional Foundry Document permission.
