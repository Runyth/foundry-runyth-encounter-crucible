# Patch release report — Runyth Encounter Crucible 1.8.3

## Objective

Keep Foundry responsive while generating large encounters and apply browser and Foundry performance best practices across the complete module.

## Result

Encounter generation now runs in a dedicated ES-module Worker, reports progress, and can be cancelled. A cooperative yielding fallback remains available. The search itself uses fewer allocations and less sorting, and repeated Foundry-side work is cached, batched, or performed concurrently where operations are independent.

## Identity

- Module: `1.8.3`
- Helper API: `2.7.1`
- Schema: `4`
- Foundry verified: `13.351`

## Compatibility

No migration is required. Existing settings, flags, encounters, public API methods, extension points, and dependent modules remain compatible.
