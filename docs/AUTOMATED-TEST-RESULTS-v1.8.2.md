# Automated test results — Encounter Crucible 1.8.2

## Test groups

- encounter calculations and aggregation;
- serializable assessment persistence;
- encounter generation and composition modes;
- D&D Actor, Token, spell-slot, and UUID normalization;
- Journal, Token placement, and Combat transaction rollback;
- ApplicationV2 listener and geometry lifecycle;
- Combat Tracker and Scene Controls idempotence;
- Chat cardinality and GM permission boundaries;
- CSS, hook, DOM, canvas, socket, and sheet isolation;
- public API metadata, early exposure, readiness, and semantic-version checks;
- manifest, localization, repository, runtime import, and packaging contracts.

The exact pass count is generated into the release bundle's build report after the final clean release gate. Every test must pass before `npm run package` is accepted.
