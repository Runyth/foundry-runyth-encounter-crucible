# Validation — Encounter Crucible 1.8.4

## Required automated validation

- clean locked dependency installation;
- formatting and compatibility lint;
- complete automated test suite;
- manifest, path, localization, and ES-module import validation;
- deterministic build;
- installable/source/documentation archive structure validation;
- repeated byte-identical packaging;
- fresh extracted-source rebuild.

## Release-specific validation

- `api.encounterGeneration` exists before dependent `init` callbacks;
- the namespace is frozen and stable through Foundry lifecycle exposure;
- all capability discovery forms report `encounterGeneration`;
- Helper API reports `2.7.2` and accepts the Forge minimum range;
- synchronous and asynchronous namespace methods remain functional;
- existing top-level methods retain identity and signatures;
- privileged namespace operations retain GM enforcement;
- data schema remains `4` with no migration requirement.

## Runtime limitation

A licensed Foundry VTT browser runtime is not available in the build environment. Live Forge integration qualification is specified in `docs/TEST-PLAN.md` and is not falsely reported as automated.
