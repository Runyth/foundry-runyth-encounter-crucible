# Incremental best-practice changelog — Encounter Crucible 1.8.2

## Dependency lifecycle

- Moved API construction from init-only exposure to safe ES-module-time exposure.
- Retained idempotent init and ready attachment for recovery and normal Foundry lifecycle semantics.
- Added a single-resolution readiness gate instead of requiring dependants to guess callback order.

## Compatibility metadata

- Retained canonical Helper API 2.7.1.
- Added common read-only aliases without removing or renaming the canonical property.
- Kept module version and API version separate and explicit.
- Added detached/frozen compatibility descriptors.
- Added numeric semantic-version checks to prevent lexical ordering defects.

## Isolation and resilience retained

- ApplicationV2 only.
- Native DOM only.
- Module-owned actions and listeners.
- Scoped CSS.
- Idempotent Scene Controls and Combat Tracker integration.
- No sheet, Token HUD, canvas-overlay, Chat-render, keybinding, or socket surface.
- GM-authoritative Document-changing workflows.
- Transactional Journal, Token, and Combat operations.

## Release engineering

- Added a deterministic third documentation/report archive.
- Kept the installable archive runtime-only.
- Kept the source archive complete and free of nested release ZIPs.
- Added dependency-order and release-bundle tests.
- Retained fixed ZIP timestamps, sorted entries, normalized modes, integrity checks, repeated builds, and fresh-source reproduction.
