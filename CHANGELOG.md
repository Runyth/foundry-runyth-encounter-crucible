# Changelog

## 1.8.9 — 2026-11-01

### Published

- Aligned the repository with the AGPL-only publishing contract: added the AGPL notice to `tools/package.py`, removed the legacy all-rights-reserved `LICENSE.md` placeholder, and declared the licence in the lockfile root package.
- Preserved the canonical content version; this patch changes licensing metadata only and requires no content migration.

## 1.8.8 — 2026-10-31

### Published

- Licensed the program under AGPL-3.0-or-later.
- Published install, source, and documentation archives as `-mod`, `-src`, and `-doc`.
- Removed private-campaign names from the public module.

## 1.8.8 - 2026-08-24

- Fixed the startup failure where child ES-module requests such as `scripts/core/encounter.js`, `scripts/services/generation-service.js`, and `scripts/services/actor-normalizer.js` could fail with `net::ERR_FAILED` and suppress the entire public API.
- Replaced the installable runtime's browser module fan-out with one deterministic self-contained core/runtime bundle generated from the editable modular source tree.
- Bundled the encounter-generation Worker separately so Worker startup no longer depends on additional source-module fetches.
- Kept `module/encounter-crucible/scripts/` as the authoritative editable source; generated bundles exist only in the build/installable output.
- Made Worker URL construction Foundry-route-aware through `foundry.utils.getRoute`, with a browser-base fallback for test and degraded environments.
- Added built-runtime validation requiring exactly two JavaScript payloads in the installable module: `scripts/main.js` and `scripts/workers/encounter-generator-worker.js`.
- Added a startup regression harness proving Helper API `2.7.5` is exposed immediately when the generated runtime evaluates, before the Foundry `init` hook.
- Added clean-start registration regression coverage proving both Encounter Crucible: Forge and a campaign helper can register through the helper-module registry after the bundled core loads.
- Preserved Helper API `2.7.5`, all capability versions, schema `4`, settings, flags, saved encounters, generation behavior, permissions, and public API signatures.
- Added no workaround for unrelated module load or deprecation errors.

## 1.8.7 - 2026-08-08

- Added the public `collectActors` Helper API capability required by a campaign helper.
- Added the public `assessEncounter` Helper API capability required by a campaign helper.
- Added direct, Helper API, feature-map, capability-map, version, and descriptor discovery for both capabilities.
- `collectActors` supports world-wide, folder-scoped, recursively folder-scoped, caller-supplied Actor arrays, optional Actor-type filtering, and optional core normalization.
- `assessEncounter` delegates to the authoritative Encounter Crucible analysis engine and defaults helper previews to no persistence and no lifecycle-hook emission.
- Added capability-local semantic-version checks through `supports()` and `assertVersion()`.
- Preserved `actorCandidates`, `analyseDefinition`, `encounterGeneration`, helper-module registration, all existing API signatures, schema `4`, settings, calculations, persistence, placement, and permissions.
- Advanced Helper API from `2.7.4` to `2.7.5` for the additive public capability contract.
- Added regression coverage for a campaign helper capability discovery, Actor collection modes, normalization, permissions, authoritative assessment, and side-effect defaults.

## 1.8.6 - 2026-08-04

- Hardened the existing `encounterGeneration` capability required by Encounter Crucible: Forge without duplicating or replacing its implementation.
- Added a canonical immutable capability catalog shared by top-level API, Helper API, compatibility metadata, and feature lookup surfaces.
- Made `api.capabilities` remain an array while also supporting direct property checks such as `api.capabilities.encounterGeneration`.
- Added immutable capability versions and descriptors through `capabilityVersions` and `capabilityDescriptors`.
- Added `getCapabilityDescriptor()` and `getCapabilityVersion()`.
- Added optional semantic-version requirements to `hasCapability()` and `assertCapability()`.
- Added identity, availability, version-check, and assertion metadata directly to the callable `encounterGeneration` namespace.
- Advanced the encounter-generation capability version from `1.0.0` to `1.0.1` and Helper API from `2.7.3` to `2.7.4` for the additive discovery contract.
- Preserved all previous generation methods, helper registration, calculations, settings, permissions, schema `4`, and compatibility with Helper API `2.7.1+` within major version 2.
- Added capability-catalog, Forge-style detection, descriptor, property lookup, malformed-definition, and version-negotiation regression coverage.

## 1.8.5 - 2026-08-04

- Added the helper-module registration contract required by Encounter Crucible: Forge.
- Added the canonical `registerHelperModule()` method and the `registerHelper()` compatibility alias.
- Added frozen `helperModules`, `helperRegistry`, and `helpers` namespace aliases with register, unregister, lookup, presence, and listing operations.
- Added helper-registry access through `helperApi`, `features`, `capabilityMap`, `getCapability()`, and `compatibility` metadata.
- Added descriptor, `moduleId + api`, `moduleId + version + api`, and `moduleId + api + options` registration signatures.
- Made identical helper registrations idempotent while rejecting conflicting duplicate module IDs unless replacement is explicit.
- Added frozen registration descriptors with normalized version, capabilities, and metadata.
- Added `encounterCrucibleHelperRegistered` and `encounterCrucibleHelperUnregistered` lifecycle hooks.
- Advanced Helper API from `2.7.2` to `2.7.3` for the additive helper-registry contract; existing `>=2.7.1 <3.0.0` integrations remain compatible.
- Preserved encounter generation, calculations, analysis, persistence, placement, Combat creation, settings, permissions, schema `4`, and all existing API methods.
- Confirmed the supplied startup log contains no Encounter Crucible-owned deprecation or runtime exception; unrelated package failures remain intentionally unmodified.
- Added helper-registry, Forge compatibility, lifecycle, duplicate-registration, signature, metadata, and three-archive regression coverage.

## 1.8.4 - 2026-08-04

- Added the explicit frozen callable `encounterGeneration` capability required by Encounter Crucible: Forge.
- Added `capabilities`, `supportedCapabilities`, `capabilityMap`, `features`, `hasCapability()`, and `assertCapability()` discovery surfaces.
- Added the capability to the Helper API and compatibility descriptors so dependants can validate it before and after Foundry `init`.
- Grouped generation construction, budget, normalization, party, Actor-folder, analysis, persistence, placement, and Combat helpers under `api.encounterGeneration`.
- Added `generate`, `generateAsync`, and `generateSync` aliases while preserving `generateEncounter` and `generateEncounterAsync` unchanged.
- Preserved every existing top-level API method and all permission checks.
- Advanced Helper API from `2.7.1` to `2.7.2` for the additive public capability; dependants requiring `>=2.7.1 <3.0.0` remain compatible.
- Preserved data schema `4`, settings, saved encounters, calculations, Worker-backed generation, cancellation, progress, and three-ZIP packaging.
- Added capability detection, immutability, alias parity, synchronous generation, asynchronous generation, and semantic-range regression coverage.

## 1.8.3 - 2026-08-03

- Moved encounter generation into a dedicated ES-module Web Worker so Foundry remains responsive during long searches.
- Added live generation progress, cancellation, and a cooperative yielding fallback for environments without Worker support.
- Reworked the beam search to avoid cloning full candidate Actors for every state and to keep only the best states through a bounded heap.
- Reduced a synthetic 300-candidate, 30-depth generation benchmark from roughly 1.67 seconds to 0.90 seconds on the release host, before Worker isolation.
- Added indexed, cycle-safe Actor-folder traversal and cached normalized NPC candidates with Actor and Folder invalidation hooks.
- Coalesced Combat and Actor-driven UI refreshes to one browser animation frame.
- Replaced large Combat Tracker JSON fingerprints with compact deterministic resource fingerprints.
- Evaluated independent extension models concurrently while preserving registration-order result insertion and isolated failures.
- Resolved Actor UUIDs and Token prototype data concurrently while preserving deterministic placement order.
- Reduced repeated Actor normalization allocations and consolidated spell-slot and resource scans.
- Preserved Helper API `2.7.1`, data schema `4`, settings, saved encounters, calculations, generation modes, permissions, and three-ZIP release packaging.
- Added Worker, cooperative fallback, cancellation, progress, concurrent extension-model, concurrent placement, cache, and responsiveness regression coverage.

## 1.8.2 - 2026-08-03

- Fixed false dependency failures requiring Encounter Crucible 1.8.1+ with Helper API 2.7.1.
- Exposed the public API as soon as the core ES module loads, before dependent modules run their `init` callbacks.
- Kept `init` and `ready` exposure idempotent and preserved the existing lifecycle hooks exactly once.
- Added `whenReady()` and `isReady` for dependants that require fully initialized Foundry services.
- Added stable Helper API aliases: `version`, `apiVersion`, `helperApiVersion`, `helperAPIVersion`, `helperVersion`, `API_VERSION`, and `HELPER_API_VERSION`.
- Added module-version aliases and immutable compatibility descriptors without changing existing API methods.
- Added semantic compatibility helpers for exact, minimum, bounded, caret, tilde, wildcard, and object ranges.
- Added `game.encounterCrucibleApi` while retaining `game.modules.get("encounter-crucible").api` and `game.encounterCrucible`.
- Advanced the module patch version to 1.8.2 while preserving Helper API 2.7.1 and schema 4.
- Added dependency-order, early-exposure, version-range, readiness, archive, and three-bundle packaging regression coverage.
- Changed release delivery to deterministic installable, source, and documentation/report ZIPs.

## 1.4.2 - 2026-08-02

- Fixed circular encounter assessments so repeated analysis, retained settings, and Journal flags remain serializable.
- Eliminated duplicate core calculations and cached unchanged Combat Tracker previews.
- Isolated extension-model predicates and reserved built-in model IDs.
- Added persistent Workshop form state, folder-path and candidate filtering, large-list limits, and unique launcher IDs.
- Added narrow-window container queries, button wrapping, table scrolling, and visible pending-action states.
- Improved D&D 5e 5.3 spell-slot normalization and strict UUID validation; declared 5.3.x maximum compatibility while retaining 5.2.2 as verified.
- Added transactional rollback for partial Journal, Token, and Combat workflows and persisted final Journal UUIDs.
- Localized generated Journal content and retained generated minimum/maximum counts.
- Corrected empty-party confidence and empty 2014-roster multiplier behavior.
- Preserved Helper API `2.7.1`, schema `4`, settings, models, and documented workflows.
- Expanded automated regression, compatibility, persistence, scale, and packaging coverage.

## 1.4.1 - 2026-07-29

- Isolated all Application CSS beneath module-owned roots and retained responsive narrow-window behavior.
- Replaced generic Application action names with module-specific actions and added abortable, idempotent listener ownership.
- Persisted Dashboard and Workshop size and position as client settings.
- Made Combat Tracker and Scene Controls registration and insertion idempotent.
- Updated Scene Controls to the Foundry V13 record-shaped `controls.tokens.tools` API.
- Restricted private encounter analysis, Workshop, Dashboard, candidate browsing, saved-encounter listing, and Chat posting to GMs.
- Prevented passive Combat Tracker previews from writing settings or firing public analysis hooks.
- Removed the Workshop's duplicate unconditional `lastEncounter` write.
- Narrowed Actor update refreshes to Actors referenced by the active Combat or an open Encounter Crucible window.
- Isolated optional integration failures so they cannot suppress unrelated module initialization.
- Moved Folder, JournalEntry, Combat, and ChatMessage use to the Foundry V13 `foundry.documents` namespace.
- Preserved Helper API `2.7.1`, data schema `4`, all encounter models, generation behavior, persistence, placement, and Combat creation.
- Added compatibility, permission, duplicate-action, CSS, Scene Controls, Combat Tracker, Chat, settings, and lifecycle regression tests.

## 1.4.0 - 2026-07-25

- Preserved the accepted Encounter Crucible v1.4.0 feature baseline in a reproducible source repository.
- Exposed Helper API 2.7.1.
- Added Actor normalization, party discovery, recursive Actor-folder traversal, and deterministic encounter generation.
- Added `resolveCompositionMode()` with neutral, quantity, strength, hybrid, and fixed-size modes.
- Added D&D 2024 XP budgets, D&D 2014 adjusted XP, CR analysis, action economy, resource pressure, tactical context, volatility, confidence, and overall assessment.
- Added Journal persistence, theme folders, configurable encounter names, Scene placement, and Combat creation.
- Added ApplicationV2 Dashboard and Workshop interfaces, Combat Tracker integration, Scene Controls access, settings, and English/German localisation.
- Added reproducible build, test, validation, packaging, checksums, and source archive tooling.

## Prior accepted state

The directly retrievable historical binary archive was not available during source reconstruction. Project records identify v1.4.0 and Helper API 2.7.1 as the newest accepted core baseline. This repository therefore preserves the recorded complete behavior as an editable reconstruction rather than claiming byte-identical recovery of a lost ZIP.
