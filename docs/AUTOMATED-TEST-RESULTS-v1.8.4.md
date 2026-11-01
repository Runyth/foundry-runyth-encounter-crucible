# Automated test results — Runyth Encounter Crucible 1.8.4

## Repository gate

```text
npm run format:check
npm run lint
npm test
npm run validate
```

Expected release result:

- 77 tests passed;
- 0 tests failed;
- formatting passed;
- compatibility lint passed;
- manifest and runtime imports resolved;
- English and German localization keys aligned;
- module, package, runtime, API, and schema identities aligned.

## New regression coverage

- `encounterGeneration` is directly exposed as a callable frozen namespace.
- capability discovery aliases agree.
- capability namespace and lists are frozen.
- Helper API and compatibility descriptors advertise the capability.
- established top-level generation methods remain identical.
- `generate` and `generateAsync` use the browser-safe generator.
- `generateSync` uses the established synchronous generator.
- synchronous and cooperative asynchronous generation produce equivalent deterministic rosters.
- Helper API `2.7.2` satisfies dependants requiring `>=2.7.1 <3.0.0`.
