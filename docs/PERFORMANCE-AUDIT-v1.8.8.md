# Performance audit — Encounter Crucible 1.8.8

The startup fix also reduces browser-side module-loading overhead.

- The installable main runtime is one HTTP resource rather than a dependency graph of more than twenty ES modules.
- The generation Worker is one HTTP resource rather than a Worker entry plus imported calculation modules.
- No runtime transpilation or client-side bundling occurs.
- No new polling, timers, observers, sockets, canvas listeners, or render hooks were added.
- Existing Worker-based encounter generation, cooperative fallback, caching, concurrent normalization, and animation-frame refresh coalescing remain unchanged.

The primary objective is reliability rather than raw benchmark improvement: fewer startup requests remove an entire class of partial module-load failures.
