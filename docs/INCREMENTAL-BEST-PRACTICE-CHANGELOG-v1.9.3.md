# Incremental best-practice changelog — Runyth Encounter Crucible 1.9.3

- Reconciled the banner data attribute with the dedupe guard so one attribute spelling is canonical across the integration.
- Added a purge step that removes every historic banner the module ever mounted before inserting a fresh one.
- Selected matchers work through the stable banner class, so older attribute spellings cannot survive.
- Added a regression suite for the re-render storm and the attribute drift instead of manual verification alone.
- Preserved public API, capability, persistence, permission, and UI behavior exactly across the patch.
