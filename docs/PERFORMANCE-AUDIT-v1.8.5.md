# Performance audit — Encounter Crucible 1.8.5

The helper registry adds constant-time `Map` registration, lookup, presence, and removal. Listing is linear only in the number of registered companion modules, which is expected to remain small.

The registry adds no render hook, polling loop, socket listener, DOM listener, Worker, canvas object, document scan, or repeated world-data traversal. It is created once with the public API and reused for the lifetime of the browser session.

Identical repeated registration is detected before mutation and returns the existing descriptor. Capability lists are normalized once during registration and stored as frozen arrays. No performance regression was identified in the existing generation, analysis, cache, refresh, persistence, or placement paths.
