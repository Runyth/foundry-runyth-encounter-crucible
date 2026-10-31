# Encounter Crucible v1.4.2 compatibility and quality audit

## Scope

The complete v1.4.1 production tree, tests, manifest, templates, styles, localization, persistence, packaging, and public extension API were re-audited. The patch preserves Helper API `2.7.1`, schema `4`, existing settings, encounter models, generation semantics, and all documented entry points.

## Issues found and corrected

| Issue | Affected files | Root cause | Correction |
|---|---|---|---|
| Repeatedly analysed encounters could become circular and fail setting or Journal serialization | `scripts/core/calculations.js`, `scripts/api.js` | `assessment.context` retained the live encounter; assigning the assessment back to that encounter introduced a cycle and nested prior assessments | Assessment context is now a detached, deliberately selected JSON-safe snapshot; prior assessments are excluded before recalculation |
| Combat and Token conversion performed the core calculation twice | `scripts/services/combat-service.js`, `scripts/api.js` | Conversion helpers calculated an assessment and the API immediately recalculated it | Conversion now builds the definition once; the API remains the single analysis owner |
| Optional extension predicates could abort core analysis and third-party models could collide with built-ins | `scripts/api.js` | `supports()` ran outside the extension error boundary and model IDs were only checked against third-party registrations | Sync or async predicates and calculations are isolated together; built-in IDs are reserved |
| Identical Combat Tracker rerenders repeated passive analysis | `scripts/combat-tracker.js`, refresh integration | The panel was idempotent, but every new tracker DOM render still recalculated the same Combat state | A state fingerprint caches one passive preview promise and invalidates when relevant Combat, Actor, resource, or setting data changes |
| Workshop rerenders discarded unsaved filters, count limits, tactical choices, and candidate selections | `scripts/apps/workshop.js`, `templates/workshop.hbs` | Form values were reconstructed from defaults instead of an owned application state | Added durable in-window form state, rerender-safe selection capture, explicit Apply/Clear filters, and Enter-to-filter behavior |
| Very large Actor folder and candidate sets were awkward and potentially expensive | `scripts/apps/workshop.js`, `scripts/services/folder-service.js`, template, localization | Folder labels lacked ancestry/search, all candidates rendered at once, and recursive traversal repeatedly scanned prior descendants | Added path-aware folder filtering, name/CR candidate filtering, a 300-row render cap with counts, preserved hidden selections, and cycle-safe indexed folder traversal |
| Settings-menu Workshop and normal Workshop shared an application ID | `scripts/apps/workshop.js` | The settings launcher inherited the primary ID | Assigned a unique settings-launcher ID and class |
| Long button text and wide tables could clip in narrow ApplicationV2 windows | templates and `styles/encounter-crucible.css` | Viewport media queries alone do not reflect a resized Foundry window; buttons and tables lacked explicit overflow safeguards | Added container queries, wrapping, padding, busy-state styling, and horizontal table wrappers, all beneath module-owned roots |
| Slow actions offered no feedback and repeated submits could be attempted | `scripts/apps/application-lifecycle.js` | Pending-action deduplication existed without an initiating-control busy state | The initiating button is disabled, marked `aria-busy`, styled, and restored in `finally`; listeners remain abortable and root-owned |
| D&D 5e 5.3 spell-slot objects may omit an explicit level field | `scripts/services/actor-normalizer.js` | Weighting relied primarily on `slot.level` | Slot level is derived from canonical `spell1` through `spell9` keys when necessary |
| Arbitrary UUIDs could be normalized as though they were Actor-bearing Documents | `scripts/services/actor-normalizer.js` | Resolution accepted any object with a coincidental shape | UUID normalization now positively requires an Actor or Token document |
| Empty-party official models reported misleading confidence and empty 2014 rosters received a non-neutral multiplier | `scripts/core/calculations.js` | Confidence compared two empty arrays and multiplier lookup assumed at least one enemy | Empty valid parties now report zero confidence with warnings; zero enemies use multiplier `1` |
| Minimum and maximum generated group-size choices were not retained in saved generation metadata | `scripts/core/encounter.js`, `scripts/apps/workshop.js` | Only the resolved composition mode and fixed size were saved | Generation metadata now stores and restores effective minimum and maximum counts without changing schema version |
| Placement could report success with no resolvable Actors, and partial Token/Combat operations could remain after failure | `scripts/services/placement-service.js` | The workflow lacked positive output checks and transaction cleanup | Empty/unresolvable placement and empty Combat creation reject; partial Combats and newly placed Tokens roll back by default |
| Saved Journal flags did not necessarily contain the final Journal UUID | `scripts/services/persistence-service.js` | `journalUuid` became known only after the initial create call | The final encounter flag is written after creation; failure deletes the partial Journal |
| Generated Journal content was partly hard-coded in English | persistence service and localization files | Runtime Journal HTML did not use the module localization catalog | Headings, field labels, model labels, and difficulty labels now localize in English and German |
| Declared D&D 5e range stopped at 5.2.x | `module.json`, compatibility documentation | The previous release deliberately retained a conservative maximum | Static adapter and regression validation supports declaring 5.3.x; `verified` remains 5.2.2 pending licensed runtime qualification |

## Foundry v13 and interference audit

- ApplicationV2 and `HandlebarsApplicationMixin` remain the only application framework.
- All actions remain `ec-*`; no reserved generic `tab` action is used.
- Hook registration remains one-time and limited to module lifecycle, Scene Controls, Combat Tracker, relevant Combat documents, relevant Actors, and canvas readiness.
- Native DOM APIs are used; no jQuery assumption or wrapper remains.
- CSS remains scoped to `.encounter-crucible` or `.encounter-crucible-tracker`; no global window chrome, form, button, accessibility, Token nameplate, or z-index rule exists.
- There is no Actor-sheet, Item-sheet, Tidy-sheet, advancement, level-up, rest, roll, activity, effect, importer, Token HUD, canvas-overlay, Chat-render, raw keyboard, or socket integration.
- Scene Controls retain the Foundry v13 record-shaped `controls.tokens.tools` contract and idempotent tool insertion.
- Chat retains one explicit `ChatMessage.create()` path and no render hook.
- Namespaced `foundry.documents` classes remain in use.
- Unsupported sheets and unrelated integrations cannot suppress settings, API exposure, Scene Controls, or Combat Tracker startup.

## Intentionally unchanged behavior

- D&D 2024 and 2014 budget calculations, CR ratio, action economy, resources, tactical context, volatility, confidence aggregation, and model weighting.
- Encounter generation modes and public option names.
- Actor, Token, party, Journal, placement, and Combat public API signatures.
- All setting keys and scopes.
- Helper API `2.7.1` and schema `4`.
- GM-only private-world operations and configurable Chat-summary visibility.
- No automatic world migration or eager writes to Actors, Items, Tokens, Scenes, or Users.

## External errors

No external-package error log was supplied for this patch, and no third-party defect was reproduced in the static environment. No monkey patch, broad suppression, DOM workaround, or shim was added for another module.

## Runtime limitation

A licensed Foundry VTT browser runtime was unavailable. Automated and static tests cover contracts and regressions, but live GM/player testing with core D&D 5e, D&D 5e 5.3.x, Tidy Modern, Tidy Classic, and representative active modules remains documented in `docs/TEST-PLAN.md` and is not falsely claimed as completed.
