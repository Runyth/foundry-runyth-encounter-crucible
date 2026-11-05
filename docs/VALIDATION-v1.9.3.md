# Validation — Runyth Encounter Crucible 1.9.3

Release validation covers:

- clean dependency installation;
- formatting and Foundry v13 compatibility lint;
- complete automated regression suite (94 tests);
- manifest and source import validation;
- English/German localization parity;
- deterministic generation of the installable main bundle and Worker bundle;
- built-runtime validation requiring no child static ES-module imports;
- API `2.7.5` exposure before `init` from the generated installable bundle;
- combat tracker banner single-instance regression across re-renders and historical attribute spellings;
- installable, source, and documentation archive validation;
- repeated deterministic packaging;
- fresh extracted-source rebuild.

A licensed Foundry browser runtime was unavailable; live in-world qualification remains documented in `TEST-PLAN.md`.
