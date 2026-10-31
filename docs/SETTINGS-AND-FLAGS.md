# Settings and flags

All settings use the `encounter-crucible` namespace.

## World settings

| Key | Type | Configured by | Purpose |
|---|---|---|---|
| `showCombatTrackerBanner` | Boolean | GM | Displays the GM-only Combat Tracker panel |
| `includeCurrentResources` | Boolean | GM | Enables current-resource interpretation |
| `includeDefeatedCombatants` | Boolean | GM | Includes defeated combatants in active-Combat analysis |
| `allyContribution` | Number | GM | Default friendly-NPC contribution |
| `playerVisibility` | String | GM | `hidden`, `vague`, or `full` Chat-summary visibility |
| `journalRootFolder` | String | GM | Root Journal folder name |
| `savedNameFormat` | String | GM | Saved encounter name template |
| `rememberLastEncounter` | Boolean | GM | Allows assessed encounters to be retained |
| `lastEncounter` | Object | Hidden | Latest retained encounter definition |
| `debugLogging` | Boolean | GM | Additional console diagnostics |

`lastEncounter` is written only by a GM and only when `rememberLastEncounter` is enabled. Passive Combat Tracker previews never write it. Stored encounters and `assessment.context` are detached JSON-serializable snapshots.

## Client settings

| Key | Type | Purpose |
|---|---|---|
| `dashboardPosition` | Object | Dashboard position and size |
| `workshopPosition` | Object | Workshop position and size |

Only finite numeric `left`, `top`, `width`, and `height` fields are persisted.

## Journal flags

Saved Journal Entries contain:

```text
flags.encounter-crucible.kind = "encounter"
flags.encounter-crucible.schemaVersion = 4
flags.encounter-crucible.encounter = <EncounterDefinition>
```

## Data compatibility

- Persistent schema remains `4`.
- Existing saved Journal flags and the hidden setting remain compatible.
- No Actor, Item, Token, Scene, or User flags are defined.
- No eager world migration runs.
- No migration writes to Actors, Tokens, Scenes, or Items.
- Synthetic Token Actors and duplicated Actors are normalized at read time.
- Disabling or uninstalling the module leaves all Foundry Documents intact.
- No manual world migration is required for v1.8.3.
