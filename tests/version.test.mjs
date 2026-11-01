// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Runyth. See the LICENSE file for rights and obligations.
import assert from "node:assert/strict";
import test from "node:test";

import { assertVersion, compareVersions, satisfiesVersion } from "../module/runyth-encounter-crucible/scripts/core/version.js";

test("semantic versions compare numerically instead of lexically", () => {
  assert.equal(compareVersions("1.8.2", "1.8.1"), 1);
  assert.equal(compareVersions("2.7.3", "2.7.3"), 0);
  assert.equal(compareVersions("2.10.0", "2.9.9"), 1);
});

test("dependency ranges support exact, minimum, bounded, caret, tilde, and wildcard requirements", () => {
  assert.equal(satisfiesVersion("2.7.3", ">=2.7.1 <3.0.0"), true);
  assert.equal(satisfiesVersion("2.7.1", "2.7.1"), true);
  assert.equal(satisfiesVersion("2.7.1", ">=2.7.1"), true);
  assert.equal(satisfiesVersion("2.7.1", ">=2.7.0 <3.0.0"), true);
  assert.equal(satisfiesVersion("2.7.1", "^2.7.0"), true);
  assert.equal(satisfiesVersion("2.7.1", "~2.7.0"), true);
  assert.equal(satisfiesVersion("2.7.1", "2.7.x"), true);
  assert.equal(satisfiesVersion("2.7.1", { minimum: "2.7.1", maximum: "2.9.9" }), true);
  assert.equal(satisfiesVersion("2.7.1", ">2.7.1"), false);
  assert.throws(() => assertVersion("2.7.1", ">=2.8.0", "Helper API"), /does not satisfy/);
});
