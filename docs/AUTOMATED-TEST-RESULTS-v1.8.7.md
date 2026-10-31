# Automated test results — Encounter Crucible 1.8.7

The release gate passed 92 automated tests with zero failures.

New 1.8.7 coverage verifies:

- `collectActors` and `assessEncounter` discovery through all public capability surfaces;
- raw world Actor collection;
- recursive folder Actor collection;
- explicit Actor-array collection;
- optional core Actor normalization;
- Actor-type filtering;
- GM permission enforcement for world Actor collection;
- authoritative encounter assessment through the core engine;
- no implicit encounter persistence during helper assessment;
- no implicit assessment-hook emission during helper assessment;
- retained `encounterGeneration` and helper-registry compatibility.

Full release validation also passed:

- formatting;
- Foundry v13 compatibility lint across 53 JavaScript files;
- manifest and production-import validation;
- 138-key English/German localization parity;
- 27 runtime-module validation;
- deterministic archive validation.
