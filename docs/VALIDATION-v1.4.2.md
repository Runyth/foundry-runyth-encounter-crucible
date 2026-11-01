# Runyth Encounter Crucible v1.4.2 validation

## Reproducible commands

```text
npm ci
npm run check
npm run build
npm run package
```

The release was additionally packaged twice and rebuilt from a fresh extraction of the source ZIP. Final counts and SHA-256 values are recorded in the generated files under `dist/`.

## Automated coverage

The test and validation suite covers:

- all accepted calculation and generation behaviors;
- zero-party confidence and empty-roster edge cases;
- detached JSON-serializable assessment snapshots across repeated analysis;
- extension-model ID ownership and isolated async `supports()` failures;
- D&D 5e spell-slot key weighting and strict Actor/Token UUID resolution;
- persistent Workshop state, scalable filtering, narrow-window CSS safeguards, and unique application IDs;
- cycle-safe recursive Actor-folder traversal;
- one passive Combat Tracker analysis per unchanged state;
- one hook, control, listener, state transition, and Chat card per logical action;
- GM permissions and passive-preview non-persistence;
- transactional Journal, Token placement, and Combat creation rollback;
- final Journal UUID persistence;
- native DOM, ApplicationV2, Scene Controls v13 record shape, namespaced Documents, and CSS isolation;
- absence of broad sheet, Token HUD, canvas, Chat-render, socket, raw keyboard, or deprecated V12 integration;
- English/German localization parity;
- manifest paths, runtime imports, version alignment, source completeness, and deterministic archive structure.

## Repository gate result

| Gate | Result |
|---|---|
| Formatting | Passed |
| JavaScript syntax and compatibility lint | Passed; 41 JavaScript files |
| Automated tests | Passed; 60/60 |
| Manifest references | Passed; 4/4 |
| English/German localization parity | Passed; 135 aligned keys |
| Runtime ES modules | Passed; 21 modules |
| Installable runtime files | 27 |
| Source repository files | 64 |

## Compatibility declaration

- Foundry minimum: `13`
- Foundry verified: `13.351`
- D&D 5e minimum: `4.2.0`
- D&D 5e verified: `5.2.2`
- D&D 5e declared maximum: `5.3.x`
- Helper API: `2.7.1`
- Persistent schema: `4`

The widened D&D 5e maximum reflects static adapter compatibility. Browser-runtime verification remains at 5.2.2.

## Runtime limitation

A licensed Foundry browser runtime was not available. Complete the reproducible matrix in `docs/TEST-PLAN.md` in a cloned world before replacing a production installation.
