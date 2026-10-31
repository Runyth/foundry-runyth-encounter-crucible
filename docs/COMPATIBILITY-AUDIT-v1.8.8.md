# Compatibility audit — Encounter Crucible 1.8.8

## Reported defect

Encounter Crucible 1.8.7 could be detected by Foundry while its public API remained unavailable because browser requests for required internal ES modules failed with `net::ERR_FAILED`, including `scripts/core/encounter.js`, `scripts/services/generation-service.js`, and `scripts/services/actor-normalizer.js`. Forge and a campaign helper then correctly saw the core module version but no Helper API.

The files were present in the delivered archive. The defect was therefore startup topology: `scripts/main.js` imported the complete internal source graph directly in the browser. Failure of any required child request aborted module evaluation before `exposePublicApi()` could execute.

## Corrections

- Kept the editable source graph modular in the source repository.
- Added a deterministic dependency-free build bundler for the installable runtime.
- Replaced the installable browser module graph with one self-contained `scripts/main.js` bundle.
- Replaced the Worker import graph with one self-contained `scripts/workers/encounter-generator-worker.js` bundle.
- Added built-runtime validation that rejects additional JavaScript payloads or residual static imports in the installable.
- Made generation Worker routing use Foundry v13 `foundry.utils.getRoute` to support hosted path prefixes.
- Added a mocked clean-start runtime test proving API `2.7.5` is exposed before `init` and that Forge and a campaign helper helper registrations succeed.

## Compatibility preserved

Helper API remains `2.7.5`; capability versions remain unchanged; persistent schema remains `4`. No setting, flag, Journal data, generated encounter, public method signature, permission rule, UI workflow, or calculation model changed.

## Unrelated errors

No broad compatibility workaround was added for errors owned by other enabled packages. The patch is limited to Encounter Crucible's runtime delivery and startup path.
