# Performance audit — Runyth Encounter Crucible 1.8.6

This patch changes only API capability discovery. Capability catalogs are constructed once during API creation, frozen, and thereafter use constant-time object lookups. Encounter generation, Worker execution, caches, rendering, persistence, and Foundry Document operations are unchanged.
