# Automated test results — Runyth Encounter Crucible 1.9.3

New 1.9.3 regression coverage verifies:

- the combat tracker banner guard selector matches the attribute the banner element actually writes;
- a re-render storm over a persistent tracker column with banners drafted in different attribute spellings keeps exactly one mounted banner;
- strays carrying the legacy attribute spelling or the plain class are purged at each render;
- registration of the combat tracker hook stays idempotent;
- preview fingerprint reuse and invalidation remain unchanged.

The complete existing calculation, generation, permission, persistence, UI isolation, performance, capability, and release-tooling suites remain enabled (94 passing tests).
