# Compatibility audit — Runyth Encounter Crucible 1.8.6

## Finding

The v1.8.5 baseline already exposed `encounterGeneration`, but capability metadata was distributed across an array, a boolean map, a feature map, and direct properties. A dependant using property-style capability probing against the array could still report a false negative.

## Correction

- Added one immutable capability catalog as the source of truth.
- Preserved the capability-name array contract.
- Added non-enumerable named properties to that array.
- Added immutable version and descriptor maps.
- Added version-aware presence and assertion methods.
- Preserved the exact callable generation implementation and all permission checks.

No Foundry hooks, Documents, CSS, settings, sockets, migrations, or UI integrations changed.
