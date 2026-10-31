# Validation — Encounter Crucible 1.8.2

The release gate covers:

- clean locked dependency installation;
- formatting and JavaScript compatibility lint;
- complete Node test suite;
- manifest, localization, import, and path validation;
- early API exposure before the core `init` callback;
- idempotent module and game-alias attachment;
- Helper API 2.7.1 alias parity;
- module version 1.8.2 compatibility checks;
- readiness Promise single-resolution behavior;
- numeric semantic-version comparison and range support;
- unchanged public API, schema, settings, flags, permissions, and integration isolation;
- runtime-only installable archive contents;
- complete source archive contents;
- documentation/report/test-results bundle contents;
- one correct root directory per ZIP;
- ZIP integrity and deterministic timestamps;
- repeated byte-identical packaging;
- fresh extracted-source rebuild of all three ZIPs.

The documentation bundle contains the audit, API contract, compatibility notes, test plan, validation summary, build report, release manifest, incremental changelog, and install/source checksums.

No licensed Foundry VTT client was launched in this environment. Browser-runtime testing is not claimed.
