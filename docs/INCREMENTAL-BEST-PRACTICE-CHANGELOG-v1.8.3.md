# Incremental best-practice changelog — Runyth Encounter Crucible 1.8.3

- Isolated CPU-bound search in a dedicated browser Worker.
- Added cooperative yielding and AbortSignal cancellation fallback.
- Replaced full-state sorting with bounded top-k retention.
- Deferred expensive deep cloning until final roster materialization.
- Added explicit progress without render-loop churn.
- Cached immutable normalization results and invalidated them through narrow Foundry document hooks.
- Indexed hierarchical folders once instead of repeatedly scanning the collection.
- Batched UI invalidation to the browser's frame boundary.
- Parallelized independent asynchronous work while retaining deterministic output order.
- Reduced cache-key serialization volume.
- Added close-safe cancellation to prevent stale rerenders.
- Preserved API and persistent-schema compatibility.
