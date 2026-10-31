# Dependency compatibility — Encounter Crucible 1.8.3

Encounter Crucible 1.8.3 preserves the dependency contract introduced in 1.8.2.

- Module version: `1.8.3`
- Helper API: `2.7.1`
- Data schema: `4`
- Canonical API: `game.modules.get("encounter-crucible")?.api`
- Existing aliases: `game.encounterCrucible` and `game.encounterCrucibleApi`
- Early exposure before dependent `init` callbacks remains unchanged.
- `whenReady()`, version assertions, compatibility descriptors, model registration, and all existing signatures remain available.

The additive `generateEncounterAsync(options, runtimeOptions?)` method provides browser-safe generation. Existing dependants using synchronous `generateEncounter(options)` continue to work unchanged.

Recommended detection remains:

```javascript
const api = game.modules.get("encounter-crucible")?.api;
if (!api?.isModuleVersionSupported(">=1.8.1")) throw new Error("Encounter Crucible 1.8.1 or newer is required.");
api.assertApiVersion(">=2.7.1");
await api.whenReady();
```
