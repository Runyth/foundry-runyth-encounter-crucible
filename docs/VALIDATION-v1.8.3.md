# Validation — Encounter Crucible 1.8.3

The release gate validates:

- clean locked dependency installation;
- JavaScript syntax and compatibility lint;
- Worker and cooperative fallback paths;
- progress and cancellation behavior;
- encounter generation constraints and serialization;
- concurrent extension models with deterministic insertion order;
- concurrent Token preparation with deterministic placement order;
- Actor-folder indexing and cache invalidation;
- frame-coalesced runtime refresh;
- Combat Tracker preview-cache invalidation;
- ApplicationV2 action and listener ownership;
- permissions and integration isolation;
- English/German localization parity;
- manifest, imports, templates, styles, and runtime paths;
- deterministic installable, source, and documentation ZIP creation;
- fresh extracted-source rebuild equivalence.

A licensed Foundry browser runtime was unavailable. The manual Foundry qualification remains in `TEST-PLAN.md` and includes Worker responsiveness, cancellation, GM/player clients, D&D 5e sheets, Tidy sheets, Scene Controls, Chat, world reload, module disable/re-enable, and representative multi-module use.
