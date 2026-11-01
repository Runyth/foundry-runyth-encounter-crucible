# Compatibility audit — Runyth Encounter Crucible 1.8.7

## Reported defect

Runyth Encounter Crucible 1.8.6 exposed Helper API 2.7.4 but a campaign helper correctly rejected integration because two required public capabilities were absent: `collectActors` and `assessEncounter`.

This was a real core API gap, not a dependant-side version-detection error.

## Corrections

- Added first-class `collectActors` and `assessEncounter` public capabilities.
- Added both capabilities to the immutable capability catalog, feature map, capability map, descriptor map, version map, Helper API descriptor, and direct public API.
- Preserved all existing API entry points and aliases.
- Kept Actor collection GM-authorized because it exposes world Actor Documents.
- Kept assessment of caller-supplied encounter definitions free of unnecessary world mutations.
- Reused the existing recursive Actor-folder service, Actor normalizer, and authoritative assessment orchestrator rather than introducing duplicate implementations.
- Added versioned callable capability descriptors and semantic-version negotiation.
- Advanced Helper API from `2.7.4` to `2.7.5` for the additive public contract.

## Compatibility preserved

No persistent data migration is required. Schema `4`, settings, flags, saved encounters, generation behavior, Worker execution, helper registry, public API aliases, permissions, Foundry hooks, CSS, and UI integrations remain compatible with 1.8.6.
