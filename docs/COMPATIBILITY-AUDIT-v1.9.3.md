# Compatibility audit — Runyth Encounter Crucible 1.9.3

## Reported defect

After the Runyth rebrand a user observed the tracker banner (the challenge rating header) accumulating in the Combat Tracker: several copies after a few renders, and at times the whole tracker column flooded.

Root cause: the banner-mounted dedupe guard queried `[data-runyth-encounter-crucible-integration="combat-tracker"]` while the banner element writes `data-encounter-crucible-integration` (a leftover of the rebrand attribute renamation). The guard therefore never recognised banners it mounted itself; every tracker re-render mounted another banner, and banners mounted above the re-rendered list subtree survived.

## Corrections

- The guard selector now matches the attribute spelling the banner writes.
- Every render purges panels the module ever mounted (by class and by every attribute spelling of the data attribute from older builds) inside the enclosing tracker column, so sessions that already accumulated banners collapse to a single banner at the next render.
- Added a regression test reproducing the drift and the re-render storm.
- Kept helper registration idempotence, preview reuse, and setting behavior unchanged.

## Compatibility preserved

Helper API remains `2.7.5`; capability versions remain unchanged; persistent schema remains `4`. No setting, flag, Journal data, generated encounter, public method signature, permission rule, UI workflow, or calculation model changed.
