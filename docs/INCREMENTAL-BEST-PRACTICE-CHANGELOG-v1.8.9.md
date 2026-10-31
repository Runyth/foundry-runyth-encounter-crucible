# Incremental best-practice changelog — Encounter Crucible 1.8.9

- Removed the legacy all-rights-reserved `LICENSE.md` placeholder; the repository carries AGPL-3.0-or-later only.
- Added the AGPL notice to `tools/package.py`.
- Declared the AGPL licence in `package-lock.json` root package metadata.
- Separated editable source topology from installable runtime topology.
- Retained maintainable modular ES-module source for development and testing.
- Reduced production startup to one self-contained main runtime request instead of a browser fan-out across the internal dependency graph.
- Reduced generation Worker startup to one self-contained Worker request.
- Added a small dependency-free deterministic repository bundler instead of introducing an external production or build dependency.
- Added a build-specific validation gate so source validation and generated-runtime validation are both explicit.
- Used Foundry's namespaced route utility for Worker URLs and path-prefix compatibility.
- Added generated-runtime startup testing instead of relying only on source-module unit tests.
- Preserved public API, capability, persistence, permission, and UI behavior exactly across the patch.
