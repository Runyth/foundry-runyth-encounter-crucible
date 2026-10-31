# Incremental best-practice changelog — Encounter Crucible 1.8.5

- Added a narrowly owned companion-module registry rather than asking dependants to mutate core API objects.
- Kept the public API frozen while allowing controlled internal registry state.
- Normalized several practical registration signatures to reduce brittle dependency coupling.
- Made identical lifecycle re-registration idempotent.
- Rejected conflicting duplicate IDs instead of silently replacing integrations.
- Added explicit replacement semantics for intentional upgrades.
- Added immutable registration descriptors and normalized capability metadata.
- Added dedicated register and unregister hooks rather than broad application hooks.
- Kept the registry independent of Foundry Documents, permissions, sockets, canvas, and DOM.
- Distinguished the module-owned Forge compatibility defect from unrelated errors attributed by Foundry to other packages.
