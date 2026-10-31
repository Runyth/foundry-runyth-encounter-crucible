# Patch release report — Encounter Crucible 1.8.2

## Objective

Eliminate false compatibility errors from dependants requiring Encounter Crucible 1.8.1+ and Helper API 2.7.1+.

## Result

Encounter Crucible 1.8.2 exposes Helper API 2.7.1 before dependent init callbacks, maintains the same object through ready, publishes stable compatibility aliases, and supplies public version assertions and a readiness Promise.

## Compatibility

- Module: 1.8.2
- Helper API: 2.7.1
- Schema: 4
- Foundry: 13, verified manifest target 13.351
- D&D 5e: 4.2.0 through declared 5.3.x range
- Manual data migration: none
- Dependant method-signature changes: none

## Release contents

- one runtime-only installable ZIP;
- one complete reproducible source ZIP;
- one documentation, audit, changelog, validation, and test-results ZIP.

## Qualification boundary

The automated and static release gate is complete. No licensed Foundry browser client was available, so final live testing in the target world remains documented rather than claimed.
