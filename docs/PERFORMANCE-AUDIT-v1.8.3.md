# Performance audit — Encounter Crucible 1.8.3

## Reported defect

Pressing **Generate Encounter** executed the complete beam search synchronously on Foundry's browser main thread. JavaScript promises do not make CPU-bound work asynchronous; the event handler entered the search before the browser could repaint, move windows, process controls, or service other modules.

## Root causes and corrections

| Area | Root cause | Correction |
|---|---|---|
| Encounter generation | Wide beam search ran on the main thread | Added a same-origin ES-module Worker and an AbortSignal-based asynchronous service |
| Worker fallback | A missing Worker would otherwise restore the freeze | Added chunked cooperative generation using `scheduler.yield()`, `requestAnimationFrame()`, or a timer fallback |
| Search allocations | Every expansion deep-cloned complete candidate records and rescanned roster entries | Search states now keep compact quantity maps and aggregate count, XP, diversity, and maximum-XP metrics; complete Actor data is cloned only for the selected roster |
| Beam selection | Every depth sorted every generated state before retaining 80 | Added a bounded worst-first heap which retains only the best 80 states during expansion |
| Workshop feedback | Pending work had no progress or cancellation path | Added a live progress meter, status text, and a Cancel action; only the generation action is unavailable while work runs |
| Actor folders | Descendant discovery repeatedly scanned every folder for every parent | Added a cached parent-to-children index and cached path labels |
| Candidate preparation | NPC Actors were fully normalized on every Workshop render | Added normalized-candidate and candidate-list caches invalidated by Actor and Actor-folder hooks |
| Runtime refresh | related Foundry updates could schedule repeated renders in one frame | Coalesced updates to one `requestAnimationFrame` callback |
| Combat fingerprint | Cache keys serialized large HP, spell, and resource objects | Replaced them with compact deterministic primitive fingerprints |
| Extension models | Independent asynchronous models ran serially | Models now execute concurrently and merge back in registration order |
| Token placement | Actor UUIDs and prototype Tokens resolved one by one | Independent Token preparation now runs concurrently while `Promise.all` preserves order |
| Actor normalization | Spell and limited-resource data were processed through repeated filter/map passes | Consolidated each data family into a single pass |

## Responsiveness behavior

- Generation runs outside the Foundry main thread when Web Workers are available.
- The Workshop can still be moved, resized, scrolled, filtered, or closed while generation runs.
- Other Foundry applications, canvas interaction, Chat, and module windows continue receiving browser events.
- Closing the Workshop or pressing Cancel terminates the Worker and discards the pending result.
- Progress updates change only the module-owned status nodes and do not trigger a full ApplicationV2 render for every search depth.
- Worker construction failure falls back transparently to cooperative chunking.

## Benchmark

A deterministic synthetic workload used five level-10 characters, 300 candidate NPC records, duplicates enabled, and a maximum roster depth of 30.

| Implementation | Release-host elapsed time |
|---|---:|
| 1.8.2 synchronous search | approximately 1,666 ms |
| 1.8.3 optimized search | approximately 899 ms |

The measured core search was approximately 46% faster on the release host. Browser responsiveness is improved independently of that speedup because the normal 1.8.3 path runs in a Worker.

Timing varies by browser, CPU, candidate distribution, and constraints; the benchmark is a regression reference rather than a performance guarantee.

## Intentionally unchanged

- Beam width remains 80.
- All composition modes, minimum and maximum counts, duplicate rules, boss rules, minion rules, target budgets, assessment models, and selected-roster output schema remain available.
- Helper API remains `2.7.1` and data schema remains `4`.
- The synchronous `generateEncounter()` pure helper remains for integrations which already execute outside the browser main thread.
