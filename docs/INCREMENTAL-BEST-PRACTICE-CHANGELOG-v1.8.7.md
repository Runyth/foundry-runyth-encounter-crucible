# Incremental best-practice changelog — Runyth Encounter Crucible 1.8.7

- Added first-class Actor collection instead of requiring campaign helpers to reach into Foundry collections or duplicate recursive folder logic.
- Added side-effect-safe authoritative encounter assessment for helper previews.
- Kept raw Actor collection and core normalization distinct so campaign helpers can inspect system metadata without reimplementing the core participant normalizer.
- Added flexible Actor sources: world collection, recursive folder, or explicit Actor list.
- Added optional Actor-type filtering and normalized participant output.
- Preserved GM authorization for world Actor discovery.
- Added immutable, versioned capability metadata for both new public contracts.
- Reused the established capability catalog and semantic-version negotiation instead of special-casing a campaign helper.
- Kept `encounterGeneration`, helper-module registration, API aliases, data schema, and all existing module workflows intact.
- Added dedicated regression tests for capability discovery, permissions, folder recursion, normalization, assessment authority, and default side-effect suppression.
