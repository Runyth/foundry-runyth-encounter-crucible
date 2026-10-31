# Automated test results — Encounter Crucible 1.8.8

New 1.8.8 regression coverage verifies:

- deterministic bundling of the modular core runtime;
- no static child ES-module imports in the generated main runtime;
- immediate Helper API `2.7.5` exposure from the generated runtime before `init`;
- retained `encounterGeneration`, `collectActors`, `assessEncounter`, and helper-registry capabilities;
- successful registration of Forge and a campaign helper helpers against the generated runtime;
- Foundry route-prefix-aware generation Worker URLs.

The complete existing calculation, generation, permission, persistence, UI isolation, performance, capability, and release-tooling suites remain enabled.
