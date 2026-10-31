# Performance audit — Encounter Crucible 1.8.7

The new public capabilities reuse existing optimized core services instead of adding parallel scans or calculation engines.

- `collectActors` delegates folder traversal to the existing indexed/cycle-safe Actor-folder service.
- Optional normalization reuses the existing cached D&D 5e Actor normalizer.
- Explicit Actor arrays avoid unnecessary world-collection traversal.
- `assessEncounter` delegates directly to the existing asynchronous assessment orchestrator.
- Assessment defaults disable persistence and hook emission for helper previews, avoiding unnecessary settings writes and downstream rerenders.
- No new global render hooks, timers, observers, sockets, canvas listeners, or polling loops were introduced.
- Encounter-generation Worker behavior and the existing animation-frame refresh coalescing remain unchanged.

Automated regression coverage confirms that the new capability layer adds no duplicate normalization or assessment path.
