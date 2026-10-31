# Incremental best-practice changelog — Encounter Crucible 1.8.4

- Added explicit feature-capability discovery instead of inferring support from version strings alone.
- Added a cohesive frozen generation namespace while preserving stable top-level entry points.
- Added semantic version advancement for a real additive public-API change.
- Added immutable compatibility metadata suitable for dependent-module checks during early module evaluation, `init`, and `ready`.
- Reused existing permission-checked wrappers inside the namespace rather than creating bypass paths.
- Preserved Worker-first generation and documented the async-preferred entry point.
- Expanded tests to cover capability identity, immutability, discovery aliases, permission-safe method reuse, and both synchronous and asynchronous generation.
- Updated deterministic three-ZIP packaging metadata and documentation requirements.
