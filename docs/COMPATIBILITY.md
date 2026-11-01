# Compatibility

## Supported baseline

- Foundry VTT: minimum `13`, verified `13.351`, maximum `13`
- D&D 5e: minimum `4.2.0`, manifest verified `5.2.2`, declared maximum `5.3.x`
- Runyth Encounter Crucible Helper API: `2.7.5`
- Persistent schema: `4`

D&D 5e 5.3.x is included in the declared maximum after static validation of the structured Actor paths used by the adapter, including spell-slot keys. The manifest verified value remains 5.2.2 because this release environment did not contain a licensed Foundry browser runtime. The current official D&D 5e package and release information is available at https://foundryvtt.com/packages/dnd5e and https://github.com/foundryvtt/dnd5e/releases.

## Foundry v13 integration contracts

- Applications use `foundry.applications.api.ApplicationV2` with `HandlebarsApplicationMixin`.
- Application actions use module-specific `data-action="ec-*"` values.
- Render listeners are delegated only from module-owned roots, replaced with an `AbortController`, and removed on close.
- Pending actions disable only their initiating control and cannot execute twice.
- Encounter generation executes in a same-origin module Worker; the Workshop remains interactive and cancellable.
- Environments without Worker support use a cooperative yielding fallback rather than one uninterrupted synchronous search.
- Window positions persist only finite `left`, `top`, `width`, and `height` fields in client settings.
- Scene Controls use the v13 record structure: `controls.tokens.tools[toolId]`.
- Render-hook HTML is treated as a native `HTMLElement`.
- Document creation uses namespaced `foundry.documents` classes.
- The module creates passive Chat HTML through one `ChatMessage.create()` call and registers no Chat render hook.
- No jQuery compatibility wrapper or deprecated ApplicationV1 class is used.
- The public API is exposed before dependent modules run their `init` callbacks.
- Companion modules register through a frozen helper registry without requiring sockets, monkey patches, or mutable public maps.
- Identical helper registrations are idempotent; conflicting duplicate IDs fail explicitly.

Relevant Foundry v13 references:

- https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html
- https://foundryvtt.com/api/v13/functions/hookEvents.getSceneControlButtons.html
- https://foundryvtt.com/api/v13/functions/hookEvents.renderChatMessageHTML.html
- https://foundryvtt.com/api/v13/modules/foundry.documents.html

## Isolation by surface

| Surface | v1.8.8 behavior |
|---|---|
| Core and custom Actor sheets | No injection or styling |
| Core and custom Item sheets | No injection or styling |
| Tidy 5e Modern and Classic | No sheet injection; structurally isolated |
| Advancement, level-up, roll, rest, activity, effect, import, and migration dialogs | No generic Application or Actor hook; no injection |
| Token HUD | No hook or control |
| Canvas display objects | No PIXI overlay or Token nameplate mutation |
| Scene Controls | One idempotent GM-only tool under Token Controls |
| Combat Tracker | One idempotent GM-only module panel with cached passive analysis |
| Chat | One card per explicit action; no render customization |
| Keybindings | None registered |
| Sockets | None registered |

## Other modules

Application styling is scoped to `.runyth-encounter-crucible`; the Combat Tracker integration uses the unique `.runyth-encounter-crucible-tracker` root. The module does not alter Foundry window chrome, generic buttons, dialogs, sheets, Token nameplates, or z-index values.

No workaround is included for errors attributed to another package. A warning produced by another module while Runyth Encounter Crucible invokes a normal Foundry workflow remains that package's responsibility.
