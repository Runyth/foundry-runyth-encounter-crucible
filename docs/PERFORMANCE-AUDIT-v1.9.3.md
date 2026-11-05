# Performance audit — Runyth Encounter Crucible 1.9.3

The banner fix removes DOM growth instead of adding load.

- The purge runs a bounded selector query once per tracker render; no polling, timers, observers, sockets, canvas listeners, or additional render hooks were added.
- Duplicate banners are no longer accumulated, so the tracker carries one banner node instead of an unbounded set across long sessions.
- Startup topology is unchanged: one self-contained main runtime and one self-contained generation Worker resource.
